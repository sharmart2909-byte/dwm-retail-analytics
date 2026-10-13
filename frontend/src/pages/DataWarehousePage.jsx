import React, { useState, useEffect } from 'react';
import { warehouseApi } from '../api';
import StatCard from '../components/StatCard';
import VivaNote from '../components/VivaNote';
import { Database, Table, RefreshCw, Key, Link2 } from 'lucide-react';

const TABLES = [
  { id: 'fact_sales', label: 'fact_sales (Central Fact Table)', type: 'fact' },
  { id: 'dim_customer', label: 'dim_customer (Customer Dimension)', type: 'dim' },
  { id: 'dim_product', label: 'dim_product (Product Dimension)', type: 'dim' },
  { id: 'dim_date', label: 'dim_date (Temporal Date Dimension)', type: 'dim' },
];

export default function DataWarehousePage() {
  const [activeTable, setActiveTable] = useState('fact_sales');
  const [tableData, setTableData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);

  const loadOverview = async () => {
    try {
      const res = await warehouseApi.getOverview();
      setOverview(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTable = async (tableName) => {
    setLoading(true);
    try {
      const res = await warehouseApi.getTableData(tableName, 50);
      setTableData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadTable(activeTable);
  }, [activeTable]);

  const handleSyncEtl = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await warehouseApi.syncEtl();
      setMessage(`Successfully synced Star Schema: ${res.data.facts_ingested} sales rows ingested into MySQL!`);
      loadOverview();
      loadTable(activeTable);
    } catch (err) {
      setMessage(`ETL Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Star Schema Data Warehouse Explorer</h2>
          <p className="page-desc">Inspection of MySQL dimensional tables, foreign key constraints, and measures</p>
        </div>
        <button className="btn btn-primary" onClick={handleSyncEtl} disabled={syncing}>
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Ingesting ETL Data...' : 'Sync Data from Preprocessor'}
        </button>
      </div>

      {message && (
        <div className="card" style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
          {message}
        </div>
      )}

      {/* Schema Structure Visualizer */}
      <div className="card">
        <h3 className="card-title">Exact Star Schema Architecture (retail_dw)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', margin: '14px 0' }}>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', backgroundColor: '#fafafa' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '8px' }}>dim_customer</div>
            <div style={{ fontSize: '12px', color: '#475569' }}>
              <div><Key size={12} style={{ display: 'inline', marginRight: '4px' }} /> <strong>customer_id</strong> (PK)</div>
              <div>&bull; country (VARCHAR 100)</div>
            </div>
          </div>

          <div style={{ border: '2px solid var(--accent-primary)', borderRadius: '6px', padding: '12px', backgroundColor: 'var(--accent-light)' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '8px' }}>fact_sales (Center)</div>
            <div style={{ fontSize: '12px', color: '#1e3a8a' }}>
              <div><Key size={12} style={{ display: 'inline', marginRight: '4px' }} /> <strong>sale_id</strong> (PK)</div>
              <div><Link2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> customer_id (FK)</div>
              <div><Link2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> product_id (FK)</div>
              <div><Link2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> date_id (FK)</div>
              <div><strong>[Measures]:</strong> quantity, unit_price, total_amount</div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', backgroundColor: '#fafafa' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '8px' }}>dim_product</div>
            <div style={{ fontSize: '12px', color: '#475569' }}>
              <div><Key size={12} style={{ display: 'inline', marginRight: '4px' }} /> <strong>product_id</strong> (PK)</div>
              <div>&bull; stock_code (UQ)</div>
              <div>&bull; description</div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', backgroundColor: '#fafafa' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '8px' }}>dim_date</div>
            <div style={{ fontSize: '12px', color: '#475569' }}>
              <div><Key size={12} style={{ display: 'inline', marginRight: '4px' }} /> <strong>date_id</strong> (PK: YYYYMMDD)</div>
              <div>&bull; day, month, quarter, year</div>
            </div>
          </div>

        </div>
      </div>

      {/* Table Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {TABLES.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTable(t.id)}
            className={`btn ${activeTable === t.id ? 'btn-primary' : 'btn-outline'}`}
          >
            <Table size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Table Data Viewer */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            Table: <code>{activeTable}</code>
          </h3>
          <span className="badge badge-blue">
            Total Rows in DB: {tableData?.total_count ?? '...'}
          </span>
        </div>

        <div className="table-responsive" style={{ maxHeight: '450px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px' }}>Loading table records...</div>
          ) : !tableData?.records || tableData.records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No records in this table.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {tableData.columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.records.map((row, idx) => (
                  <tr key={idx}>
                    {tableData.columns.map((col) => {
                      const val = row[col] !== undefined ? row[col] : (row[camelCase(col)] !== undefined ? row[camelCase(col)] : '');
                      return (
                        <td key={col}>
                          {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <VivaNote title="DWM Viva Focus: Star Schema vs. Snowflake Schema">
        <p>
          <strong>Star Schema:</strong> Every dimension is directly connected to the central fact table in a single hop. Dimension tables are deliberately denormalized, yielding simplified queries and faster OLAP JOIN performance.
        </p>
        <p style={{ marginTop: '6px' }}>
          <strong>Snowflake Schema:</strong> Normalizes dimension tables into sub-dimensions (e.g. splitting <code>dim_product</code> into Product & Category). Reduces data redundancy but introduces multi-table joins which slow down analytical aggregations.
        </p>
      </VivaNote>
    </div>
  );
}

function camelCase(str) {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}
