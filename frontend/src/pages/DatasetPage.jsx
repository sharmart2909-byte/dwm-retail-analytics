import React, { useState } from 'react';
import { datasetApi, warehouseApi } from '../api';
import StatCard from '../components/StatCard';
import VivaNote from '../components/VivaNote';
import { Upload, CheckCircle2, AlertCircle, FileText, ArrowRight, Database } from 'lucide-react';

export default function DatasetPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handlePreprocess = async (useDefault = false) => {
    setLoading(true);
    setError(null);
    setSyncStatus(null);
    try {
      const formData = new FormData();
      if (!useDefault && selectedFile) {
        formData.append('file', selectedFile);
      }
      const res = await datasetApi.uploadDataset(formData, false);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Preprocessing failed. Ensure Python engine is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToWarehouse = async () => {
    setLoading(true);
    setSyncStatus('Syncing star schema records into MySQL...');
    try {
      const res = await warehouseApi.syncEtl();
      setSyncStatus(`Successfully ingested ${res.data.facts_ingested} sales into MySQL Star Schema!`);
    } catch (err) {
      console.error(err);
      setSyncStatus(`ETL sync failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const summary = result?.summary;
  const preview = result?.preview || [];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Dataset Upload & Preprocessing Pipeline</h2>
        <p className="page-desc">
          Automated ETL cleaning handling missing identifiers, cancellations, negative quantities, invalid prices, and duplicates.
        </p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', backgroundColor: '#fef2f2', color: 'var(--danger)' }}>
          <AlertCircle size={18} style={{ display: 'inline', marginRight: '8px' }} />
          {error}
        </div>
      )}

      {/* Upload Controls Card */}
      <div className="card">
        <h3 className="card-title">Select or Load Online Retail CSV Dataset</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Upload any standard UCI Online Retail CSV (InvoiceNo, StockCode, Description, Quantity, UnitPrice, InvoiceDate, CustomerID, Country) or use the bundled representative dataset.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="input-field"
            style={{ maxWidth: '350px' }}
          />
          <button
            className="btn btn-primary"
            onClick={() => handlePreprocess(false)}
            disabled={loading || !selectedFile}
          >
            <Upload size={16} />
            {loading ? 'Processing...' : 'Upload & Clean CSV'}
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>or</span>
          <button
            className="btn btn-outline"
            onClick={() => handlePreprocess(true)}
            disabled={loading}
          >
            <FileText size={16} />
            Use Bundled Sample Retail CSV
          </button>
        </div>

        {syncStatus && (
          <div style={{ marginTop: '16px', padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '13px', color: '#166534' }}>
            <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '6px' }} />
            {syncStatus}
          </div>
        )}
      </div>

      {/* Preprocessing Summary Audit */}
      {summary && (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Data Cleaning & Preprocessing Audit Summary</h3>
              <button className="btn btn-primary" onClick={handleSyncToWarehouse} disabled={loading}>
                <Database size={16} />
                Load Cleaned Data to MySQL Warehouse (ETL)
              </button>
            </div>

            <div className="stats-grid">
              <StatCard label="Initial Raw Records" value={summary.initial_rows.toLocaleString()} desc="Rows parsed from CSV" />
              <StatCard label="Cleaned Valid Records" value={summary.final_rows.toLocaleString()} desc="Rows meeting all data constraints" badge={`${summary.retention_percentage}% Retained`} badgeType="badge-green" />
              <StatCard label="Total Anomalies Removed" value={summary.total_removed.toLocaleString()} desc="Dirty rows filtered out" badgeType="badge-yellow" />
              <StatCard label="Total Clean Revenue" value={`$${summary.total_revenue.toLocaleString()}`} desc="Sum of (Qty * UnitPrice)" />
            </div>

            {/* Detailed Anomaly Breakdown Table */}
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Step-by-Step Data Cleaning Breakdown</h4>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data Cleaning Rule</th>
                    <th>Anomaly Condition</th>
                    <th>Action Taken</th>
                    <th style={{ textAlign: 'right' }}>Rows Filtered / Fixed</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Missing CustomerID</strong></td>
                    <td><code>CustomerID IS NULL or empty</code></td>
                    <td>Dropped rows lacking customer identification for RFM clustering</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{summary.missing_customer_id_removed}</td>
                  </tr>
                  <tr>
                    <td><strong>Missing Description</strong></td>
                    <td><code>Description IS NULL or whitespace</code></td>
                    <td>Filtered items with missing product catalog descriptions</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{summary.missing_description_removed}</td>
                  </tr>
                  <tr>
                    <td><strong>Cancelled Invoices</strong></td>
                    <td><code>InvoiceNo starts with 'C' / 'c'</code></td>
                    <td>Excluded refund cancellations from sales transaction totals</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{summary.cancelled_invoices_removed}</td>
                  </tr>
                  <tr>
                    <td><strong>Invalid / Negative Quantity</strong></td>
                    <td><code>Quantity &le; 0</code></td>
                    <td>Eliminated return transactions and damaged inventory adjustments</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{summary.invalid_quantity_removed}</td>
                  </tr>
                  <tr>
                    <td><strong>Invalid Unit Price</strong></td>
                    <td><code>UnitPrice &le; 0</code></td>
                    <td>Removed free giveaways, testing entries, and bad price records</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{summary.invalid_price_removed}</td>
                  </tr>
                  <tr>
                    <td><strong>Duplicate Transactions</strong></td>
                    <td><code>Identical row content</code></td>
                    <td>Deduplicated repeat submissions to prevent measure inflation</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{summary.duplicates_removed}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cleaned Dataset Preview */}
          <div className="card">
            <h3 className="card-title">Cleaned Dataset Sample (First 50 Rows)</h3>
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>InvoiceNo</th>
                    <th>StockCode</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>UnitPrice</th>
                    <th>InvoiceDate</th>
                    <th>CustomerID</th>
                    <th>Country</th>
                    <th style={{ textAlign: 'right' }}>TotalAmount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      <td><span className="badge badge-blue">{row.InvoiceNo}</span></td>
                      <td>{row.StockCode}</td>
                      <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.Description}
                      </td>
                      <td style={{ textAlign: 'right' }}>{row.Quantity}</td>
                      <td style={{ textAlign: 'right' }}>${Number(row.UnitPrice).toFixed(2)}</td>
                      <td>{row.InvoiceDate}</td>
                      <td>{row.CustomerID}</td>
                      <td>{row.Country}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-primary)' }}>
                        ${Number(row.TotalAmount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <VivaNote title="DWM Viva Focus: Why is Data Preprocessing Crucial in KDD?">
        <p>
          Real-world transactional datasets contain noise, missing values, cancelled orders, and outliers. According to the Knowledge Discovery in Databases (KDD) process, poor quality data leads to the "Garbage In, Garbage Out" (GIGO) phenomenon in clustering and regression models. Cleaning ensures that RFM measures reflect true purchasing behaviour.
        </p>
      </VivaNote>
    </div>
  );
}
