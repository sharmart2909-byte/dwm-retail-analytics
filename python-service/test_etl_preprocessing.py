import unittest
import io
import os
import zipfile
import xml.etree.ElementTree as ET
import pandas as pd
from preprocessing import DataPreprocessor, parse_xlsx_stream

class TestETLPreprocessing(unittest.TestCase):

    def setUp(self):
        self.preprocessor = DataPreprocessor()

    def test_standard_csv(self):
        csv_data = b"""InvoiceNo,StockCode,Description,Quantity,UnitPrice,InvoiceDate,CustomerID,Country
536365,85123A,WHITE HANGING HEART,6,2.55,2011-12-01 08:26:00,17850,United Kingdom
536366,22633,HAND WARMER,12,1.85,2011-12-01 08:28:00,17850,United Kingdom
"""
        df = self.preprocessor.load_from_bytes(csv_data)
        cleaned, summary = self.preprocessor.preprocess(df)
        self.assertEqual(len(cleaned), 2)
        self.assertEqual(summary['retention_percentage'], 100.0)
        self.assertIn('TotalAmount', cleaned.columns)
        self.assertEqual(round(cleaned['TotalAmount'].sum(), 2), round(6*2.55 + 12*1.85, 2))

    def test_flexible_column_aliases_and_reordered(self):
        csv_data = b"""order_id,unit_cost,item_code,title,units,client_id,location,created_at
INV001,3.50,SKU99,SUPER MUG,10,CUST100,France,2011-11-15
INV002,15.00,SKU88,LUXURY TEA,2,CUST101,Germany,2011-11-16
"""
        df = self.preprocessor.load_from_bytes(csv_data)
        inspection = self.preprocessor.detect_columns(df)
        self.assertTrue(inspection['is_ready_to_import'])
        self.assertEqual(inspection['detected_mapping']['InvoiceNo'], 'order_id')
        self.assertEqual(inspection['detected_mapping']['StockCode'], 'item_code')
        self.assertEqual(inspection['detected_mapping']['Description'], 'title')
        self.assertEqual(inspection['detected_mapping']['Quantity'], 'units')
        self.assertEqual(inspection['detected_mapping']['UnitPrice'], 'unit_cost')

        cleaned, summary = self.preprocessor.preprocess(df)
        self.assertEqual(len(cleaned), 2)
        self.assertEqual(cleaned['Country'].iloc[0], 'France')
        self.assertEqual(cleaned['Country'].iloc[1], 'Germany')

    def test_extra_irrelevant_columns(self):
        csv_data = b"""InvoiceNo,StockCode,Description,Quantity,UnitPrice,ExtraCol1,ExtraCol2
10001,P01,Item One,5,2.00,IgnoredData1,IgnoredData2
10002,P02,Item Two,3,4.00,IgnoredData3,IgnoredData4
"""
        df = self.preprocessor.load_from_bytes(csv_data)
        inspection = self.preprocessor.detect_columns(df)
        self.assertIn('ExtraCol1', inspection['unmapped_columns'])
        cleaned, summary = self.preprocessor.preprocess(df)
        self.assertEqual(len(cleaned), 2)

    def test_missing_required_column_raises_error(self):
        # Missing Quantity and UnitPrice
        csv_data = b"""InvoiceNo,StockCode,Description
10001,P01,Item One
"""
        df = self.preprocessor.load_from_bytes(csv_data)
        with self.assertRaises(ValueError) as ctx:
            self.preprocessor.preprocess(df)
        self.assertIn("Missing required column", str(ctx.exception))

    def test_cancellations_and_negative_quantities_filtered(self):
        csv_data = b"""InvoiceNo,StockCode,Description,Quantity,UnitPrice,CustomerID
5001,P01,Valid Item,5,10.00,12345
C5002,P01,Cancelled Item,5,10.00,12345
5003,P02,Negative Qty Item,-3,10.00,12345
5004,P03,Zero Qty Item,0,10.00,12345
5005,P04,Negative Price Item,2,-5.00,12345
"""
        df = self.preprocessor.load_from_bytes(csv_data)
        cleaned, summary = self.preprocessor.preprocess(df)
        self.assertEqual(len(cleaned), 1)
        self.assertEqual(cleaned['InvoiceNo'].iloc[0], '5001')
        self.assertEqual(summary['cancelled_invoices_removed'], 1)
        self.assertEqual(summary['invalid_quantity_removed'], 2)
        self.assertEqual(summary['invalid_price_removed'], 1)

    def test_utf8_bom_handling(self):
        # UTF-8 BOM is \xef\xbb\xbf
        bom_csv = b'\xef\xbb\xbfInvoiceNo,StockCode,Description,Quantity,UnitPrice\n501,P01,Item,2,5.00\n'
        df = self.preprocessor.load_from_bytes(bom_csv)
        self.assertIn('InvoiceNo', df.columns)
        cleaned, summary = self.preprocessor.preprocess(df)
        self.assertEqual(len(cleaned), 1)

    def test_pure_python_xlsx_parsing(self):
        # Synthesize a minimal valid XLSX ZIP archive
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w') as z:
            # [Content_Types].xml
            z.writestr('[Content_Types].xml', '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>''')

            # sharedStrings.xml
            z.writestr('xl/sharedStrings.xml', '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="5" uniqueCount="5">
  <si><t>InvoiceNo</t></si>
  <si><t>StockCode</t></si>
  <si><t>Description</t></si>
  <si><t>Quantity</t></si>
  <si><t>UnitPrice</t></si>
  <si><t>INV-XLSX-01</t></si>
  <si><t>SKU-999</t></si>
  <si><t>EXCEL IMPORT TEST ITEM</t></si>
</sst>''')

            # sheet1.xml
            z.writestr('xl/worksheets/sheet1.xml', '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1" t="s"><v>1</v></c>
      <c r="C1" t="s"><v>2</v></c>
      <c r="D1" t="s"><v>3</v></c>
      <c r="E1" t="s"><v>4</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>5</v></c>
      <c r="B2" t="s"><v>6</v></c>
      <c r="C2" t="s"><v>7</v></c>
      <c r="D2"><v>15</v></c>
      <c r="E2"><v>8.50</v></c>
    </row>
  </sheetData>
</worksheet>''')

        xlsx_bytes = buf.getvalue()
        df = self.preprocessor.load_from_bytes(xlsx_bytes, filename="retail_dataset.xlsx")
        self.assertEqual(len(df), 1)
        self.assertEqual(df['InvoiceNo'].iloc[0], 'INV-XLSX-01')
        self.assertEqual(df['StockCode'].iloc[0], 'SKU-999')
        
        cleaned, summary = self.preprocessor.preprocess(df)
        self.assertEqual(len(cleaned), 1)
        self.assertEqual(cleaned['TotalAmount'].iloc[0], 127.50)

    def test_duplicates_removal(self):
        csv_data = b"""InvoiceNo,StockCode,Description,Quantity,UnitPrice,CustomerID
1001,P01,Item One,2,10.00,100
1001,P01,Item One,2,10.00,100
1002,P02,Item Two,1,20.00,101
"""
        df = self.preprocessor.load_from_bytes(csv_data)
        cleaned, summary = self.preprocessor.preprocess(df)
        self.assertEqual(len(cleaned), 2)
        self.assertEqual(summary['duplicates_removed'], 1)

    def test_no_valid_rows_retained(self):
        # All rows have negative quantity or cancelled invoices
        csv_data = b"""InvoiceNo,StockCode,Description,Quantity,UnitPrice,CustomerID
C1001,P01,Item One,2,10.00,100
1002,P02,Item Two,-5,20.00,101
1003,P03,Item Three,0,15.00,102
"""
        df = self.preprocessor.load_from_bytes(csv_data)
        cleaned, summary = self.preprocessor.preprocess(df)
        self.assertEqual(len(cleaned), 0)
        self.assertEqual(summary['final_rows'], 0)
        self.assertEqual(summary['retention_percentage'], 0.0)

    def test_currency_symbols_and_string_prices(self):
        csv_data = b"InvoiceNo,StockCode,Description,Quantity,UnitPrice\n1001,P01,Item One,4,$12.50\n1002,P02,Item Two,2," + bytes([0xc2, 0xa3]) + b"8.00\n"
        df = self.preprocessor.load_from_bytes(csv_data)
        cleaned, summary = self.preprocessor.preprocess(df)
        self.assertEqual(len(cleaned), 2)
        self.assertEqual(cleaned['UnitPrice'].iloc[0], 12.50)
        self.assertEqual(cleaned['UnitPrice'].iloc[1], 8.00)

    def test_alternative_dataset_fixture(self):
        fixture_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "alternative_retail_sample.csv"))
        self.assertTrue(os.path.exists(fixture_path), f"Fixture not found at {fixture_path}")
        df = self.preprocessor.load_from_path(fixture_path)
        
        # Verify inspection correctly detects the columns
        inspection = self.preprocessor.detect_columns(df)
        self.assertTrue(inspection["is_ready_to_import"])
        self.assertEqual(inspection["detected_mapping"]["InvoiceNo"], "Order_ID")
        self.assertEqual(inspection["detected_mapping"]["StockCode"], "product_id")
        self.assertEqual(inspection["detected_mapping"]["Description"], "product_name")
        self.assertEqual(inspection["detected_mapping"]["Quantity"], "Quantity")
        self.assertEqual(inspection["detected_mapping"]["UnitPrice"], "Unit_Price")

        # Verify full cleaning
        cleaned, summary = self.preprocessor.preprocess(df)
        self.assertEqual(len(cleaned), 19)
        self.assertEqual(summary["unique_products"], 15)
        self.assertEqual(summary["unique_customers"], 9)
        self.assertIn("TotalAmount", cleaned.columns)

if __name__ == '__main__':
    unittest.main()
