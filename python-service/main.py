import os
import io
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from preprocessing import DataPreprocessor
from star_schema_generator import StarSchemaGenerator
from ml_models.regression import RegressionAnalytics
from ml_models.naive_bayes import NaiveBayesClassifier
from ml_models.clustering import CustomerSegmentation
from ml_models.association_rules import AprioriMining
from ml_models.recommendation import ProductRecommender

app = FastAPI(
    title="Online Retail Data Mining & Analytics API",
    description="Python FastAPI engine for Preprocessing, Star Schema ETL, Regression, Naive Bayes, Clustering, and Apriori Recommendation.",
    version="1.0.0"
)

# Enable CORS — explicit origins for local dev; Spring Boot sits in front for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:8080",   # Spring Boot (backend-to-backend not needed but harmless)
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,       # FastAPI issues no cookies; wildcard + credentials is a CORS spec violation
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global preprocessor holding current dataset state
preprocessor = DataPreprocessor()
DEFAULT_CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "online_retail_sample.csv"))
ACTIVE_CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "active_cleaned_dataset.csv"))
ACTIVE_SUMMARY_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "active_summary.json"))

def get_current_df() -> pd.DataFrame:
    """
    Returns the active working dataset.
    Prioritizes:
    1. Preprocessor in-memory cleaned dataframe
    2. Persisted active_cleaned_dataset.csv (from recent upload)
    3. Bundled online_retail_sample.csv as fallback
    """
    if preprocessor.cleaned_df is not None:
        return preprocessor.cleaned_df

    if os.path.exists(ACTIVE_CSV_PATH):
        try:
            df = preprocessor.load_from_path(ACTIVE_CSV_PATH)
            df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce').fillna(1).astype(int)
            df['UnitPrice'] = pd.to_numeric(df['UnitPrice'], errors='coerce').fillna(1.0).astype(float)
            df['TotalAmount'] = (df['Quantity'] * df['UnitPrice']).round(2)
            df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'], errors='coerce').fillna(pd.Timestamp.now())
            preprocessor.cleaned_df = df
            if os.path.exists(ACTIVE_SUMMARY_PATH):
                import json
                with open(ACTIVE_SUMMARY_PATH, 'r') as sf:
                    preprocessor.last_summary = json.load(sf)
            return df
        except Exception as e:
            print(f"Warning: Failed to load active_cleaned_dataset.csv: {e}")

    if os.path.exists(DEFAULT_CSV_PATH):
        df = preprocessor.load_from_path(DEFAULT_CSV_PATH)
        cleaned_df, _ = preprocessor.preprocess(df)
        return cleaned_df

    raise HTTPException(status_code=400, detail="No dataset loaded. Please upload a dataset first.")

@app.get("/health")
def health_check():
    has_active = os.path.exists(ACTIVE_CSV_PATH) or preprocessor.cleaned_df is not None
    return {
        "status": "healthy",
        "service": "Python FastAPI Data Mining Service",
        "has_data": has_active or os.path.exists(DEFAULT_CSV_PATH),
        "data_rows": len(preprocessor.cleaned_df) if preprocessor.cleaned_df is not None else 0,
        "active_dataset": "custom_upload" if os.path.exists(ACTIVE_CSV_PATH) else "default_sample"
    }

