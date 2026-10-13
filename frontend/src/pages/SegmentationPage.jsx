import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api';
import StatCard from '../components/StatCard';
import VivaNote from '../components/VivaNote';
import { Users, RefreshCw, Layers } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function SegmentationPage() {
  const [nClusters, setNClusters] = useState(3);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClustering = async (k) => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getClustering(k);
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to compute clustering models. Ensure Python engine is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClustering(nClusters);
  }, [nClusters]);

  const km = data?.kmeans;
  const agg = data?.agglomerative;
  const elbow = data?.elbow_data || [];
  const points = data?.customer_points || [];

  // Elbow Curve chart
  const elbowChartData = {
    labels: elbow.map(e => `k=${e.k}`),
    datasets: [
      {
        label: 'Inertia (Sum of Squared Distances)',
        data: elbow.map(e => e.inertia),
        borderColor: '#1e40af',
        backgroundColor: '#3b82f6',
        tension: 0.2,
        yAxisID: 'y',
      },
      {
        label: 'Silhouette Score',
        data: elbow.map(e => e.silhouette),
        borderColor: '#16a34a',
        backgroundColor: '#22c55e',
        tension: 0.2,
        yAxisID: 'y1',
      }
    ]
  };

  const elbowOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'Inertia (SSE)' },
        grid: { color: '#f1f5f9' }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: { display: true, text: 'Silhouette (-1 to +1)' },
        grid: { drawOnChartArea: false }
      }
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">RFM Customer Segmentation & Clustering</h2>
          <p className="page-desc">
            Unsupervised partitioning based on Recency (R), Frequency (F), and Monetary (M) values.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600 }}>Number of Clusters (k):</label>
          <select
            className="select-field"
            value={nClusters}
            onChange={(e) => setNClusters(Number(e.target.value))}
          >
            <option value="2">k = 2</option>
            <option value="3">k = 3 (Recommended)</option>
            <option value="4">k = 4</option>
            <option value="5">k = 5</option>
          </select>
          <button className="btn btn-outline" onClick={() => fetchClustering(nClusters)} disabled={loading}>
            <RefreshCw size={15} />
            Re-Cluster
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', backgroundColor: '#fef2f2', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>Calculating customer RFM and clustering partitions...</div>
      ) : data ? (
        <>
          {/* Comparative Metrics Grid */}
          <div className="stats-grid">
            <StatCard
              label="K-Means Silhouette Score"
              value={String(km?.silhouette_score)}
              desc="Cluster cohesion vs separation"
              badge="K-Means"
              badgeType="badge-blue"
            />
            <StatCard
              label="Agglomerative Silhouette"
              value={String(agg?.silhouette_score)}
              desc="Ward linkage cohesion score"
              badge="Hierarchical"
              badgeType="badge-green"
            />
            <StatCard
              label="K-Means Inertia (SSE)"
              value={String(km?.inertia)}
              desc="Sum of squared centroid errors"
            />
            <StatCard
              label="Total Customers Profiled"
              value={String(data?.total_customers)}
              desc="Active accounts in retail_dw"
            />
          </div>

          {/* Elbow Method Chart */}
          <div className="card">
            <h3 className="card-title">Optimal Cluster Selection: Elbow Method & Silhouette Analysis</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              The optimal cluster number <em>k</em> is identified where the rate of decrease in Inertia sharply bends ("elbow") and Silhouette score peaks.
            </p>
            <div style={{ height: '300px' }}>
              <Line data={elbowChartData} options={elbowOptions} />
            </div>
          </div>

          {/* Centroids Breakdown for K-Means */}
          <div className="card">
            <h3 className="card-title">K-Means Segment Centroid Profiles (Unscaled RFM)</h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cluster ID</th>
                    <th>Customer Segment Label</th>
                    <th style={{ textAlign: 'right' }}>Members</th>
                    <th style={{ textAlign: 'right' }}>Avg Recency (Days Ago)</th>
                    <th style={{ textAlign: 'right' }}>Avg Frequency (Orders)</th>
                    <th style={{ textAlign: 'right' }}>Avg Monetary Total ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {km?.centroids?.map((c) => (
                    <tr key={c.cluster_id}>
                      <td><span className="badge badge-blue">Cluster {c.cluster_id}</span></td>
                      <td style={{ fontWeight: 600 }}>{c.suggested_profile}</td>
                      <td style={{ textAlign: 'right' }}>{c.count}</td>
                      <td style={{ textAlign: 'right' }}>{c.avg_recency} days</td>
                      <td style={{ textAlign: 'right' }}>{c.avg_frequency} orders</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        ${c.avg_monetary.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer RFM Sample Table */}
          <div className="card">
            <h3 className="card-title">Customer Cluster Assignment Sample</h3>
            <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th style={{ textAlign: 'right' }}>Recency (Days)</th>
                    <th style={{ textAlign: 'right' }}>Frequency (Invoices)</th>
                    <th style={{ textAlign: 'right' }}>Monetary ($)</th>
                    <th>K-Means Cluster</th>
                    <th>Agglomerative Cluster</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{p.customer_id}</td>
                      <td style={{ textAlign: 'right' }}>{p.recency}</td>
                      <td style={{ textAlign: 'right' }}>{p.frequency}</td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 600 }}>${p.monetary.toFixed(2)}</td>
                      <td><span className="badge badge-blue">Cluster {p.kmeans_cluster}</span></td>
                      <td><span className="badge badge-green">Cluster {p.agglomerative_cluster}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      <VivaNote title="DWM Viva Focus: RFM Metrics & Clustering Comparison">
        <p>
          <strong>RFM Model:</strong> Recency (how recently did the customer buy?), Frequency (how often do they buy?), and Monetary value (how much money do they spend?). StandardScaler ensures features with larger raw scales (Monetary) do not dominate Euclidean distance calculations.
        </p>
        <p style={{ marginTop: '6px' }}>
          <strong>K-Means vs. Agglomerative:</strong> K-Means is a centroid-based partitioning technique with \(O(n \cdot k \cdot t)\) time complexity. Agglomerative is a hierarchical bottom-up method with \(O(n^2 \log n)\) complexity that constructs a dendrogram without requiring random initial seeds.
        </p>
      </VivaNote>
    </div>
  );
}
