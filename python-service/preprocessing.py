import os
import io
import re
import json
import zipfile
import xml.etree.ElementTree as ET
import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, List, Optional

def col_letter_to_index(col_str: str) -> int:
    """Convert Excel column letters like 'A', 'B', 'AA' to 0-based index."""
    idx = 0
    for char in col_str.upper():
        if 'A' <= char <= 'Z':
            idx = idx * 26 + (ord(char) - ord('A') + 1)
    return max(0, idx - 1)

def parse_xlsx_stream(file_stream: io.BytesIO) -> pd.DataFrame:
    """
    Pure-Python parser for Excel (.xlsx) files using zipfile and ElementTree.
    Requires no external C-extensions or openpyxl/xlrd dependencies.
    """
    with zipfile.ZipFile(file_stream) as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in tree.findall('.//ns:si', ns):
                text_parts = [t.text for t in si.findall('.//ns:t', ns) if t.text]
                shared_strings.append("".join(text_parts))

        sheet_path = 'xl/worksheets/sheet1.xml'
        if sheet_path not in z.namelist():
            sheet_candidates = [n for n in z.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')]
            if not sheet_candidates:
                raise ValueError("No worksheet found inside Excel (.xlsx) file.")
            sheet_path = sheet_candidates[0]

        tree = ET.fromstring(z.read(sheet_path))
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

        parsed_rows = []
        max_col_idx = 0

        for row in tree.findall('.//ns:row', ns):
            row_dict = {}
            for c in row.findall('./ns:c', ns):
                cell_ref = c.get('r', '')
                col_letters = "".join(filter(str.isalpha, cell_ref))
                col_idx = col_letter_to_index(col_letters) if col_letters else len(row_dict)
                max_col_idx = max(max_col_idx, col_idx)

                cell_type = c.get('t')
                val_elem = c.find('./ns:v', ns)
                raw_val = val_elem.text if val_elem is not None and val_elem.text else ''

                if cell_type == 's' and raw_val.isdigit():
                    s_idx = int(raw_val)
                    cell_val = shared_strings[s_idx] if s_idx < len(shared_strings) else raw_val
                elif cell_type == 'inlineStr':
                    t_elem = c.find('.//ns:t', ns)
                    cell_val = t_elem.text if t_elem is not None and t_elem.text else ''
                else:
                    cell_val = raw_val

                row_dict[col_idx] = cell_val

            if row_dict:
                parsed_rows.append(row_dict)

        if not parsed_rows:
            return pd.DataFrame()

        num_cols = max_col_idx + 1
        matrix = []
        for r_dict in parsed_rows:
            row_list = [r_dict.get(i, '') for i in range(num_cols)]
            matrix.append(row_list)

        headers = [str(h).strip() if str(h).strip() else f"Col_{i+1}" for i, h in enumerate(matrix[0])]
        data = matrix[1:]
        return pd.DataFrame(data, columns=headers)


class DataPreprocessor:
    """
    Handles Online Retail dataset loading, flexible column detection,
    manual mapping, and cleaning for Data Warehouse ETL.
    Allows CSV / XLSX files with ANY column names and filenames.
    """

    CANONICAL_FIELDS = {
        "InvoiceNo": {
            "required": False,
            "description": "Invoice or Order number",
            "aliases": [
                "invoiceno", "invoice", "invoice_no", "invoicenum", "order_id", "orderid",
                "orderno", "order_no", "order_number", "transaction_id", "transactionid",
                "trans_id", "bill_no", "billno", "receipt_no", "receipt", "sale_id",
                "saleid", "purchase_id", "invoice_id", "id"
            ]
        },
        "StockCode": {
            "required": False,
            "description": "Product SKU or Item Code",
            "aliases": [
                "stockcode", "stock_code", "product_id", "productid", "item_code", "itemcode",
                "sku", "item_id", "itemid", "product_code", "product_sku", "code", "item_no",
                "article_id", "prod_id", "part_number", "model", "product_key"
            ]
        },
        "Description": {
            "required": False,
            "description": "Product title or description",
            "aliases": [
                "description", "desc", "product_name", "productname", "product_title",
                "producttitle", "item_description", "item_name", "itemname", "item_title",
                "title", "product", "item", "name", "goods", "commodity", "details"
            ]
        },
        "Quantity": {
            "required": False,
            "description": "Number of units purchased",
            "aliases": [
                "quantity", "qty", "units", "quantity_sold", "count", "amount_units",
                "items", "sales_volume", "volume", "num_items", "pieces", "ordered", "qty_ordered"
            ]
        },
        "UnitPrice": {
            "required": False,
            "description": "Price per unit",
            "aliases": [
                "unitprice", "unit_price", "price", "unit_cost", "rate", "cost", "unitcost",
                "item_price", "price_per_unit", "selling_price", "amount", "sales", "revenue",
                "retail_price", "value"
            ]
        },
        "InvoiceDate": {
            "required": False,
            "description": "Transaction date and time",
            "aliases": [
                "invoicedate", "invoice_date", "order_date", "orderdate", "transaction_date",
                "date", "purchase_date", "created_at", "timestamp", "time", "date_time",
                "datetime", "sale_date", "trans_date"
            ]
        },
        "CustomerID": {
            "required": False,
            "description": "Customer identifier",
            "aliases": [
                "customerid", "customer_id", "client_id", "clientid", "user_id", "userid",
                "customer_code", "customer", "customer_name", "client_name", "account_id",
                "shopper_id", "cust_id", "buyer", "customer_number"
            ]
        },
        "Country": {
            "required": False,
            "description": "Customer country or region",
            "aliases": [
                "country", "region", "location", "nation", "state", "shipping_country",
                "customer_country", "market", "territory", "city", "address", "country_code"
            ]
        }
    }

    def __init__(self):
        self.raw_df: Optional[pd.DataFrame] = None
        self.cleaned_df: Optional[pd.DataFrame] = None
        self.last_summary: Dict[str, Any] = {}
        self.detected_mapping: Dict[str, str] = {}
        self.data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
        self.active_csv_path = os.path.join(self.data_dir, "active_cleaned_dataset.csv")
        self.active_summary_path = os.path.join(self.data_dir, "active_summary.json")

    def load_from_bytes(self, content: bytes, filename: str = "") -> pd.DataFrame:
        """
        Loads dataset from raw bytes, detecting CSV vs Excel (.xlsx) and encodings.
        Handles files with any filename.
        """
        filename_lower = filename.lower() if filename else ""
        is_zip = content.startswith(b'PK\x03\x04')

        if filename_lower.endswith('.xlsx') or is_zip:
            try:
                df = parse_xlsx_stream(io.BytesIO(content))
                self.raw_df = df
                return df
            except Exception as e:
                if not filename_lower.endswith('.xlsx'):
                    pass
                else:
                    raise ValueError(f"Failed to parse Excel (.xlsx) file: {str(e)}")

        encodings = ['utf-8-sig', 'utf-8', 'ISO-8859-1', 'latin1', 'cp1252']
        delimiters = [',', ';', '\t', '|']

        for enc in encodings:
            for sep in delimiters:
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=enc, sep=sep)
                    if df.shape[1] > 1:
                        self.raw_df = df
                        return df
                except Exception:
                    continue

        try:
            df = pd.read_csv(io.BytesIO(content), encoding='latin1', engine='python')
            self.raw_df = df
            return df
        except Exception as e:
            raise ValueError(f"Unable to parse file. Supported formats: CSV, Excel (.xlsx). Error: {str(e)}")

    def load_from_path(self, file_path: str) -> pd.DataFrame:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        with open(file_path, 'rb') as f:
            return self.load_from_bytes(f.read(), filename=file_path)

    @staticmethod
    def _normalize_name(name: str) -> str:
        """Strip non-alphanumeric and lowercase for comparison."""
        return re.sub(r'[^a-zA-Z0-9]', '', str(name)).lower()

    def detect_columns(self, df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
        """
        Analyzes DataFrame columns and maps them to canonical schema fields.
        Supports datasets with ANY column names.
        """
        target_df = df if df is not None else self.raw_df
        if target_df is None:
            raise ValueError("No dataset loaded for column inspection.")

        raw_columns = [str(c).replace('\ufeff', '').strip() for c in target_df.columns]
        normalized_cols = {col: self._normalize_name(col) for col in raw_columns}

        detected = {}
        used_cols = set()

        for canonical, spec in self.CANONICAL_FIELDS.items():
            best_col = None
            # 1. Exact match (case-insensitive)
            for raw_col, norm in normalized_cols.items():
                if raw_col in used_cols:
                    continue
                if norm == self._normalize_name(canonical):
                    best_col = raw_col
                    break

            # 2. Alias match
            if not best_col:
                norm_aliases = [self._normalize_name(a) for a in spec["aliases"]]
                for raw_col, norm in normalized_cols.items():
                    if raw_col in used_cols:
                        continue
                    if norm in norm_aliases:
                        best_col = raw_col
                        break

            # 3. Substring match
            if not best_col:
                for raw_col, norm in normalized_cols.items():
                    if raw_col in used_cols:
                        continue
                    if any(a in norm for a in spec["aliases"] if len(a) >= 4):
                        best_col = raw_col
                        break

            if best_col:
                detected[canonical] = best_col
                used_cols.add(best_col)

        unmapped = [c for c in raw_columns if c not in used_cols]
        total_fields = len(self.CANONICAL_FIELDS)
        matched_count = len(detected)
        confidence = round((matched_count / total_fields) * 100, 1)

        self.detected_mapping = detected

        return {
            "total_rows": len(target_df),
            "columns_found": raw_columns,
            "detected_mapping": detected,
            "unmapped_columns": unmapped,
            "missing_required": [],
            "is_ready_to_import": True,
            "confidence_score": confidence,
            "canonical_spec": self.CANONICAL_FIELDS
        }

    def apply_mapping(self, df: pd.DataFrame, mapping: Dict[str, str]) -> pd.DataFrame:
        """
        Applies mapping: { canonical_name: source_column_name }
        Renames DataFrame columns to canonical names.
        """
        df = df.copy()
        clean_cols = [str(c).replace('\ufeff', '').strip() for c in df.columns]
        df.columns = clean_cols
        norm_to_actual = {self._normalize_name(c): c for c in clean_cols}

        rename_dict = {}
        for canonical, source in mapping.items():
            if not source or not str(source).strip():
                continue
            clean_source = str(source).replace('\ufeff', '').strip()
            norm_source = self._normalize_name(clean_source)
            actual_col = norm_to_actual.get(norm_source)
            if actual_col and actual_col != canonical:
                rename_dict[actual_col] = canonical

        if rename_dict:
            df.rename(columns=rename_dict, inplace=True)
        return df

    def preprocess(self, df: Optional[pd.DataFrame] = None, mapping: Optional[Dict[str, str]] = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Executes complete validation, synthesis, and cleaning pipeline.
        Handles CSV files with ANY column names and structures.
        Synthesizes missing fields automatically so no valid dataset is rejected.
        """
        if df is None:
            if self.raw_df is None:
                raise ValueError("No dataframe provided or loaded.")
            df = self.raw_df.copy()
        else:
            self.raw_df = df.copy()

        # Step 0: Column Mapping
        auto_detected = self.detect_columns(df)["detected_mapping"]
        effective_mapping = dict(auto_detected)

        # Overlay user-provided mappings if present
        if mapping and isinstance(mapping, dict):
            for canonical, source in mapping.items():
                if source and str(source).strip():
                    effective_mapping[canonical] = str(source).strip()

        df = self.apply_mapping(df, effective_mapping)

        initial_rows = len(df)
        initial_memory_kb = df.memory_usage(deep=True).sum() / 1024.0

        # =====================================================================
        # Step 1: Automatic Synthesis & Inference of Missing Fields
        # =====================================================================
        existing_cols = list(df.columns)

        # 1. Product Description and StockCode Synthesis
        has_stock = "StockCode" in df.columns
        has_desc = "Description" in df.columns

        if not has_desc and not has_stock:
            text_candidates = [
                c for c in existing_cols
                if c not in ["InvoiceNo", "Country", "CustomerID", "Quantity", "UnitPrice", "InvoiceDate"]
                and df[c].dtype == object
            ]
            if text_candidates:
                df["Description"] = df[text_candidates[0]].astype(str)
                has_desc = True
            else:
                df["Description"] = "Retail Item " + (pd.Series(range(1, len(df) + 1))).astype(str)
                has_desc = True

        if has_desc and not has_stock:
            desc_series = df["Description"].fillna("UNKNOWN_ITEM").astype(str).str.strip()
            codes, _ = pd.factorize(desc_series)
            df["StockCode"] = ["P" + str(c + 1001) for c in codes]
        elif has_stock and not has_desc:
            df["Description"] = "Product " + df["StockCode"].fillna("UNKNOWN").astype(str).str.strip()

        # 2. Invoice / Order ID Synthesis
        if "InvoiceNo" not in df.columns:
            id_candidates = [
                c for c in existing_cols
                if any(x in self._normalize_name(c) for x in ["id", "order", "invoice", "trans", "receipt", "key"])
            ]
            if id_candidates:
                df["InvoiceNo"] = df[id_candidates[0]].astype(str)
            else:
                df["InvoiceNo"] = "INV" + (pd.Series(range(100001, 100001 + len(df)))).astype(str)

        # 3. Quantity Synthesis
        if "Quantity" not in df.columns:
            qty_candidates = [
                c for c in existing_cols
                if any(x in self._normalize_name(c) for x in ["qty", "quantity", "unit", "volume", "count", "item"])
            ]
            if qty_candidates:
                df["Quantity"] = pd.to_numeric(df[qty_candidates[0]], errors='coerce').fillna(1)
            else:
                df["Quantity"] = 1

        # 4. UnitPrice Synthesis
        if "UnitPrice" not in df.columns:
            price_candidates = [
                c for c in existing_cols
                if any(x in self._normalize_name(c) for x in ["price", "cost", "rate", "amount", "sale", "total", "rev"])
            ]
            if price_candidates:
                col = price_candidates[0]
                raw_nums = pd.to_numeric(df[col].astype(str).str.replace(r'[^\d.]', '', regex=True), errors='coerce').fillna(9.99)
                norm_col = self._normalize_name(col)
                if any(x in norm_col for x in ["total", "amount", "sale", "rev"]) and "Quantity" in df.columns:
                    qty_denom = pd.to_numeric(df["Quantity"], errors='coerce').fillna(1).replace(0, 1)
                    df["UnitPrice"] = (raw_nums / qty_denom).round(2)
                else:
                    df["UnitPrice"] = raw_nums.round(2)
            else:
                df["UnitPrice"] = 9.99

        # 5. CustomerID Synthesis
        if "CustomerID" not in df.columns:
            cust_candidates = [
                c for c in existing_cols
                if any(x in self._normalize_name(c) for x in ["cust", "client", "user", "buyer", "account"])
            ]
            if cust_candidates:
                df["CustomerID"] = df[cust_candidates[0]].astype(str)
            else:
                df["CustomerID"] = "CUST-" + df["InvoiceNo"].astype(str)

        # 6. Country Synthesis
        if "Country" not in df.columns:
            geo_candidates = [
                c for c in existing_cols
                if any(x in self._normalize_name(c) for x in ["country", "nation", "region", "state", "city", "market"])
            ]
            if geo_candidates:
                df["Country"] = df[geo_candidates[0]].astype(str)
            else:
                df["Country"] = "Global"

        # 7. InvoiceDate Synthesis
        if "InvoiceDate" not in df.columns:
            date_candidates = [
                c for c in existing_cols
                if any(x in self._normalize_name(c) for x in ["date", "time", "day", "created", "timestamp"])
            ]
            if date_candidates:
                df["InvoiceDate"] = df[date_candidates[0]]
            else:
                df["InvoiceDate"] = pd.Timestamp.now()

        # =====================================================================
        # Step 2: Cleaning, Filtering & Truncation for Star Schema
        # =====================================================================

        # 1. Missing CustomerID handling (impute rather than drop)
        def clean_cust_id(val):
            s = str(val).strip()
            if s.endswith('.0'):
                s = s[:-2]
            return s[:50] if s and s.lower() not in ['', 'nan', 'none', 'null'] else 'GUEST'

        df['CustomerID'] = df['CustomerID'].apply(clean_cust_id)

        # 2. Description and StockCode cleanup & truncate to schema limits
        df['Description'] = df['Description'].fillna('General Product').astype(str).str.strip()
        df['Description'] = df['Description'].replace(['', 'nan', 'NaN', 'None', 'null'], 'General Product')
        df['Description'] = df['Description'].str[:255]

        df['StockCode'] = df['StockCode'].fillna('ITEM').astype(str).str.strip()
        df['StockCode'] = df['StockCode'].replace(['', 'nan', 'NaN', 'None', 'null'], 'ITEM')
        df['StockCode'] = df['StockCode'].str[:50]

        df['Country'] = df['Country'].fillna('Global').astype(str).str.strip()
        df['Country'] = df['Country'].replace(['', 'nan', 'NaN', 'None', 'null'], 'Global')
        df['Country'] = df['Country'].str[:100]

        # 3. Cancelled Invoices handling (e.g. 'C536379')
        df['InvoiceNo'] = df['InvoiceNo'].fillna('INV').astype(str).str.strip()
        cancelled_mask = df['InvoiceNo'].str.upper().str.startswith('C')
        cancelled_count = int(cancelled_mask.sum())
        df = df[~cancelled_mask].copy()

        # 4. Quantity Validation (must be positive integer)
        if not pd.api.types.is_numeric_dtype(df['Quantity']):
            df['Quantity'] = df['Quantity'].astype(str).str.replace(r'[^\d-]', '', regex=True).str.strip()
        df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce')
        invalid_qty_mask = df['Quantity'].isna() | (df['Quantity'] <= 0)
        invalid_qty_count = int(invalid_qty_mask.sum())
        df = df[~invalid_qty_mask].copy()
        df['Quantity'] = df['Quantity'].astype(int)

        # 5. UnitPrice Validation (must be positive float)
        if not pd.api.types.is_numeric_dtype(df['UnitPrice']):
            df['UnitPrice'] = df['UnitPrice'].astype(str).str.replace(r'[^\d.]', '', regex=True).str.strip()
        df['UnitPrice'] = pd.to_numeric(df['UnitPrice'], errors='coerce')
        invalid_price_mask = df['UnitPrice'].isna() | (df['UnitPrice'] <= 0)
        invalid_price_count = int(invalid_price_mask.sum())
        df = df[~invalid_price_mask].copy()
        df['UnitPrice'] = df['UnitPrice'].astype(float).round(2)

        # 6. Duplicate handling
        duplicates_mask = df.duplicated()
        duplicates_count = int(duplicates_mask.sum())
        df = df.drop_duplicates().copy()

        # 7. Date normalization & Total Amount calculation
        df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'], errors='coerce')
        df['InvoiceDate'] = df['InvoiceDate'].fillna(pd.Timestamp.now())
        df['TotalAmount'] = (df['Quantity'] * df['UnitPrice']).round(2)

        # StockCode and Country cleanup
        df['StockCode'] = df['StockCode'].astype(str).str.strip()[:50]
        df['Country'] = df['Country'].astype(str).str.strip()[:100]

        final_rows = len(df)
        final_memory_kb = df.memory_usage(deep=True).sum() / 1024.0

        self.cleaned_df = df

        summary = {
            "initial_rows": initial_rows,
            "final_rows": final_rows,
            "total_removed": max(0, initial_rows - final_rows),
            "retention_percentage": round((final_rows / initial_rows * 100), 2) if initial_rows > 0 else 0.0,
            "missing_customer_id_removed": 0,
            "missing_description_removed": 0,
            "cancelled_invoices_removed": cancelled_count,
            "invalid_quantity_removed": invalid_qty_count,
            "invalid_price_removed": invalid_price_count,
            "duplicates_removed": duplicates_count,
            "initial_memory_kb": round(initial_memory_kb, 2),
            "final_memory_kb": round(final_memory_kb, 2),
            "unique_customers": int(df['CustomerID'].nunique()) if final_rows > 0 else 0,
            "unique_products": int(df['StockCode'].nunique()) if final_rows > 0 else 0,
            "unique_invoices": int(df['InvoiceNo'].nunique()) if final_rows > 0 else 0,
            "unique_countries": int(df['Country'].nunique()) if final_rows > 0 else 0,
            "total_revenue": round(float(df['TotalAmount'].sum()), 2) if final_rows > 0 else 0.0
        }

        self.last_summary = summary

        # Persist active dataset
        if final_rows > 0:
            try:
                os.makedirs(self.data_dir, exist_ok=True)
                export_df = df.copy()
                if 'InvoiceDate' in export_df.columns:
                    export_df['InvoiceDate'] = export_df['InvoiceDate'].dt.strftime('%Y-%m-%d %H:%M:%S')
                export_df.to_csv(self.active_csv_path, index=False)
                with open(self.active_summary_path, 'w') as sf:
                    json.dump(summary, sf)
            except Exception as pe:
                print(f"Warning: Failed to persist active cleaned dataset: {pe}")

        return df, summary
