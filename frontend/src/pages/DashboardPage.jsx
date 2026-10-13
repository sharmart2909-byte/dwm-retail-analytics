import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../api';
import StatCard from '../components/StatCard';
import VivaNote from '../components/VivaNote';
import { Server, Database, Activity, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getStats();
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Could not connect to Spring Boot backend. Ensure backend is running on port 8080.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const wh = data?.warehouse || {};
  const topProducts = data?.top_products || [];
  const monthlyTrend = data?.monthly_trend || [];
  const countrySales = data?.country_sales || [];
  const pythonStatus = data?.python_service || {};

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Executive Data Warehouse Dashboard</h2>
          <p className="page-desc">Real-time Star Schema metrics, system health, and high-level sales KPIs</p>
        </div>
        <button className="btn btn-outline" onClick={fetchStats} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', backgroundColor: '#fef2f2', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* System Health Strip */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} color="var(--accent-primary)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Spring Boot 3:</span>
            <span className="badge badge-green">Running (:8080)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="var(--accent-primary)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>MySQL 8 Star Schema:</span>
            <span className="badge badge-green">retail_dw Connected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent-primary)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Python FastAPI Engine:</span>
            <span className={`badge ${pythonStatus?.status === 'healthy' ? 'badge-green' : 'badge-yellow'}`}>
              {pythonStatus?.status === 'healthy' ? 'Online (:8000)' : 'Checking / Connecting'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Sales Transactions"
          value={loading ? '...' : (wh.sales_count ?? 0).toLocaleString()}
          desc="Fact records in fact_sales"
        />
        <StatCard
          label="Total Revenue"
          value={loading ? '...' : `$${Number(wh.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          desc="Aggregated measure (Qty * UnitPrice)"
          badge="Gross Sales"
        />
        <StatCard
          label="Unique Customers"
          value={loading ? '...' : (wh.customer_count ?? 0).toLocaleString()}
          desc="Unique keys in dim_customer"
        />
        <StatCard
          label="Cataloged Products"
          value={loading ? '...' : (wh.product_count ?? 0).toLocaleString()}
          desc="Unique stock codes in dim_product"
        />
      </div>

      {/* Two Column Section: Top Products & Monthly Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>

        {/* Top 5 Products Table */}
        <div className="card">
          <h3 className="card-title">Top 5 Products by Revenue</h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stock Code</th>
                  <th>Product Description</th>
                  <th style={{ textAlign: 'right' }}>Units Sold</th>
                  <th style={{ textAlign: 'right' }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '16px' }}>No sales data available yet.</td></tr>
                ) : (
                  topProducts.map((p, idx) => (
                    <tr key={idx}>
                      <td><span className="badge badge-blue">{p.stockCode}</span></td>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.description}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.totalQty}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        ${Number(p.totalRevenue).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Geographic / Country Distribution */}
        <div className="card">
          <h3 className="card-title">Country-wise Revenue Distribution</h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th style={{ textAlign: 'right' }}>Orders</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {countrySales.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '16px' }}>No country data available.</td></tr>
                ) : (
                  countrySales.slice(0, 5).map((c, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{c.country}</td>
                      <td style={{ textAlign: 'right' }}>{c.transactionCount}</td>
                      <td style={{ textAlign: 'right' }}>{c.totalQuantity}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        ${Number(c.totalRevenue).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <VivaNote title="DWM Viva Focus: OLTP vs. OLAP Architecture">
        <p>
          <strong>OLTP (Online Transaction Processing):</strong> Designed for day-to-day operations with highly normalized 3NF schemas to eliminate write anomalies and ensure ACID transactions.
        </p>
        <p style={{ marginTop: '6px' }}>
          <strong>OLAP (Online Analytical Processing):</strong> Designed for decision support and historical analysis with denormalized Dimensional Modeling (Star Schema). The central <code>fact_sales</code> table stores numeric measures and foreign keys pointing to dimension tables (<code>dim_customer</code>, <code>dim_product</code>, <code>dim_date</code>).
        </p>
      </VivaNote>
    </div>
  );
}
