import pandas as pd
from typing import Dict, List, Any

class StarSchemaGenerator:
    """
    Transforms cleaned Online Retail transactions into
    Star Schema entity records:
    1. dim_customer (customer_id, country)
    2. dim_product (product_id, stock_code, description)
    3. dim_date (date_id, day, month, quarter, year)
    4. fact_sales (sale_id, customer_id, product_id, date_id, quantity, unit_price, total_amount)
    """

    @staticmethod
    def generate_star_schema(cleaned_df: pd.DataFrame) -> Dict[str, Any]:
        df = cleaned_df.copy()

        # 1. dim_customer: unique customer_id and primary country
        # In case a customer ordered from multiple countries, take mode / first
        cust_group = df.groupby('CustomerID')['Country'].agg(lambda x: x.mode()[0] if not x.mode().empty else x.iloc[0]).reset_index()
        dim_customer = [
            {"customer_id": str(row['CustomerID']), "country": str(row['Country'])}
            for _, row in cust_group.iterrows()
        ]

        # 2. dim_product: unique stock_code and latest description
        prod_group = df.groupby('StockCode')['Description'].agg(lambda x: x.mode()[0] if not x.mode().empty else x.iloc[0]).reset_index()
        stock_to_id = {}
        dim_product = []
        for idx, row in prod_group.iterrows():
            prod_id = idx + 1
            stock_code = str(row['StockCode']).strip()
            desc = str(row['Description']).strip()
            stock_to_id[stock_code] = prod_id
            dim_product.append({
                "product_id": prod_id,
                "stock_code": stock_code,
                "description": desc
            })

        # 3. dim_date: unique dates extracted from InvoiceDate
        df['Date_Obj'] = pd.to_datetime(df['InvoiceDate'])
        df['Date_Key'] = df['Date_Obj'].dt.strftime('%Y%m%d').astype(int)
        df['Day'] = df['Date_Obj'].dt.day
        df['Month'] = df['Date_Obj'].dt.month
        df['Quarter'] = df['Date_Obj'].dt.quarter
        df['Year'] = df['Date_Obj'].dt.year

        unique_dates = df[['Date_Key', 'Day', 'Month', 'Quarter', 'Year']].drop_duplicates()
        dim_date = [
            {
                "date_id": int(row['Date_Key']),
                "day": int(row['Day']),
                "month": int(row['Month']),
                "quarter": int(row['Quarter']),
                "year": int(row['Year'])
            }
            for _, row in unique_dates.iterrows()
        ]

        # 4. fact_sales: sales transactions joined with generated keys
        df['Product_ID'] = df['StockCode'].astype(str).str.strip().map(stock_to_id)
        df['Product_ID'] = df['Product_ID'].fillna(1).astype(int)

        fact_sales = []
        for idx, row in df.iterrows():
            qty = int(row['Quantity'])
            price = round(float(row['UnitPrice']), 2)
            total = round(float(row['TotalAmount']), 2)
            fact_sales.append({
                "customer_id": str(row['CustomerID']),
                "product_id": int(row['Product_ID']),
                "date_id": int(row['Date_Key']),
                "quantity": qty,
                "unit_price": price,
                "total_amount": total
            })

        return {
            "dim_customer": dim_customer,
            "dim_product": dim_product,
            "dim_date": dim_date,
            "fact_sales": fact_sales,
            "stats": {
                "customers_count": len(dim_customer),
                "products_count": len(dim_product),
                "dates_count": len(dim_date),
                "facts_count": len(fact_sales)
            }
        }
