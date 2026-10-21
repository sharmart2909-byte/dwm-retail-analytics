import unittest
import io
import json
from fastapi.testclient import TestClient
from main import app

class TestFastAPIIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")

    def test_inspect_endpoint_default(self):
        response = self.client.post("/api/data/inspect")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("inspection", data)
        self.assertIn("detected_mapping", data["inspection"])
        self.assertIn("InvoiceNo", data["inspection"]["detected_mapping"])

    def test_inspect_uploaded_csv(self):
        csv_content = b"order_id,item_code,title,units,unit_cost\n101,A1,Lantern,5,2.50\n"
        files = {"file": ("custom_orders.csv", io.BytesIO(csv_content), "text/csv")}
        response = self.client.post("/api/data/inspect", files=files)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        mapping = data["inspection"]["detected_mapping"]
        self.assertEqual(mapping["InvoiceNo"], "order_id")
        self.assertEqual(mapping["StockCode"], "item_code")
        self.assertEqual(mapping["Description"], "title")
        self.assertEqual(mapping["Quantity"], "units")
        self.assertEqual(mapping["UnitPrice"], "unit_cost")

    def test_preprocess_with_custom_mapping(self):
        csv_content = b"bill_num,sku,item_name,amt_bought,price_per\n201,B2,Tea Box,4,10.00\n"
        files = {"file": ("custom_billing.csv", io.BytesIO(csv_content), "text/csv")}
        custom_mapping = {
            "InvoiceNo": "bill_num",
            "StockCode": "sku",
            "Description": "item_name",
            "Quantity": "amt_bought",
            "UnitPrice": "price_per"
        }
        data_payload = {"mapping": json.dumps(custom_mapping)}
        response = self.client.post("/api/data/preprocess", files=files, data=data_payload)
        self.assertEqual(response.status_code, 200)
        res = response.json()
        self.assertTrue(res["success"])
        self.assertEqual(res["summary"]["final_rows"], 1)
        self.assertEqual(res["summary"]["total_revenue"], 40.0)

        # Reset global preprocessor back to default representative dataset for subsequent analytics tests
        self.client.post("/api/data/preprocess")

    def test_preprocess_any_column_names_succeeds(self):
        csv_content = b"col1,col2,col3\nval1,val2,val3\n"
        files = {"file": ("any_columns.csv", io.BytesIO(csv_content), "text/csv")}
        response = self.client.post("/api/data/preprocess", files=files)
        # Any column names are accepted and synthesized
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        # Reset to default representative dataset for subsequent analytics tests
        self.client.post("/api/data/preprocess")

    def test_star_schema_generation(self):
        response = self.client.post("/api/data/star-schema")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        schema = data["data"]
        self.assertIn("dim_customer", schema)
        self.assertIn("dim_product", schema)
        self.assertIn("dim_date", schema)
        self.assertIn("fact_sales", schema)

    def test_regression_endpoint(self):
        response = self.client.post("/api/ml/regression")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("simple_regression", data["data"])

    def test_clustering_endpoint(self):
        response = self.client.post("/api/ml/clustering", json={"n_clusters": 3})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("kmeans", data["data"])
        self.assertIn("agglomerative", data["data"])

    def test_apriori_endpoint(self):
        response = self.client.post("/api/ml/apriori", json={"min_support": 0.03, "min_confidence": 0.2})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])

    def test_recommend_endpoint(self):
        response = self.client.post("/api/ml/recommend", json={"stock_code": "85123A", "top_n": 4})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("recommendations", data["data"])

if __name__ == '__main__':
    unittest.main()
