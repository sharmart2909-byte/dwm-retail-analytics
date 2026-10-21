import React, { useState, useEffect } from 'react';
import { olapApi } from '../api';
import VivaNote from '../components/VivaNote';
import { Layers, ArrowUpRight, ArrowDownRight, Scissors, Grid3X3, Clock, Terminal, RefreshCw } from 'lucide-react';

export default function OlapPage() {
  const [operation, setOperation] = useState('rollup');
  const [rollupDim, setRollupDim] = useState('time');
  const [drillYear, setDrillYear] = useState('');
  const [drillMonth, setDrillMonth] = useState('');
  const [sliceDim, setSliceDim] = useState('country');
  const [sliceVal, setSliceVal] = useState('');
  const [diceQuarter, setDiceQuarter] = useState(4);
  const [diceYear, setDiceYear] = useState('');

  const [options, setOptions] = useState({ years: [], months: [], quarters: [], countries: [] });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available dimension members dynamically from active MySQL warehouse
  const loadOptions = async () => {
    try {
      const res = await olapApi.getOptions();
      const opts = res.data || { years: [], months: [], quarters: [], countries: [] };
      setOptions(opts);

      if (opts.years && opts.years.length > 0) {
        setDrillYear(opts.years[0]);
        setDiceYear(opts.years[0]);
      }
      if (opts.months && opts.months.length > 0) {
        setDrillMonth(opts.months[opts.months.length - 1]);
      }
      if (opts.countries && opts.countries.length > 0) {
        setSliceVal(opts.countries[0]);
      }
    } catch (err) {
      console.warn('Could not load OLAP options:', err);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const executeOlap = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (operation === 'rollup') {
        res = await olapApi.getRollup(rollupDim);
      } else if (operation === 'drilldown') {
        res = await olapApi.getDrilldown(drillYear || null, drillMonth || null);
      } else if (operation === 'slice') {
        res = await olapApi.getSlice(sliceDim, sliceVal || '');
      } else if (operation === 'dice') {
        res = await olapApi.getDice(diceQuarter || 4, diceYear || null);
      }
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to execute OLAP query. Ensure backend and MySQL are running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeOlap();
  }, [operation, rollupDim, drillYear, drillMonth, sliceDim, sliceVal, diceQuarter, diceYear]);

  const rows = data?.rows || [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">OLAP Multidimensional Analysis</h2>
          <p className="page-desc">
            Live execution of Roll-up, Drill-down, Slice, and Dice queries on MySQL Star Schema data cubes.
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => { loadOptions(); executeOlap(); }} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh Cube
        </button>
      </div>

      {/* Operation Selection Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <button
          className={`btn ${operation === 'rollup' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setOperation('rollup')}
        >
          <ArrowUpRight size={16} />
          Roll-up (Climb Hierarchy)
        </button>
        <button
          className={`btn ${operation === 'drilldown' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setOperation('drilldown')}
        >
          <ArrowDownRight size={16} />
          Drill-down (Decompose)
        </button>
        <button
          className={`btn ${operation === 'slice' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setOperation('slice')}
        >
          <Scissors size={16} />
          Slice (1 Dimension)
        </button>
        <button
          className={`btn ${operation === 'dice' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setOperation('dice')}
        >
          <Grid3X3 size={16} />
          Dice (Multiple Dimensions)
        </button>
      </div>

      {/* Dynamic Filter Controls based on Selected OLAP Operation */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>

          {operation === 'rollup' && (
            <>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Roll-up Hierarchy:</label>
              <select className="select-field" value={rollupDim} onChange={(e) => setRollupDim(e.target.value)}>
                <option value="time">Temporal Hierarchy (Day &rarr; Month &rarr; Quarter &rarr; Year)</option>
                <option value="geography">Geographical Hierarchy (Country &rarr; Global Total)</option>
              </select>
            </>
          )}

          {operation === 'drilldown' && (
            <>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Drill down Target Year:</label>
              <select className="select-field" value={drillYear} onChange={(e) => setDrillYear(Number(e.target.value))}>
                {options.years && options.years.length > 0 ? (
                  options.years.map(y => <option key={y} value={y}>{y}</option>)
                ) : (
                  <option value="">Latest Year</option>
                )}
              </select>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Month:</label>
              <select className="select-field" value={drillMonth} onChange={(e) => setDrillMonth(Number(e.target.value))}>
                {options.months && options.months.length > 0 ? (
                  options.months.map(m => <option key={m} value={m}>Month {m}</option>)
                ) : (
                  [1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>Month {m}</option>)
                )}
              </select>
            </>
          )}

          {operation === 'slice' && (
            <>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Slice Dimension:</label>
              <select className="select-field" value={sliceDim} onChange={(e) => {
                const nextDim = e.target.value;
                setSliceDim(nextDim);
                if (nextDim === 'country') {
                  setSliceVal(options.countries && options.countries.length > 0 ? options.countries[0] : '');
                } else {
                  setSliceVal(options.years && options.years.length > 0 ? String(options.years[0]) : '');
                }
              }}>
                <option value="country">Country (Geography)</option>
                <option value="year">Year (Time)</option>
              </select>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Value:</label>
              {sliceDim === 'country' ? (
                <select className="select-field" value={sliceVal} onChange={(e) => setSliceVal(e.target.value)}>
                  {options.countries && options.countries.length > 0 ? (
                    options.countries.map(c => <option key={c} value={c}>{c}</option>)
                  ) : (
                    <option value="Global">Global</option>
                  )}
                </select>
              ) : (
                <select className="select-field" value={sliceVal} onChange={(e) => setSliceVal(e.target.value)}>
                  {options.years && options.years.length > 0 ? (
                    options.years.map(y => <option key={y} value={y}>{y}</option>)
                  ) : (
                    <option value="">All Years</option>
                  )}
                </select>
              )}
            </>
          )}

          {operation === 'dice' && (
            <>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Multi-dimensional Predicates:</label>
              <span className="badge badge-blue">
                Top Active Countries ({options.countries && options.countries.length > 0 ? options.countries.slice(0, 4).join(', ') : 'All Countries'})
              </span>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Quarter:</label>
              <select className="select-field" value={diceQuarter} onChange={(e) => setDiceQuarter(Number(e.target.value))}>
                <option value="4">Q4 (Oct - Dec)</option>
                <option value="3">Q3 (Jul - Sep)</option>
                <option value="2">Q2 (Apr - Jun)</option>
                <option value="1">Q1 (Jan - Mar)</option>
              </select>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Year:</label>
              <select className="select-field" value={diceYear} onChange={(e) => setDiceYear(Number(e.target.value))}>
                {options.years && options.years.length > 0 ? (
                  options.years.map(y => <option key={y} value={y}>{y}</option>)
                ) : (
                  <option value="">Latest Year</option>
                )}
              </select>
            </>
          )}

          <button className="btn btn-outline" onClick={executeOlap} disabled={loading} style={{ marginLeft: 'auto' }}>
            Run Query
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', backgroundColor: '#fef2f2', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Query Metadata Strip */}
      {data && (
        <div className="card" style={{ backgroundColor: '#f8fafc', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
              {data.title}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="badge badge-blue">
                <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                {data.execution_time_ms} ms
              </span>
              <span className="badge badge-green">
                {data.result_count} records returned
              </span>
            </div>
          </div>
          <div style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '6px', overflowX: 'auto' }}>
            <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              <Terminal size={12} style={{ display: 'inline', marginRight: '6px' }} />
              Live SQL executed against MySQL Star Schema (retail_dw):
            </div>
            <code style={{ color: '#38bdf8', fontSize: '12px', fontFamily: 'monospace' }}>
              {data.sql_query}
            </code>
          </div>
        </div>
      )}

      {/* OLAP Cube Results Grid */}
      <div className="card">
        <h3 className="card-title">Multidimensional Cube Result Set</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            Querying MySQL Star Schema Multidimensional Data Cube...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            No records matched the selected dimension coordinates. Try selecting another year or country from the dataset.
          </div>
        ) : (
          <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col} style={{ textTransform: 'capitalize' }}>
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map((col) => (
                      <td key={col}>
                        {typeof row[col] === 'number'
                          ? row[col].toLocaleString()
                          : (row[col] === null ? '<TOTAL>' : String(row[col]))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.viva_explanation && (
        <VivaNote title={`DWM Academic Viva Focus: ${operation.toUpperCase()} Operator`}>
          <p><strong>Concept & Definition:</strong> {data.viva_explanation}</p>
          <p style={{ marginTop: '6px' }}>
            <strong>OLAP vs. OLTP Distinction:</strong> OLAP queries execute multidimensional aggregations across dimension tables (star schema) rather than normalized entity tables, enabling high-performance decision support.
          </p>
        </VivaNote>
      )}
    </div>
  );
}
