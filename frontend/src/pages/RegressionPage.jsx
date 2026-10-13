import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api';
import StatCard from '../components/StatCard';
import VivaNote from '../components/VivaNote';
import { TrendingUp, RefreshCw, Calculator } from 'lucide-react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function RegressionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRegression = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getRegression();
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to compute regression models. Ensure Python service and data are loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegression();
  }, []);

  const simple = data?.simple_regression;
  const multi = data?.multiple_regression;

  // Scatter data for Simple Linear Regression
  const scatterData = {
    datasets: [
      {
        label: 'Actual Transactions (Quantity vs Total Amount)',
        data: simple?.scatter_points?.map(p => ({ x: p.quantity, y: p.actual_total })) || [],
        backgroundColor: '#3b82f6',
        pointRadius: 4,
      },
      {
        label: 'Fitted Regression Line',
        data: simple?.regression_line?.map(p => ({ x: p.quantity, y: p.predicted_total })) || [],
        type: 'line',
        borderColor: '#1e40af',
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
      }
    ]
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: { display: true, text: 'Quantity (Units)', font: { family: 'Inter', size: 12 } },
        grid: { color: '#f1f5f9' }
      },
      y: {
        title: { display: true, text: 'Total Amount ($)', font: { family: 'Inter', size: 12 } },
        grid: { color: '#f1f5f9' }
      }
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Linear Regression Predictive Modeling</h2>
          <p className="page-desc">
            Continuous numeric target estimation comparing Simple Linear Regression against Multiple Linear Regression.
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchRegression} disabled={loading}>
          <RefreshCw size={15} />
          Re-train Models
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', backgroundColor: '#fef2f2', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>Computing real regression models & metrics...</div>
      ) : data ? (
        <>
          {/* Section 1: Simple Linear Regression */}
          <div className="card">
            <h3 className="card-title">
              <Calculator size={18} color="var(--accent-primary)" />
              1. Simple Linear Regression: <code>Quantity &rarr; TotalAmount</code>
            </h3>

            <div style={{ padding: '10px 14px', backgroundColor: 'var(--accent-light)', borderRadius: '6px', marginBottom: '16px', fontFamily: 'monospace', fontSize: '13px', color: '#1e3a8a' }}>
              <strong>Fitted Equation:</strong> {simple?.equation}
            </div>

            <div className="stats-grid">
              <StatCard label="MAE (Mean Absolute Error)" value={`$${simple?.metrics.mae}`} desc="Average absolute deviation" />
              <StatCard label="MSE (Mean Squared Error)" value={String(simple?.metrics.mse)} desc="Mean squared deviation" />
              <StatCard label="RMSE (Root Mean Squared Error)" value={`$${simple?.metrics.rmse}`} desc="Standard deviation of residuals" />
              <StatCard label="R² Score (Variance Explained)" value={`${(simple?.metrics.r2_score * 100).toFixed(2)}%`} desc={`R² = ${simple?.metrics.r2_score}`} badge="Goodness of Fit" badgeType="badge-green" />
            </div>

            <div style={{ height: '320px', marginTop: '16px' }}>
              <Scatter data={scatterData} options={scatterOptions} />
            </div>
          </div>

          {/* Section 2: Multiple Linear Regression */}
          <div className="card">
            <h3 className="card-title">
              <Calculator size={18} color="var(--accent-primary)" />
              2. Multiple Linear Regression: <code>[Quantity, UnitPrice, Month] &rarr; TotalAmount</code>
            </h3>

            <div style={{ padding: '10px 14px', backgroundColor: 'var(--accent-light)', borderRadius: '6px', marginBottom: '16px', fontFamily: 'monospace', fontSize: '13px', color: '#1e3a8a' }}>
              <strong>Fitted Equation:</strong> {multi?.equation}
            </div>

            <div className="stats-grid">
              <StatCard label="MAE (Mean Absolute Error)" value={`$${multi?.metrics.mae}`} desc="Average absolute error" />
              <StatCard label="MSE (Mean Squared Error)" value={String(multi?.metrics.mse)} desc="Mean squared error" />
              <StatCard label="RMSE (Root Mean Squared Error)" value={`$${multi?.metrics.rmse}`} desc="Root mean squared error" />
              <StatCard label="R² Score" value={`${(multi?.metrics.r2_score * 100).toFixed(2)}%`} desc={`R² = ${multi?.metrics.r2_score}`} badge="Multi-variable" badgeType="badge-green" />
            </div>

            {/* Actual vs Predicted Table Sample */}
            <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '16px 0 10px 0' }}>Actual vs. Predicted Holdout Evaluation (Test Set)</h4>
            <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Actual Total ($)</th>
                    <th style={{ textAlign: 'right' }}>Predicted Total ($)</th>
                    <th style={{ textAlign: 'right' }}>Residual Error ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {multi?.actual_vs_predicted?.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.quantity}</td>
                      <td>${row.unit_price.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>${row.actual.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-primary)' }}>${row.predicted.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: Math.abs(row.residual) > 5 ? 'var(--danger)' : 'var(--success)' }}>
                        {row.residual > 0 ? `+${row.residual.toFixed(2)}` : row.residual.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      <VivaNote title="DWM Viva Focus: Evaluation Metrics for Regression">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <div>
            <strong>MAE:</strong> (1/n) &Sigma; |y - &ycirc;| &mdash; Average magnitude of errors without penalizing outliers disproportionately.
          </div>
          <div>
            <strong>MSE:</strong> (1/n) &Sigma; (y - &ycirc;)&sup2; &mdash; Squares errors, penalizing large discrepancies heavily.
          </div>
          <div>
            <strong>RMSE:</strong> &radic;(MSE) &mdash; Brings the metric back into original dollar units ($).
          </div>
          <div>
            <strong>R² Score:</strong> 1 - [SS_res / SS_tot] &mdash; Proportion of variance in target explained by predictors.
          </div>
        </div>
      </VivaNote>
    </div>
  );
}
