import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api';
import StatCard from '../components/StatCard';
import { GitCompare, RefreshCw, Scale } from 'lucide-react';

export default function ComparisonPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getComparison();
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch algorithm comparison. Ensure backend and Python service are active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, []);

  const clusterComp = data?.clustering_comparison;
  const regComp = data?.regression_comparison;
  const clsSummary = data?.classification_summary;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Comparative Analysis of Data Mining Algorithms</h2>
          <p className="page-desc">
            Rigorous, objective empirical evaluation without artificial preference.
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchComparison} disabled={loading}>
          <RefreshCw size={15} />
          Re-evaluate Benchmarks
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', backgroundColor: '#fef2f2', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>Evaluating side-by-side performance benchmarks...</div>
      ) : data ? (
        <>
          {/* Section 1: Clustering Algorithm Comparison */}
          <div className="card">
            <h3 className="card-title">
              <Scale size={18} color="var(--accent-primary)" />
              1. Unsupervised Clustering: K-Means vs. Agglomerative Hierarchical
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Both algorithms were executed on identical StandardScaler-normalized RFM customer features with k = {clusterComp?.parameters?.n_clusters || 3}.
            </p>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Evaluation Metric / Dimension</th>
                    <th style={{ textAlign: 'right' }}>K-Means Clustering</th>
                    <th style={{ textAlign: 'right' }}>Agglomerative Hierarchical</th>
                    <th>Interpretation & Trade-off</th>
                  </tr>
                </thead>
                <tbody>
                  {clusterComp?.metrics?.map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{m.metric_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {String(m.kmeans_value)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                        {String(m.agglomerative_value)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.description}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 600 }}>Time Complexity</td>
                    <td style={{ textAlign: 'right' }}>O(n * k * t) (Linear with n)</td>
                    <td style={{ textAlign: 'right' }}>O(n² log n) (Quadratic with n)</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>K-Means scales to large datasets; Agglomerative becomes slow on big data.</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Determinism</td>
                    <td style={{ textAlign: 'right' }}>Stochastic (Depends on random seeds)</td>
                    <td style={{ textAlign: 'right' }}>Deterministic (Unique dendrogram)</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Agglomerative guarantees identical outputs for fixed linkage criteria.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Regression Comparison */}
          <div className="card">
            <h3 className="card-title">
              <Scale size={18} color="var(--accent-primary)" />
              2. Regression Models: Simple vs. Multiple Linear Regression
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Comparison of single predictor (Quantity) versus multi-dimensional predictors ([Quantity, UnitPrice, Month]) for predicting TotalAmount.
            </p>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Evaluation Metric</th>
                    <th style={{ textAlign: 'right' }}>Simple Linear Regression</th>
                    <th style={{ textAlign: 'right' }}>Multiple Linear Regression</th>
                    <th>Superior Model Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {regComp?.metrics?.map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{m.metric}</td>
                      <td style={{ textAlign: 'right' }}>{m.simple}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>{m.multiple}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {m.metric.includes('R²') ? 'Higher R² indicates greater variance explained' : 'Lower error signifies tighter prediction bounds'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Summary of Supervised Classification */}
          {clsSummary && (
            <div className="card">
              <h3 className="card-title">3. Supervised Classification Benchmark Summary</h3>
              <div className="stats-grid">
                <StatCard label="Classifier" value={clsSummary.algorithm} desc="Target: Customer Value Tier" />
                <StatCard label="Accuracy" value={`${(clsSummary.accuracy * 100).toFixed(2)}%`} desc="Empirical test accuracy" badge="Holdout Tested" badgeType="badge-green" />
                <StatCard label="Macro F1-Score" value={`${(clsSummary.f1_score * 100).toFixed(2)}%`} desc="Balanced harmonic score" />
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
