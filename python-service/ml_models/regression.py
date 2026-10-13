import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from typing import Dict, Any

class RegressionAnalytics:
    """
    Performs Simple Linear Regression and Multiple Linear Regression
    on Online Retail transactions with real metrics:
    MAE, MSE, RMSE, R-squared, regression equations, and plot data.
    """

    @staticmethod
    def run_regression(cleaned_df: pd.DataFrame) -> Dict[str, Any]:
        df = cleaned_df.copy()

        # Ensure required columns exist
        df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce')
        df['UnitPrice'] = pd.to_numeric(df['UnitPrice'], errors='coerce')
        df['TotalAmount'] = (df['Quantity'] * df['UnitPrice']).round(2)

        if 'InvoiceDate' in df.columns:
            df['Date_Obj'] = pd.to_datetime(df['InvoiceDate'], errors='coerce')
            df['Month'] = df['Date_Obj'].dt.month.fillna(1)
        else:
            df['Month'] = 1

        # Drop any remaining nulls or zeros
        clean_reg_df = df.dropna(subset=['Quantity', 'UnitPrice', 'TotalAmount', 'Month'])
        clean_reg_df = clean_reg_df[(clean_reg_df['Quantity'] > 0) & (clean_reg_df['UnitPrice'] > 0)]

        if len(clean_reg_df) < 10:
            raise ValueError("Insufficient data points for regression modeling.")

        # =================================================================
        # 1. Simple Linear Regression: Quantity (X) -> TotalAmount (Y)
        # =================================================================
        X_simple = clean_reg_df[['Quantity']]
        y = clean_reg_df['TotalAmount']

        X_train_s, X_test_s, y_train_s, y_test_s = train_test_split(
            X_simple, y, test_size=0.25, random_state=42
        )

        model_simple = LinearRegression()
        model_simple.fit(X_train_s, y_train_s)

        y_pred_s = model_simple.predict(X_test_s)

        mae_s = mean_absolute_error(y_test_s, y_pred_s)
        mse_s = mean_squared_error(y_test_s, y_pred_s)
        rmse_s = np.sqrt(mse_s)
        r2_s = r2_score(y_test_s, y_pred_s)

        slope_s = float(model_simple.coef_[0])
        intercept_s = float(model_simple.intercept_)

        # Prepare scatter plot points (sample if large to keep response snappy)
        scatter_sample = clean_reg_df.sample(min(100, len(clean_reg_df)), random_state=42)
        scatter_points = [
            {"quantity": int(row['Quantity']), "actual_total": round(float(row['TotalAmount']), 2)}
            for _, row in scatter_sample.iterrows()
        ]

        # Line equation points
        min_q = int(clean_reg_df['Quantity'].min())
        max_q = int(clean_reg_df['Quantity'].max())
        pred_min = model_simple.predict(pd.DataFrame([[min_q]], columns=['Quantity']))[0]
        pred_max = model_simple.predict(pd.DataFrame([[max_q]], columns=['Quantity']))[0]
        line_points = [
            {"quantity": min_q, "predicted_total": round(float(pred_min), 2)},
            {"quantity": max_q, "predicted_total": round(float(pred_max), 2)}
        ]

        simple_result = {
            "model_type": "Simple Linear Regression",
            "independent_variable": "Quantity",
            "dependent_variable": "TotalAmount",
            "equation": f"TotalAmount = {slope_s:.4f} * Quantity + ({intercept_s:.4f})",
            "slope": round(slope_s, 4),
            "intercept": round(intercept_s, 4),
            "metrics": {
                "mae": round(float(mae_s), 4),
                "mse": round(float(mse_s), 4),
                "rmse": round(float(rmse_s), 4),
                "r2_score": round(float(r2_s), 4)
            },
            "scatter_points": scatter_points,
            "regression_line": line_points,
            "train_size": len(X_train_s),
            "test_size": len(X_test_s)
        }

        # =================================================================
        # 2. Multiple Linear Regression: [Quantity, UnitPrice, Month] -> TotalAmount
        # =================================================================
        X_multi = clean_reg_df[['Quantity', 'UnitPrice', 'Month']]
        X_train_m, X_test_m, y_train_m, y_test_m = train_test_split(
            X_multi, y, test_size=0.25, random_state=42
        )

        model_multi = LinearRegression()
        model_multi.fit(X_train_m, y_train_m)

        y_pred_m = model_multi.predict(X_test_m)

        mae_m = mean_absolute_error(y_test_m, y_pred_m)
        mse_m = mean_squared_error(y_test_m, y_pred_m)
        rmse_m = np.sqrt(mse_m)
        r2_m = r2_score(y_test_m, y_pred_m)

        coefs = {
            "Quantity": round(float(model_multi.coef_[0]), 4),
            "UnitPrice": round(float(model_multi.coef_[1]), 4),
            "Month": round(float(model_multi.coef_[2]), 4)
        }
        intercept_m = float(model_multi.intercept_)

        eq_multi = f"TotalAmount = {coefs['Quantity']}*Qty + {coefs['UnitPrice']}*Price + {coefs['Month']}*Month + ({intercept_m:.4f})"

        # Actual vs Predicted comparison points (sample)
        test_df_eval = X_test_m.copy()
        test_df_eval['actual'] = y_test_m
        test_df_eval['predicted'] = y_pred_m
        eval_sample = test_df_eval.head(40)

        actual_vs_pred = [
            {
                "quantity": int(row['Quantity']),
                "unit_price": round(float(row['UnitPrice']), 2),
                "actual": round(float(row['actual']), 2),
                "predicted": round(float(row['predicted']), 2),
                "residual": round(float(row['actual'] - row['predicted']), 2)
            }
            for _, row in eval_sample.iterrows()
        ]

        multi_result = {
            "model_type": "Multiple Linear Regression",
            "independent_variables": ["Quantity", "UnitPrice", "Month"],
            "dependent_variable": "TotalAmount",
            "equation": eq_multi,
            "coefficients": coefs,
            "intercept": round(intercept_m, 4),
            "metrics": {
                "mae": round(float(mae_m), 4),
                "mse": round(float(mse_m), 4),
                "rmse": round(float(rmse_m), 4),
                "r2_score": round(float(r2_m), 4)
            },
            "actual_vs_predicted": actual_vs_pred,
            "train_size": len(X_train_m),
            "test_size": len(X_test_m)
        }

        return {
            "simple_regression": simple_result,
            "multiple_regression": multi_result,
            "viva_explanation": {
                "mae": "Mean Absolute Error: Average magnitude of the errors without direction.",
                "mse": "Mean Squared Error: Penalizes larger prediction errors more severely.",
                "rmse": "Root Mean Squared Error: Interpretable in the same units as Total Amount ($).",
                "r2": "Coefficient of Determination: Proportion of variance in Total Amount explained by independent variables."
            }
        }
