import React, { useState } from 'react';
import { datasetApi, warehouseApi } from '../api';
import StatCard from '../components/StatCard';
import VivaNote from '../components/VivaNote';
import { Upload, CheckCircle2, AlertCircle, FileText, ArrowRight, Database, Sliders, RefreshCw, Eye, Check } from 'lucide-react';

export default function DatasetPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inspection, setInspection] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [result, setResult] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [commitMode, setCommitMode] = useState('replace'); // 'replace' or 'append'
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState(null);

  const canonicalFields = [
    { key: 'InvoiceNo', label: 'Invoice / Order ID', desc: 'Identifies the transaction order (synthesized if missing)' },
    { key: 'StockCode', label: 'Product SKU / Code', desc: 'Unique product code (auto-derived from description if missing)' },
    { key: 'Description', label: 'Product Description / Name', desc: 'Product name or title (auto-derived if missing)' },
    { key: 'Quantity', label: 'Quantity Purchased', desc: 'Number of units (defaults to 1 if missing)' },
    { key: 'UnitPrice', label: 'Unit Price / Rate', desc: 'Price per unit or derived from sales amount (defaults to 9.99 if missing)' },
    { key: 'InvoiceDate', label: 'Transaction Date', desc: 'Date of transaction (defaults to current date if missing)' },
    { key: 'CustomerID', label: 'Customer Identifier', desc: 'Customer ID or account code (synthesized if missing)' },
    { key: 'Country', label: 'Customer Country / Region', desc: 'Customer location (defaults to Global if missing)' },
  ];

  const triggerInspectFile = async (file) => {
    setLoading(true);
    setError(null);
    setSyncStatus(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await datasetApi.inspectDataset(formData);
      const insp = res.data?.inspection;
      setInspection(res.data);
      if (insp?.detected_mapping) {
        setColumnMapping(insp.detected_mapping);
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.error || err.response?.data?.detail || err.message;
      setError(`Inspection failed: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setInspection(null);
      setResult(null);
      setError(null);
      setSyncStatus(null);
      // Automatically inspect the file immediately upon selection
      triggerInspectFile(file);
    }
  };

  const handleInspect = async (useDefault = false) => {
    setLoading(true);
    setError(null);
    setSyncStatus(null);
    try {
      const formData = new FormData();
      if (!useDefault && selectedFile) {
        formData.append('file', selectedFile);
      }
      const res = await datasetApi.inspectDataset(formData);
      const insp = res.data?.inspection;
      setInspection(res.data);
      if (insp?.detected_mapping) {
        setColumnMapping(insp.detected_mapping);
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.error || err.response?.data?.detail || err.message;
      setError(`Inspection failed: ${detail}`);
    } finally {
      setLoading(false);
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
      const res = await datasetApi.uploadDataset(formData, false, columnMapping);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.error || err.response?.data?.detail || err.message;
      setError(`Preprocessing failed: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToWarehouse = async () => {
    setCommitting(true);
    setSyncStatus(commitMode === 'append' ? 'Validating and appending records into MySQL Star Schema...' : 'Validating and executing clean transactional swap into MySQL Star Schema...');
    try {
      const res = await warehouseApi.syncEtl(commitMode);
      const data = res.data;
      setSyncStatus(
        `Successfully validated and committed ${data.facts_ingested} sales transactions into MySQL Star Schema! ` +
        `(Mode: ${commitMode.toUpperCase()}, Products: ${data.products_ingested}, Customers: ${data.customers_ingested}, Revenue: $${Number(data.total_revenue || 0).toLocaleString()}). ` +
        `All project modules (Executive Dashboard, Data Warehouse, OLAP Analysis, Visualization, Customer Segmentation, Recommendations, Regression, Naive Bayes, and Comparison) are now updated and using the new dataset.`
      );
    } catch (err) {
      console.error(err);
      setSyncStatus(`ETL sync failed: ${err.response?.data?.message || err.message}. Previous warehouse data preserved.`);
    } finally {
      setCommitting(false);
    }
  };

  const summary = result?.summary;
  const preview = result?.preview || [];
  const rawColumns = inspection?.inspection?.columns_found || [];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Dataset Upload, Column Mapping & Safe ETL Pipeline</h2>
        <p className="page-desc">
          Upload CSV or Excel (.xlsx) files with ANY filename and column names. Flexible column auto-detection and mapping ensures seamless ETL into MySQL.
        </p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', backgroundColor: '#fef2f2', color: 'var(--danger)', marginBottom: '16px' }}>
          <AlertCircle size={18} style={{ display: 'inline', marginRight: '8px' }} />
          {error}
        </div>
      )}

      {/* Step 1: Upload and Inspection Controls */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">1. Select Dataset (Supports Any Filename & Column Names)</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Upload any CSV (with comma, semicolon, tab delimiters; UTF-8 or Latin1 encodings) or Excel (.xlsx) file. Columns will be inspected automatically.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <input
            type="file"
            accept=".csv, .xlsx"
            onChange={handleFileChange}
            className="input-field"
            style={{ maxWidth: '350px' }}
          />
          <button
            className="btn btn-outline"
            onClick={() => handleInspect(false)}
            disabled={loading || !selectedFile}
          >
            <Eye size={16} />
            {loading ? 'Inspecting...' : 'Re-Inspect Columns'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handlePreprocess(false)}
            disabled={loading || !selectedFile}
          >
            <Upload size={16} />
            {loading ? 'Processing...' : 'Upload & Clean File'}
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>or</span>
          <button
            className="btn btn-outline"
            onClick={() => {
              setSelectedFile(null);
              handleInspect(true);
            }}
            disabled={loading}
          >
            Inspect Bundled Sample
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              setSelectedFile(null);
              handlePreprocess(true);
            }}
            disabled={loading}
          >
            Clean Bundled Sample
          </button>
        </div>
      </div>

      {/* Step 2: Flexible Column Mapping Interface */}
      {inspection && (
        <div className="card" style={{ marginBottom: '20px', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              <Sliders size={18} color="var(--accent-primary)" />
              2. Schema Column Recognition & Mapping
            </h3>
            <span className="badge badge-blue">
              Total Rows in Source: {inspection.inspection?.total_rows?.toLocaleString()}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Our smart recognition engine automatically matched columns from your uploaded file. You can adjust mappings or choose <strong>Auto-Detect / Synthesize</strong> for any missing field:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            {canonicalFields.map((f) => {
              const mappedCol = columnMapping[f.key];
              const isMapped = mappedCol && mappedCol.trim() !== '';
              return (
                <div key={f.key} style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {f.label}
                    </span>
                    {isMapped ? (
                      <span className="badge badge-green" style={{ fontSize: '10px' }}>
                        <Check size={10} style={{ display: 'inline', marginRight: '2px' }} />
                        Mapped: {mappedCol}
                      </span>
                    ) : (
                      <span className="badge badge-blue" style={{ fontSize: '10px' }}>
                        Auto-Synthesized
                      </span>
                    )}
                  </div>
                  <select
                    className="select-field"
                    style={{ width: '100%', fontSize: '12px', marginBottom: '4px' }}
                    value={columnMapping[f.key] || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, [f.key]: e.target.value })}
                  >
                    <option value="">-- Auto-Detect / Synthesize Default --</option>
                    {rawColumns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.desc}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
              &bull; Compatible with any dataset structure: missing fields will be automatically synthesized with realistic values.
            </span>
            <button
              className="btn btn-primary"
              onClick={() => handlePreprocess(!selectedFile)}
              disabled={loading}
            >
              <CheckCircle2 size={16} />
              Confirm Mappings & Clean Dataset
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Cleaning Audit Metrics & Warehouse Ingestion */}
      {summary && (
        <div style={{ marginBottom: '24px' }}>
          <div className="card" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ margin: 0, color: '#166534', fontWeight: 600 }}>
                  <CheckCircle2 size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                  Data Preprocessing Completed Successfully!
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#15803d' }}>
                  Retained {summary.final_rows?.toLocaleString()} valid transactions ({summary.retention_percentage}% retention rate).
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  value={commitMode}
                  onChange={(e) => setCommitMode(e.target.value)}
                  className="select-field"
                  style={{ fontSize: '12px', padding: '6px 10px', height: 'auto', backgroundColor: '#ffffff' }}
                  title="Choose whether to transactional-swap or append to warehouse"
                >
                  <option value="replace">Replace Existing (Clean Swap)</option>
                  <option value="append">Append to Existing Data</option>
                </select>
                <button
                  className="btn btn-primary"
                  onClick={handleSyncToWarehouse}
                  disabled={committing || loading}
                >
                  <Database size={16} />
                  {committing ? 'Synchronizing...' : 'Sync into MySQL Data Warehouse'}
                </button>
              </div>
            </div>
            {syncStatus && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#ffffff', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#166534', border: '1px solid #bbf7d0', lineHeight: '1.5' }}>
                {syncStatus}
              </div>
            )}
          </div>

          <div className="stats-grid">
            <StatCard
              label="Original Input Rows"
              value={summary.initial_rows?.toLocaleString()}
              desc="Raw source records"
            />
            <StatCard
              label="Cleaned Warehouse Rows"
              value={summary.final_rows?.toLocaleString()}
              desc={`Retention: ${summary.retention_percentage}%`}
              badge="Cleaned"
            />
            <StatCard
              label="Cancellations Removed"
              value={summary.cancelled_invoices_removed?.toLocaleString()}
              desc="Prefix 'C' credit invoices"
            />
            <StatCard
              label="Gross Cleaned Revenue"
              value={`$${Number(summary.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              desc={`${summary.unique_invoices} distinct invoices`}
              badge="Total Sales"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '14px' }}>
            <div className="card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Duplicates Removed:</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                {summary.duplicates_removed?.toLocaleString()}
              </div>
            </div>
            <div className="card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unique Customers Identified:</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                {summary.unique_customers?.toLocaleString()}
              </div>
            </div>
            <div className="card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Invalid Quantities Filtered:</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                {summary.invalid_quantity_removed?.toLocaleString()}
              </div>
            </div>
            <div className="card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unique Products Cataloged:</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {summary.unique_products?.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cleaned Records Preview Table */}
      {preview.length > 0 && (
        <div className="card">
          <h3 className="card-title">Cleaned Dataset Sample (First 50 Rows)</h3>
          <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>InvoiceNo</th>
                  <th>StockCode</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
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
                    <td><span className="badge badge-yellow">{row.CustomerID}</span></td>
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
      )}

      <VivaNote title="DWM Viva Focus: Data Cleaning & Preprocessing Workflow">
        <p>
          <strong>ETL Data Cleaning Pipeline:</strong> Real-world retail datasets contain noisy, missing, and duplicate records with diverse schemas.
          Our automated pipeline handles:
        </p>
        <ul style={{ marginTop: '6px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Flexible Column Mapping:</strong> Dynamically recognizes any column headers and synthesizes missing attributes.</li>
          <li><strong>Outlier & Cancellation Removal:</strong> Filters negative quantities and cancellation codes.</li>
          <li><strong>Deduplication:</strong> Eliminates duplicate transactions to maintain measure integrity.</li>
          <li><strong>Dimensional Key Assignment:</strong> Resolves surrogate keys before batch inserting into the MySQL star schema.</li>
        </ul>
      </VivaNote>
    </div>
  );
}
