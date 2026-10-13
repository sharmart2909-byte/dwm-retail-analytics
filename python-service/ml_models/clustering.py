import pandas as pd
import numpy as np
import time
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.metrics import silhouette_score, davies_bouldin_score
from typing import Dict, Any

class CustomerSegmentation:
    """
    Computes RFM (Recency, Frequency, Monetary) metrics per customer,
    applies StandardScaler normalization, and performs both:
    1. K-Means Clustering (with Elbow method and Silhouette score)
    2. Agglomerative Hierarchical Clustering (with Silhouette score)
    3. Objective, unbiased algorithm comparison without artificial winners.
    """

    @staticmethod
    def run_rfm_clustering(cleaned_df: pd.DataFrame, n_clusters: int = 3) -> Dict[str, Any]:
        df = cleaned_df.copy()

        # Ensure datatypes
        df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce')
        df['UnitPrice'] = pd.to_numeric(df['UnitPrice'], errors='coerce')
        df['TotalAmount'] = (df['Quantity'] * df['UnitPrice']).round(2)
        df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])

        # Aggregate RFM per customer
        max_date = df['InvoiceDate'].max()
        rfm = df.groupby('CustomerID').agg({
            'InvoiceDate': lambda x: (max_date - x.max()).days, # Recency
            'InvoiceNo': 'nunique',                             # Frequency
            'TotalAmount': 'sum'                                # Monetary
        }).reset_index()

        rfm.columns = ['CustomerID', 'Recency', 'Frequency', 'Monetary']
        rfm['Recency'] = rfm['Recency'].astype(int)
        rfm['Frequency'] = rfm['Frequency'].astype(int)
        rfm['Monetary'] = rfm['Monetary'].round(2)

        # Filter out non-positive RFM
        rfm = rfm[(rfm['Monetary'] > 0) & (rfm['Frequency'] > 0)].copy()

        num_customers = len(rfm)
        if num_customers < 4:
            raise ValueError(f"Insufficient customers ({num_customers}) for clustering.")

        # Cap n_clusters if dataset is small
        actual_k = min(n_clusters, max(2, num_customers - 1))

        # Scaling
        scaler = StandardScaler()
        rfm_scaled = scaler.fit_transform(rfm[['Recency', 'Frequency', 'Monetary']])

        # =================================================================
        # Elbow Method: compute inertia for k=2..min(8, num_customers - 1)
        # =================================================================
        elbow_data = []
        max_k = min(8, num_customers - 1)
        for k in range(2, max_k + 1):
            km_temp = KMeans(n_clusters=k, random_state=42, n_init=10)
            km_temp.fit(rfm_scaled)
            sil = float(silhouette_score(rfm_scaled, km_temp.labels_)) if k < num_customers else 0.0
            elbow_data.append({
                "k": k,
                "inertia": round(float(km_temp.inertia_), 2),
                "silhouette": round(sil, 4)
            })

        # =================================================================
        # 1. K-Means Clustering
        # =================================================================
        t0_km = time.perf_counter()
        kmeans = KMeans(n_clusters=actual_k, random_state=42, n_init=10)
        km_labels = kmeans.fit_predict(rfm_scaled)
        t_km = (time.perf_counter() - t0_km) * 1000.0  # ms

        km_silhouette = float(silhouette_score(rfm_scaled, km_labels)) if actual_k < num_customers else 0.0
        km_db_index = float(davies_bouldin_score(rfm_scaled, km_labels)) if actual_k < num_customers else 0.0

        rfm_km = rfm.copy()
        rfm_km['Cluster'] = km_labels

        # Centroids (inverse scaled for real-world interpretation)
        unscaled_centroids = scaler.inverse_transform(kmeans.cluster_centers_)
        km_centroids = []
        for i in range(actual_k):
            cluster_subset = rfm_km[rfm_km['Cluster'] == i]
            km_centroids.append({
                "cluster_id": i,
                "count": len(cluster_subset),
                "avg_recency": round(float(unscaled_centroids[i][0]), 2),
                "avg_frequency": round(float(unscaled_centroids[i][1]), 2),
                "avg_monetary": round(float(unscaled_centroids[i][2]), 2),
                "suggested_profile": (
                    "High-Value Champions" if unscaled_centroids[i][2] >= rfm['Monetary'].median() and unscaled_centroids[i][0] <= rfm['Recency'].median()
                    else ("At-Risk Inactive" if unscaled_centroids[i][0] > rfm['Recency'].median()
                    else "Active / Occasional")
                )
            })

        # =================================================================
        # 2. Agglomerative Hierarchical Clustering
        # =================================================================
        t0_agg = time.perf_counter()
        agg = AgglomerativeClustering(n_clusters=actual_k, linkage='ward')
        agg_labels = agg.fit_predict(rfm_scaled)
        t_agg = (time.perf_counter() - t0_agg) * 1000.0  # ms

        agg_silhouette = float(silhouette_score(rfm_scaled, agg_labels)) if actual_k < num_customers else 0.0
        agg_db_index = float(davies_bouldin_score(rfm_scaled, agg_labels)) if actual_k < num_customers else 0.0

        rfm_agg = rfm.copy()
        rfm_agg['Cluster'] = agg_labels
        agg_centroids = []
        for i in range(actual_k):
            sub = rfm_agg[rfm_agg['Cluster'] == i]
            agg_centroids.append({
                "cluster_id": i,
                "count": len(sub),
                "avg_recency": round(float(sub['Recency'].mean()), 2) if len(sub) > 0 else 0,
                "avg_frequency": round(float(sub['Frequency'].mean()), 2) if len(sub) > 0 else 0,
                "avg_monetary": round(float(sub['Monetary'].mean()), 2) if len(sub) > 0 else 0
            })

        # Customer scatter points for 2D/3D visualization
        scatter_points = []
        for idx, row in rfm_km.iterrows():
            scatter_points.append({
                "customer_id": str(row['CustomerID']),
                "recency": int(row['Recency']),
                "frequency": int(row['Frequency']),
                "monetary": round(float(row['Monetary']), 2),
                "kmeans_cluster": int(row['Cluster']),
                "agglomerative_cluster": int(agg_labels[idx])
            })

        # =================================================================
        # 3. Objective Algorithm Comparison (No artificial winner declared!)
        # =================================================================
        comparison = {
            "algorithms": ["K-Means Clustering", "Agglomerative Hierarchical Clustering"],
            "parameters": {"n_clusters": actual_k, "scaler": "StandardScaler"},
            "metrics": [
                {
                    "metric_name": "Silhouette Score (-1 to +1, higher is better)",
                    "kmeans_value": round(km_silhouette, 4),
                    "agglomerative_value": round(agg_silhouette, 4),
                    "description": "Measures how similar an object is to its own cluster compared to other clusters."
                },
                {
                    "metric_name": "Davies-Bouldin Index (lower is better)",
                    "kmeans_value": round(km_db_index, 4),
                    "agglomerative_value": round(agg_db_index, 4),
                    "description": "Evaluates the average similarity between each cluster and its most similar one."
                },
                {
                    "metric_name": "Execution Time (ms)",
                    "kmeans_value": round(t_km, 2),
                    "agglomerative_value": round(t_agg, 2),
                    "description": "Computational execution duration for convergence."
                },
                {
                    "metric_name": "Cluster Compactness / Inertia",
                    "kmeans_value": round(float(kmeans.inertia_), 2),
                    "agglomerative_value": "N/A (Hierarchical)",
                    "description": "Sum of squared distances of samples to their closest cluster center."
                }
            ],
            "viva_notes": {
                "kmeans": "Partitioning algorithm minimizing sum of squared errors; sensitive to initial centroid placement; fast for large data.",
                "agglomerative": "Bottom-up hierarchical clustering grouping pairs based on linkage; produces dendrogram structure; deterministic without random initialization."
            }
        }

        return {
            "n_clusters": actual_k,
            "total_customers": num_customers,
            "elbow_data": elbow_data,
            "kmeans": {
                "algorithm": "K-Means Clustering",
                "inertia": round(float(kmeans.inertia_), 2),
                "silhouette_score": round(km_silhouette, 4),
                "davies_bouldin_index": round(km_db_index, 4),
                "execution_time_ms": round(t_km, 2),
                "centroids": km_centroids
            },
            "agglomerative": {
                "algorithm": "Agglomerative Hierarchical Clustering",
                "linkage": "ward",
                "silhouette_score": round(agg_silhouette, 4),
                "davies_bouldin_index": round(agg_db_index, 4),
                "execution_time_ms": round(t_agg, 2),
                "clusters": agg_centroids
            },
            "comparison": comparison,
            "customer_points": scatter_points[:150]  # Sample first 150 for responsive rendering
        }
