import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api';
import StatCard from '../components/StatCard';
import { Binary, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function NaiveBayesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNaiveBayes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getNaiveBayes();
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to compute Naive Bayes model. Ensure Python engine is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNaiveBayes();
  }, []);

  const metrics = data?.overall_metrics;
  const cm = data?.confusion_matrix;
  const classMetrics = data?.class_metrics || [];
  const samples = data?.sample_predictions || [];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Gaussian Naive Bayes Classification</h2>
          <p className="page-desc">
            Supervised probabilistic classification predicting customer purchasing value tiers from RFM attributes.
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchNaiveBayes} disabled={loading}>
          <RefreshCw size={15} />
          Re-evaluate Model
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', backgroundColor: '#fef2f2', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>Training Naive Bayes classifier & computing confusion matrix...</div>
      ) : data ? (
        <>
          {/* Key Classification Metrics */}
          <div className="stats-grid">
            <StatCard
              label="Classification Accuracy"
              value={`${(metrics.accuracy * 100).toFixed(2)}%`}
              desc="Overall correct predictions"
              badge="Top Metric"
              badgeType="badge-green"
            />
            <StatCard
              label="Macro Precision"
              value={`${(metrics.precision_macro * 100).toFixed(2)}%`}
              desc="Average precision across classes"
            />
            <StatCard
              label="Macro Recall"
              value={`${(metrics.recall_macro * 100).toFixed(2)}%`}
              desc="Average recall across classes"
            />
            <StatCard
              label="Macro F1-Score"
              value={`${(metrics.f1_macro * 100).toFixed(2)}%`}
              desc="Harmonic mean of precision & recall"
              badge="Balanced"
              badgeType="badge-blue"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>

            {/* Confusion Matrix Card */}
            <div className="card">
              <h3 className="card-title">
                <Binary size={18} color="var(--accent-primary)" />
                Empirical Confusion Matrix
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Rows denote True Actual Classes; Columns denote Predicted Classes.
              </p>

              {cm && (
                <div className="table-responsive">
                  <table className="data-table" style={{ textAlign: 'center' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Actual \ Predicted</th>
                        {cm.labels.map(lbl => (
                          <th key={lbl} style={{ textAlign: 'center' }}>{lbl}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cm.matrix.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          <td style={{ textAlign: 'left', fontWeight: 600 }}>{cm.labels[rowIdx]}</td>
                          {row.map((cellVal, colIdx) => (
                            <td
                              key={colIdx}
                              style={{
                                fontWeight: 700,
                                backgroundColor: rowIdx === colIdx && cellVal > 0 ? '#dbeafe' : 'transparent',
                                color: rowIdx === colIdx ? 'var(--accent-primary)' : 'inherit'
                              }}
                            >
                              {cellVal}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Class-wise Metrics Table */}
            <div className="card">
              <h3 className="card-title">Per-Class Detailed Evaluation</h3>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th style={{ textAlign: 'right' }}>Precision</th>
                      <th style={{ textAlign: 'right' }}>Recall</th>
                      <th style={{ textAlign: 'right' }}>F1-Score</th>
                      <th style={{ textAlign: 'right' }}>Support (Test N)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classMetrics.map((cls, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{cls.class_name}</td>
                        <td style={{ textAlign: 'right' }}>{(cls.precision * 100).toFixed(1)}%</td>
                        <td style={{ textAlign: 'right' }}>{(cls.recall * 100).toFixed(1)}%</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-primary)' }}>
                          {(cls.f1_score * 100).toFixed(1)}%
                        </td>
                        <td style={{ textAlign: 'right' }}>{cls.support}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Sample Test Predictions */}
          <div className="card">
            <h3 className="card-title">Sample Test Case Predictions</h3>
            <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer Features</th>
                    <th>True Actual Tier</th>
                    <th>Naive Bayes Prediction</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s, idx) => {
                    const match = s.actual === s.predicted;
                    return (
                      <tr key={idx}>
                        <td>
                          {s.Recency !== undefined ? `Recency: ${s.Recency}d, Freq: ${s.Frequency}, Spend: $${s.Monetary}` : `Qty: ${s.Quantity}, Price: $${s.UnitPrice}`}
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.actual}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{s.predicted}</td>
                        <td>
                          <span className={`badge ${match ? 'badge-green' : 'badge-red'}`}>
                            {match ? 'CORRECT' : 'MISCLASSIFIED'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
