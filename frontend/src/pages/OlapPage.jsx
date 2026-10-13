import React, { useState, useEffect } from 'react';
import { olapApi } from '../api';
import VivaNote from '../components/VivaNote';
import { Layers, ArrowUpRight, ArrowDownRight, Scissors, Grid3X3, Clock, Terminal } from 'lucide-react';

export default function OlapPage() {
  const [operation, setOperation] = useState('rollup');
  const [rollupDim, setRollupDim] = useState('time');
  const [drillYear, setDrillYear] = useState(2011);
  const [drillMonth, setDrillMonth] = useState(12);
  const [sliceDim, setSliceDim] = useState('country');
  const [sliceVal, setSliceVal] = useState('United Kingdom');
  const [diceQuarter, setDiceQuarter] = useState(4);
  const [diceYear, setDiceYear] = useState(2011);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeOlap = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (operation === 'rollup') {
        res = await olapApi.getRollup(rollupDim);
      } else if (operation === 'drilldown') {
        res = await olapApi.getDrilldown(drillYear, drillMonth);
      } else if (operation === 'slice') {
        res = await olapApi.getSlice(sliceDim, sliceVal);
      } else if (operation === 'dice') {
        res = await olapApi.getDice(diceQuarter, diceYear);
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
      <div className="page-header">
        <h2 className="page-title">OLAP Multidimensional Analysis</h2>
        <p className="page-desc">
          Live execution of Roll-up, Drill-down, Slice, and Dice queries on MySQL Star Schema data cubes.
        </p>
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
                <option value="2011">2011</option>
                <option value="2010">2010</option>
              </select>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Month:</label>
              <select className="select-field" value={drillMonth} onChange={(e) => setDrillMonth(Number(e.target.value))}>
                <option value="12">December (Month 12)</option>
                <option value="11">November (Month 11)</option>
                <option value="10">October (Month 10)</option>
                <option value="9">September (Month 9)</option>
                <option value="8">August (Month 8)</option>
              </select>
            </>
          )}

          {operation === 'slice' && (
            <>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Slice Dimension:</label>
              <select className="select-field" value={sliceDim} onChange={(e) => {
                setSliceDim(e.target.value);
                setSliceVal(e.target.value === 'country' ? 'United Kingdom' : '2011');
              }}>
                <option value="country">Country (Geography)</option>
                <option value="year">Year (Time)</option>
              </select>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Value:</label>
              {sliceDim === 'country' ? (
                <select className="select-field" value={sliceVal} onChange={(e) => setSliceVal(e.target.value)}>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="France">France</option>
                  <option value="Germany">Germany</option>
                  <option value="Australia">Australia</option>
                </select>
              ) : (
                <select className="select-field" value={sliceVal} onChange={(e) => setSliceVal(e.target.value)}>
                  <option value="2011">2011</option>
                  <option value="2010">2010</option>
                </select>
              )}
            </>
          )}

          {operation === 'dice' && (
            <>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Multi-dimensional Predicates:</label>
              <span className="badge badge-blue">Country IN ('UK', 'France', 'Germany', 'Australia')</span>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Quarter:</label>
              <select className="select-field" value={diceQuarter} onChange={(e) => setDiceQuarter(Number(e.target.value))}>
                <option value="4">Q4 (Oct - Dec)</option>
                <option value="3">Q3 (Jul - Sep)</option>
                <option value="2">Q2 (Apr - Jun)</option>
                <option value="1">Q1 (Jan - Mar)</option>
              </select>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Year:</label>
              <select className="select-field" value={diceYear} onChange={(e) => setDiceYear(Number(e.target.value))}>
                <option value="2011">2011</option>
                <option value="2010">2010</option>
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

      {/* Query Title & SQL Execution Card */}
      {data && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ margin: 0 }}>{data.title}</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} />
              Query Time: <strong>{data.execution_time_ms} ms</strong> | Rows: <strong>{data.result_count}</strong>
            </span>
          </div>

          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              <Terminal size={14} />
              <span>Actual MySQL Query Executed Against Star Schema:</span>
            </div>
            <pre className="sql-snippet">{data.sql_query}</pre>
          </div>

          {/* Result Data Table */}
          <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto', marginTop: '14px' }}>
            {rows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                No records match this OLAP sub-cube specification.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col}>{col.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      {columns.map((col) => {
                        const val = row[col];
                        return (
                          <td key={col} style={{ fontWeight: String(val).includes('ALL') ? 700 : 400 }}>
                            {val !== null && val !== undefined ? String(val) : 'NULL'}
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
      )}

      <VivaNote title="DWM Viva Focus: Explaining the 4 Core OLAP Operations">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
          <div>
            <strong>1. Roll-up (Aggregation):</strong> Climbs up concept hierarchies (e.g. Day &rarr; Month &rarr; Year) or drops dimensions to generalize data using <code>GROUP BY ... WITH ROLLUP</code>.
          </div>
          <div>
            <strong>2. Drill-down (De-aggregation):</strong> Traverses down concept hierarchies to reveal fine-grained details, such as daily product sales.
          </div>
          <div>
            <strong>3. Slice:</strong> Performs a selection on one dimension of the cube, yielding a sub-cube where one dimension has a single fixed value.
          </div>
          <div>
            <strong>4. Dice:</strong> Performs a selection on two or more dimensions simultaneously, isolating an intersection sub-cube.
          </div>
        </div>
      </VivaNote>
    </div>
  );
}