@app.post("/api/data/inspect")
async def inspect_dataset(file: Optional[UploadFile] = File(None)):
    """
    Inspects CSV or Excel (.xlsx) file headers, detects column mappings,
    and returns raw preview without destructive loading.
    """
    try:
        if file is not None and file.filename != '':
            contents = await file.read()
            df = preprocessor.load_from_bytes(contents, filename=file.filename)
        else:
            if not os.path.exists(DEFAULT_CSV_PATH):
                raise HTTPException(status_code=404, detail="Default sample CSV not found.")
            df = preprocessor.load_from_path(DEFAULT_CSV_PATH)

        inspection = preprocessor.detect_columns(df)
        raw_preview = df.head(10).fillna('').to_dict(orient='records')

        return {
            "success": True,
            "filename": file.filename if file else "online_retail_sample.csv",
            "inspection": inspection,
            "sample_rows": raw_preview
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inspection failed: {str(e)}")

@app.post("/api/data/preprocess")
async def preprocess_dataset(
    file: Optional[UploadFile] = File(None),
    mapping: Optional[str] = Form(None)
):
    """
    Accepts CSV or Excel (.xlsx) upload or loads default dataset.
    Applies custom or auto-detected column mapping, executes full cleaning pipeline,
    and returns audit metrics.
    """
    import json
    try:
        column_mapping = None
        if mapping:
            try:
                column_mapping = json.loads(mapping)
            except Exception:
                column_mapping = None

        if file is not None and file.filename != '':
            contents = await file.read()
            df = preprocessor.load_from_bytes(contents, filename=file.filename)
        else:
            if not os.path.exists(DEFAULT_CSV_PATH):
                raise HTTPException(status_code=404, detail="Default sample CSV not found.")
            df = preprocessor.load_from_path(DEFAULT_CSV_PATH)

        cleaned_df, summary = preprocessor.preprocess(df, mapping=column_mapping)

        preview_records = cleaned_df.head(50).fillna('').to_dict(orient='records')
        # Serialize timestamps
        for rec in preview_records:
            if 'InvoiceDate' in rec and isinstance(rec['InvoiceDate'], pd.Timestamp):
                rec['InvoiceDate'] = rec['InvoiceDate'].strftime('%Y-%m-%d %H:%M:%S')

        return {
            "success": True,
            "message": "Dataset preprocessed successfully.",
            "summary": summary,
            "preview": preview_records
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preprocessing failed: {str(e)}")

@app.get("/api/data/preview")
def get_dataset_preview(limit: int = 50):
    df = get_current_df()
    preview = df.head(limit).fillna('').to_dict(orient='records')
    for rec in preview:
        if 'InvoiceDate' in rec and isinstance(rec['InvoiceDate'], pd.Timestamp):
            rec['InvoiceDate'] = rec['InvoiceDate'].strftime('%Y-%m-%d %H:%M:%S')
    return {
        "total_records": len(df),
        "preview": preview,
        "summary": preprocessor.last_summary
    }

@app.post("/api/data/star-schema")
def generate_star_schema_data():
    """
    Transforms the cleaned dataset into Star Schema records
    (dim_customer, dim_product, dim_date, fact_sales).
    """
    try:
        df = get_current_df()
        schema_data = StarSchemaGenerator.generate_star_schema(df)
        return {
            "success": True,
            "data": schema_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Star schema generation failed: {str(e)}")

@app.post("/api/ml/regression")
def run_regression_analysis():
    """
    Executes Simple Linear Regression and Multiple Linear Regression.
    """
    try:
        df = get_current_df()
        result = RegressionAnalytics.run_regression(df)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Regression failed: {str(e)}")

@app.post("/api/ml/naive-bayes")
def run_naive_bayes_classification():
    """
    Executes Gaussian Naive Bayes classification with confusion matrix and metrics.
    """
    try:
        df = get_current_df()
        result = NaiveBayesClassifier.run_classification(df)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Naive Bayes failed: {str(e)}")

class ClusteringRequest(BaseModel):
    n_clusters: Optional[int] = 3

@app.post("/api/ml/clustering")
def run_customer_segmentation(req: ClusteringRequest = None):
    """
    Computes RFM analysis and runs K-Means & Agglomerative clustering.
    """
    try:
        df = get_current_df()
        k = req.n_clusters if req and req.n_clusters else 3
        result = CustomerSegmentation.run_rfm_clustering(df, n_clusters=k)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {str(e)}")

class AprioriRequest(BaseModel):
    min_support: Optional[float] = 0.03
    min_confidence: Optional[float] = 0.2

@app.post("/api/ml/apriori")
def run_apriori_rules(req: AprioriRequest = None):
    """
    Mines Frequent Itemsets and Association Rules via Apriori.
    """
    try:
        df = get_current_df()
        sup = req.min_support if req and req.min_support else 0.03
        conf = req.min_confidence if req and req.min_confidence else 0.2
        result = AprioriMining.run_apriori(df, min_support=sup, min_confidence=conf)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Apriori failed: {str(e)}")

class RecommendRequest(BaseModel):
    stock_code: str
    top_n: Optional[int] = 5

@app.post("/api/ml/recommend")
def recommend_products(req: RecommendRequest):
    """
    Recommends products based on mined Apriori association rules.
    """
    try:
        df = get_current_df()
        top_n = req.top_n if req.top_n else 5
        result = ProductRecommender.get_recommendations(df, stock_code=req.stock_code, top_n=top_n)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

@app.get("/api/ml/comparison")
def compare_algorithms():
    """
    Returns an objective comparison of algorithms:
    - K-Means vs Agglomerative Hierarchical Clustering
    - Simple Linear vs Multiple Linear Regression
    """
    try:
        df = get_current_df()
        clustering_res = CustomerSegmentation.run_rfm_clustering(df, n_clusters=3)
        regression_res = RegressionAnalytics.run_regression(df)
        nb_res = NaiveBayesClassifier.run_classification(df)

        comparison_payload = {
            "clustering_comparison": clustering_res["comparison"],
            "regression_comparison": {
                "models": ["Simple Linear Regression", "Multiple Linear Regression"],
                "metrics": [
                    {
                        "metric": "MAE (Mean Absolute Error)",
                        "simple": regression_res["simple_regression"]["metrics"]["mae"],
                        "multiple": regression_res["multiple_regression"]["metrics"]["mae"]
                    },
                    {
                        "metric": "MSE (Mean Squared Error)",
                        "simple": regression_res["simple_regression"]["metrics"]["mse"],
                        "multiple": regression_res["multiple_regression"]["metrics"]["mse"]
                    },
                    {
                        "metric": "RMSE (Root Mean Squared Error)",
                        "simple": regression_res["simple_regression"]["metrics"]["rmse"],
                        "multiple": regression_res["multiple_regression"]["metrics"]["rmse"]
                    },
                    {
                        "metric": "R² Score (Coefficient of Determination)",
                        "simple": regression_res["simple_regression"]["metrics"]["r2_score"],
                        "multiple": regression_res["multiple_regression"]["metrics"]["r2_score"]
                    }
                ],
                "viva_explanation": "Multiple Linear Regression leverages additional dimensions (UnitPrice, Month) to capture more variance, typically leading to a higher R² score."
            },
            "classification_summary": {
                "algorithm": nb_res["algorithm"],
                "target": nb_res["target_variable"],
                "accuracy": nb_res["overall_metrics"]["accuracy"],
                "f1_score": nb_res["overall_metrics"]["f1_macro"]
            }
        }
        return {"success": True, "data": comparison_payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
