import os
import io
import re
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
        # 1. Parse shared strings if present
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in tree.findall('.//ns:si', ns):
                # Text can be in <t> or inside rich text runs <r><t>
                text_parts = [t.text for t in si.findall('.//ns:t', ns) if t.text]
                shared_strings.append("".join(text_parts))

        # 2. Locate first worksheet
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

        # Header row
        headers = [str(h).strip() if str(h).strip() else f"Col_{i+1}" for i, h in enumerate(matrix[0])]
        data = matrix[1:]
        return pd.DataFrame(data, columns=headers)


class DataPreprocessor:
    """
    Handles Online Retail dataset loading, flexible column detection,
    manual mapping, and cleaning for Data Warehouse ETL.
    """

    CANONICAL_FIELDS = {
        "InvoiceNo": {
            "required": True,
            "description": "Invoice or Order number",
            "aliases": ["invoiceno", "invoice", "invoice_no", "invoicenum", "order_id", "orderid", "orderno", "order_no", "transaction_id", "bill_no", "billno", "order_number", "purchase_id", "receipt_no", "sale_id", "trans_id", "invoice_id"]
        },
        "StockCode": {
            "required": True,
            "description": "Product SKU or Item Code",
            "aliases": ["stockcode", "stock_code", "product_id", "productid", "item_code", "itemcode", "sku", "item_id", "itemid", "product_code", "product_sku", "code", "item_no", "article_id", "prod_id"]
        },
        "Description": {
            "required": True,
            "description": "Product title or description",
            "aliases": ["description", "desc", "product_name", "productname", "product_title", "item_description", "item_name", "itemname", "item_title", "title", "product", "item", "name"]
        },
        "Quantity": {
            "required": True,
            "description": "Number of units purchased",
            "aliases": ["quantity", "qty", "units", "quantity_sold", "count", "amount_units", "items", "sales_volume", "volume", "num_items"]
        },
        "UnitPrice": {
            "required": True,
            "description": "Price per unit",
            "aliases": ["unitprice", "unit_price", "price", "unit_cost", "rate", "cost", "unitcost", "item_price", "price_per_unit", "selling_price", "amount"]
        },
        "InvoiceDate": {
            "required": False,
            "description": "Transaction date and time",
            "aliases": ["invoicedate", "invoice_date", "order_date", "orderdate", "transaction_date", "date", "purchase_date", "created_at", "timestamp", "time", "date_time", "datetime"]
        },
        "CustomerID": {
            "required": False,
            "description": "Customer identifier",
            "aliases": ["customerid", "customer_id", "client_id", "clientid", "user_id", "userid", "customer_code", "customer", "account_id", "shopper_id", "cust_id"]
        },
        "Country": {
            "required": False,
            "description": "Customer country or region",
            "aliases": ["country", "region", "location", "nation", "state", "shipping_country", "customer_country"]
        }
    }

    def __init__(self):
        self.raw_df: Optional[pd.DataFrame] = None
        self.cleaned_df: Optional[pd.DataFrame] = None
        self.last_summary: Dict[str, Any] = {}
        self.detected_mapping: Dict[str, str] = {}

    def load_from_bytes(self, content: bytes, filename: str = "") -> pd.DataFrame:
        """
        Loads dataset from raw bytes, detecting CSV vs Excel (.xlsx) and encodings.
        """
        filename_lower = filename.lower() if filename else ""
        is_zip = content.startswith(b'PK\x03\x04')

        if filename_lower.endswith('.xlsx') or is_zip:
            try:
                df = parse_xlsx_stream(io.BytesIO(content))
                self.raw_df = df
                return df
            except Exception as e:
                # If zip parsing failed but wasn't named xlsx, try CSV fallback
                if not filename_lower.endswith('.xlsx'):
                    pass
                else:
                    raise ValueError(f"Failed to parse Excel (.xlsx) file: {str(e)}")

        # CSV parsing with encoding fallback and delimiter sniffing
        encodings = ['utf-8-sig', 'utf-8', 'ISO-8859-1', 'latin1', 'cp1252']
        delimiters = [',', ';', '\t']

        for enc in encodings:
            for sep in delimiters:
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=enc, sep=sep)
                    # A valid retail dataset will have more than 1 column
                    if df.shape[1] > 1:
                        self.raw_df = df
                        return df
                except Exception:
                    continue

        # Final attempt with standard read_csv
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
        Returns detected mapping, missing required fields, and ambiguity status.
        """
        target_df = df if df is not None else self.raw_df
        if target_df is None:
            raise ValueError("No dataset loaded for column inspection.")

        raw_columns = [str(c).strip() for c in target_df.columns]
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

            if best_col:
                detected[canonical] = best_col
                used_cols.add(best_col)

        unmapped = [c for c in raw_columns if c not in used_cols]
        missing_required = [
            c for c, s in self.CANONICAL_FIELDS.items()
            if s["required"] and c not in detected
        ]

        total_required = sum(1 for s in self.CANONICAL_FIELDS.values() if s["required"])
        found_required = total_required - len(missing_required)
        confidence = round((found_required / total_required) * 100, 1)

        self.detected_mapping = detected

        return {
            "total_rows": len(target_df),
            "columns_found": raw_columns,
            "detected_mapping": detected,
            "unmapped_columns": unmapped,
            "missing_required": missing_required,
            "is_ready_to_import": len(missing_required) == 0,
            "confidence_score": confidence,
            "canonical_spec": self.CANONICAL_FIELDS
        }

    def apply_mapping(self, df: pd.DataFrame, mapping: Dict[str, str]) -> pd.DataFrame:
        """
        Applies mapping: { canonical_name: source_column_name }
        Renames DataFrame columns to canonical names using normalized matching.
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
        Executes complete validation and cleaning pipeline.
        Applies mapping, validates required fields, removes corrupt records,
        and produces comprehensive audit metrics.
        """
        if df is None:
            if self.raw_df is None:
                raise ValueError("No dataframe provided or loaded.")
            df = self.raw_df.copy()
        else:
            self.raw_df = df.copy()

        # Step 0: Column Mapping
        # Always run auto-detection as baseline
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

        # Validate required columns
        required_cols = ["InvoiceNo", "StockCode", "Description", "Quantity", "UnitPrice"]
        missing = [c for c in required_cols if c not in df.columns]

        # Second-chance fallback: If a required column is missing, inspect remaining unmapped columns
        if missing:
            norm_to_actual = {self._normalize_name(c): c for c in df.columns}
            for req in list(missing):
                spec = self.CANONICAL_FIELDS.get(req, {})
                for alias in spec.get("aliases", []):
                    norm_a = self._normalize_name(alias)
                    if norm_a in norm_to_actual:
                        actual = norm_to_actual[norm_a]
                        if actual != req:
                            df.rename(columns={actual: req}, inplace=True)
                        missing.remove(req)
                        break

        if missing:
            available_cols = ", ".join(list(df.columns))
            raise ValueError(
                f"Cannot process dataset. Missing required column(s): {', '.join(missing)}. "
                f"Available columns in dataset: [{available_cols}]. "
                f"Please provide column mapping on the Dataset & Safe ETL page."
            )

        # Ensure optional columns exist with safe defaults
        if 'Country' not in df.columns:
            df['Country'] = 'United Kingdom'
        if 'CustomerID' not in df.columns:
            df['CustomerID'] = 'GUEST'
        if 'InvoiceDate' not in df.columns:
            df['InvoiceDate'] = pd.Timestamp.now()

        # 1. Missing / Invalid CustomerID handling
        missing_customer_mask = (
            df['CustomerID'].isna() |
            df['CustomerID'].astype(str).str.strip().isin(['', 'nan', 'NaN', 'None', 'null'])
        )
        missing_customer_count = int(missing_customer_mask.sum())
        df = df[~missing_customer_mask].copy()

        # Format CustomerID (remove .0 from float conversions)
        def clean_cust_id(val):
            s = str(val).strip()
            if s.endswith('.0'):
                s = s[:-2]
            return s
        df['CustomerID'] = df['CustomerID'].apply(clean_cust_id)

        # 2. Missing Description handling
        missing_desc_mask = (
            df['Description'].isna() |
            df['Description'].astype(str).str.strip().isin(['', 'nan', 'NaN', 'None', 'null'])
        )
        missing_desc_count = int(missing_desc_mask.sum())
        df = df[~missing_desc_mask].copy()
        df['Description'] = df['Description'].astype(str).str.strip()

        # 3. Cancelled Invoices handling (e.g. 'C536379')
        df['InvoiceNo'] = df['InvoiceNo'].astype(str).str.strip()
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

        # 5. UnitPrice Validation (must be positive float; strip currency symbols and non-numeric chars)
        if not pd.api.types.is_numeric_dtype(df['UnitPrice']):
            df['UnitPrice'] = df['UnitPrice'].astype(str).str.replace(r'[^\d.]', '', regex=True).str.strip()
        df['UnitPrice'] = pd.to_numeric(df['UnitPrice'], errors='coerce')
        invalid_price_mask = df['UnitPrice'].isna() | (df['UnitPrice'] <= 0)
        invalid_price_count = int(invalid_price_mask.sum())
        df = df[~invalid_price_mask].copy()
        df['UnitPrice'] = df['UnitPrice'].astype(float)

        # 6. Duplicate handling
        duplicates_mask = df.duplicated()
        duplicates_count = int(duplicates_mask.sum())
        df = df.drop_duplicates().copy()

        # 7. Date normalization & Total Amount calculation
        df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'], errors='coerce')
        # Fill unparseable dates with current timestamp
        df['InvoiceDate'] = df['InvoiceDate'].fillna(pd.Timestamp.now())
        df['TotalAmount'] = (df['Quantity'] * df['UnitPrice']).round(2)

        # StockCode cleanup
        df['StockCode'] = df['StockCode'].astype(str).str.strip()
        df['Country'] = df['Country'].astype(str).str.strip()

        final_rows = len(df)
        final_memory_kb = df.memory_usage(deep=True).sum() / 1024.0

        self.cleaned_df = df

        summary = {
            "initial_rows": initial_rows,
            "final_rows": final_rows,
            "total_removed": initial_rows - final_rows,
            "retention_percentage": round((final_rows / initial_rows * 100), 2) if initial_rows > 0 else 0.0,
            "missing_customer_id_removed": missing_customer_count,
            "missing_description_removed": missing_desc_count,
            "cancelled_invoices_removed": cancelled_count,
            "invalid_quantity_removed": invalid_qty_count,
            "invalid_price_removed": invalid_price_count,
            "duplicates_removed": duplicates_count,
            "initial_memory_kb": round(initial_memory_kb, 2),
            "final_memory_kb": round(final_memory_kb, 2),
            "unique_customers": int(df['CustomerID'].nunique()),
            "unique_products": int(df['StockCode'].nunique()),
            "unique_invoices": int(df['InvoiceNo'].nunique()),
            "unique_countries": int(df['Country'].nunique()),
            "total_revenue": round(float(df['TotalAmount'].sum()), 2)
        }

        self.last_summary = summary
        return df, summary
