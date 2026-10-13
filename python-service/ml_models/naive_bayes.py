import pandas as pd
import numpy as np
from sklearn.naive_bayes import GaussianNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
from typing import Dict, Any

class NaiveBayesClassifier:
    """
    Supervised classification using Gaussian Naive Bayes algorithm.
    Predicts customer value tier ('Low Spender', 'Medium Spender', 'High Spender')
    based on RFM features derived from actual transactions.
    Calculates Accuracy, Precision, Recall, F1, and Confusion Matrix.
    """

    @staticmethod
    def run_classification(cleaned_df: pd.DataFrame) -> Dict[str, Any]:
        df = cleaned_df.copy()

        # Ensure types
        df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce')
        df['UnitPrice'] = pd.to_numeric(df['UnitPrice'], errors='coerce')
        df['TotalAmount'] = (df['Quantity'] * df['UnitPrice']).round(2)
        df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])

        # Aggregate RFM features per Customer
        max_date = df['InvoiceDate'].max()
        rfm = df.groupby('CustomerID').agg({
            'InvoiceDate': lambda x: (max_date - x.max()).days, # Recency
            'InvoiceNo': 'nunique',                             # Frequency
            'TotalAmount': 'sum'                                # Monetary
        }).reset_index()

        rfm.columns = ['CustomerID', 'Recency', 'Frequency', 'Monetary']
        rfm = rfm[(rfm['Monetary'] > 0) & (rfm['Frequency'] > 0)]

        if len(rfm) < 6:
            # Fallback to row-level transaction classification if very few customers
            df['OrderValue'] = df['TotalAmount']
            q33 = df['OrderValue'].quantile(0.33)
            q66 = df['OrderValue'].quantile(0.66)

            def assign_tier(val):
                if val <= q33: return 'Low Tier'
                elif val <= q66: return 'Medium Tier'
                else: return 'High Tier'

            df['Tier'] = df['OrderValue'].apply(assign_tier)
            X = df[['Quantity', 'UnitPrice']]
            y = df['Tier']
        else:
            # Derive 3 customer segments based on Monetary quantiles
            q33 = rfm['Monetary'].quantile(0.33)
            q66 = rfm['Monetary'].quantile(0.66)

            def assign_rfm_tier(val):
                if val <= q33: return 'Low Tier'
                elif val <= q66: return 'Medium Tier'
                else: return 'High Tier'

            rfm['Tier'] = rfm['Monetary'].apply(assign_rfm_tier)
            X = rfm[['Recency', 'Frequency', 'Monetary']]
            y = rfm['Tier']

        classes = sorted(list(y.unique()))

        # Train / Test split
        test_size = 0.3 if len(y) >= 15 else 0.2
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y if y.value_counts().min() > 1 else None
        )

        model = GaussianNB()
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        prec_macro = precision_score(y_test, y_pred, average='macro', zero_division=0)
        rec_macro = recall_score(y_test, y_pred, average='macro', zero_division=0)
        f1_macro = f1_score(y_test, y_pred, average='macro', zero_division=0)

        prec_weighted = precision_score(y_test, y_pred, average='weighted', zero_division=0)
        rec_weighted = recall_score(y_test, y_pred, average='weighted', zero_division=0)
        f1_weighted = f1_score(y_test, y_pred, average='weighted', zero_division=0)

        cm = confusion_matrix(y_test, y_pred, labels=classes)
        # Format CM for frontend grid
        cm_matrix = cm.tolist()

        # Detailed per-class metrics
        report = classification_report(y_test, y_pred, labels=classes, output_dict=True, zero_division=0)
        class_metrics = []
        for cls in classes:
            if cls in report:
                class_metrics.append({
                    "class_name": cls,
                    "precision": round(float(report[cls]['precision']), 4),
                    "recall": round(float(report[cls]['recall']), 4),
                    "f1_score": round(float(report[cls]['f1-score']), 4),
                    "support": int(report[cls]['support'])
                })

        # Test sample predictions preview
        test_sample = X_test.copy()
        test_sample['actual'] = y_test
        test_sample['predicted'] = y_pred
        sample_records = test_sample.head(25).to_dict(orient='records')

        return {
            "algorithm": "Gaussian Naive Bayes (Probabilistic Classifier)",
            "target_variable": "Customer Spending Tier",
            "features_used": list(X.columns),
            "classes": classes,
            "overall_metrics": {
                "accuracy": round(float(acc), 4),
                "precision_macro": round(float(prec_macro), 4),
                "recall_macro": round(float(rec_macro), 4),
                "f1_macro": round(float(f1_macro), 4),
                "precision_weighted": round(float(prec_weighted), 4),
                "recall_weighted": round(float(rec_weighted), 4),
                "f1_weighted": round(float(f1_weighted), 4)
            },
            "confusion_matrix": {
                "labels": classes,
                "matrix": cm_matrix
            },
            "class_metrics": class_metrics,
            "sample_predictions": sample_records,
            "dataset_split": {
                "train_size": len(X_train),
                "test_size": len(X_test),
                "total_records": len(X)
            },
            "viva_explanation": {
                "bayes_theorem": "P(Class | Features) = [P(Features | Class) * P(Class)] / P(Features)",
                "naive_assumption": "Assumes feature conditional independence given the class label.",
                "confusion_matrix": "Visualizes true positive, false positive, true negative, and false negative predictions."
            }
        }
