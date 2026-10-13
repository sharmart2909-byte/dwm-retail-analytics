import pandas as pd
import numpy as np
import io
from typing import Dict, Any, Tuple

class DataPreprocessor:
    """
    Handles Online Retail dataset cleaning & preprocessing for Data Warehouse ETL.
    Addresses:
    - Missing CustomerID
    - Missing Description
    - Negative or Zero Quantities
    - Non-positive Unit Prices
    - Cancelled Invoices (Prefix 'C')
    - Duplicate Transactions
    """

    def __init__(self):
        self.raw_df: pd.DataFrame = None
        self.cleaned_df: pd.DataFrame = None
        self.last_summary: Dict[str, Any] = {}

    def load_from_bytes(self, content: bytes) -> pd.DataFrame:
        try:
            df = pd.read_csv(io.BytesIO(content), encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(content), encoding='ISO-8859-1')
        self.raw_df = df
        return df

    def load_from_path(self, file_path: str) -> pd.DataFrame:
        try:
            df = pd.read_csv(file_path, encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, encoding='ISO-8859-1')
        self.raw_df = df
        return df

    def preprocess(self, df: pd.DataFrame = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        if df is None:
            if self.raw_df is None:
                raise ValueError("No dataframe provided or loaded.")
            df = self.raw_df.copy()
        else:
            self.raw_df = df.copy()

        initial_rows = len(df)
        initial_memory_kb = df.memory_usage(deep=True).sum() / 1024.0

        # Standardize column names (strip whitespace, lowercase check)
        df.columns = [c.strip() for c in df.columns]

        # 1. Missing CustomerID handling
        # CustomerID may be NaN, empty string, or float with NaN
        if 'CustomerID' in df.columns:
            missing_customer_mask = df['CustomerID'].isna() | (df['CustomerID'].astype(str).str.strip().isin(['', 'nan', 'NaN', 'None', 'null']))
            missing_customer_count = int(missing_customer_mask.sum())
            df = df[~missing_customer_mask].copy()
            # Clean CustomerID format (strip .0 if float)
            df['CustomerID'] = df['CustomerID'].apply(lambda x: str(int(float(x))) if str(x).replace('.','',1).isdigit() else str(x).strip())
        else:
            missing_customer_count = 0

        # 2. Missing Description handling
        if 'Description' in df.columns:
            missing_desc_mask = df['Description'].isna() | (df['Description'].astype(str).str.strip().isin(['', 'nan', 'NaN', 'None', 'null']))
            missing_desc_count = int(missing_desc_mask.sum())
            df = df[~missing_desc_mask].copy()
            df['Description'] = df['Description'].astype(str).str.strip()
        else:
            missing_desc_count = 0

        # 3. Cancelled invoice handling (Invoices starting with 'C' or 'c')
        if 'InvoiceNo' in df.columns:
            df['InvoiceNo'] = df['InvoiceNo'].astype(str).str.strip()
            cancelled_mask = df['InvoiceNo'].str.upper().str.startswith('C')
            cancelled_count = int(cancelled_mask.sum())
            df = df[~cancelled_mask].copy()
        else:
            cancelled_count = 0

        # 4. Invalid/negative quantity handling (Quantity must be > 0)
        if 'Quantity' in df.columns:
            df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce')
            invalid_qty_mask = df['Quantity'].isna() | (df['Quantity'] <= 0)
            invalid_qty_count = int(invalid_qty_mask.sum())
            df = df[~invalid_qty_mask].copy()
            df['Quantity'] = df['Quantity'].astype(int)
        else:
            invalid_qty_count = 0

        # 5. Invalid price handling (UnitPrice must be > 0)
        price_col = 'UnitPrice' if 'UnitPrice' in df.columns else ('Price' if 'Price' in df.columns else None)
        if price_col:
            df[price_col] = pd.to_numeric(df[price_col], errors='coerce')
            invalid_price_mask = df[price_col].isna() | (df[price_col] <= 0)
            invalid_price_count = int(invalid_price_mask.sum())
            df = df[~invalid_price_mask].copy()
            df[price_col] = df[price_col].astype(float)
            if price_col != 'UnitPrice':
                df.rename(columns={price_col: 'UnitPrice'}, inplace=True)
        else:
            invalid_price_count = 0

        # 6. Duplicate handling
        duplicates_mask = df.duplicated()
        duplicates_count = int(duplicates_mask.sum())
        df = df.drop_duplicates().copy()

        # Format InvoiceDate & Calculate TotalAmount = Quantity * UnitPrice
        if 'InvoiceDate' in df.columns:
            df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'], errors='coerce')
            # Drop invalid dates if any
            df = df[df['InvoiceDate'].notna()].copy()
        else:
            df['InvoiceDate'] = pd.Timestamp.now()

        df['TotalAmount'] = (df['Quantity'] * df['UnitPrice']).round(2)

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
            "unique_customers": int(df['CustomerID'].nunique()) if 'CustomerID' in df.columns else 0,
            "unique_products": int(df['StockCode'].nunique()) if 'StockCode' in df.columns else 0,
            "unique_invoices": int(df['InvoiceNo'].nunique()) if 'InvoiceNo' in df.columns else 0,
            "unique_countries": int(df['Country'].nunique()) if 'Country' in df.columns else 0,
            "total_revenue": round(float(df['TotalAmount'].sum()), 2)
        }

        self.last_summary = summary
        return df, summary
