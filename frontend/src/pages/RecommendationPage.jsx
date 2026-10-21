import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api';
import StatCard from '../components/StatCard';
import { ShoppingBag, ArrowRight, Search, Sparkles, RefreshCw } from 'lucide-react';

export default function RecommendationPage() {
  const [stockCode, setStockCode] = useState('');
  const [aprioriData, setAprioriData] = useState(null);
  const [recData, setRecData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchApriori = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getApriori(0.03, 0.2);
      setAprioriData(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch Apriori rules. Ensure Python service is active.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (targetCode = '') => {
    setRecLoading(true);
    try {
      const res = await analyticsApi.getRecommendations(targetCode, 5);
      const data = res.data?.data;
      setRecData(data);
      if (data?.query_stock_code) {
        setStockCode(data.query_stock_code);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    fetchApriori();
    fetchRecommendations('');
  }, []);

  const handleRecommendClick = () => {
    fetchRecommendations(stockCode);
  };

  const rules = aprioriData?.association_rules || [];
  const catalog = recData?.available_catalog || [];
  const recs = recData?.recommendations || [];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Market Basket Analysis & Product Recommendation</h2>
          <p className="page-desc">
            Association rule mining via Apriori algorithm discovering frequent co-purchase itemsets and generating cross-sell recommendations.
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => {
            fetchApriori();
            fetchRecommendations(stockCode);
          }}
          disabled={loading || recLoading}
        >
          <RefreshCw size={15} className={loading || recLoading ? 'animate-spin' : ''} />
          Re-Mine Rules
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', backgroundColor: '#fef2f2', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Interactive Recommendation Engine Card */}
      <div className="card">
        <h3 className="card-title">
          <Sparkles size={18} color="var(--accent-primary)" />
          Interactive Cross-Sell Recommendation Query
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Select a product from the active catalog to evaluate association rules where the product appears in the antecedent set (Item A).
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <select
            className="select-field"
            style={{ maxWidth: '460px', flex: 1 }}
            value={stockCode}
            onChange={(e) => setStockCode(e.target.value)}
          >
            {catalog.length > 0 ? (
              catalog.map((item) => (
                <option key={item.stock_code} value={item.stock_code}>
                  [{item.stock_code}] {item.description}
                </option>
              ))
            ) : (
              <option value="">{recLoading ? 'Loading Catalog...' : 'No products available'}</option>
            )}
          </select>

          <button
            className="btn btn-primary"
            onClick={handleRecommendClick}
            disabled={recLoading || !stockCode}
          >
            <Search size={15} />
            {recLoading ? 'Mining Rules...' : 'Get Recommendations'}
          </button>
        </div>

        {recData && (
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '10px' }}>
              Recommendations for: <span style={{ color: 'var(--accent-primary)' }}>[{recData.query_stock_code}] {recData.query_product_name}</span>
            </div>

            {recs.length === 0 ? (
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                No strong association rules found for this specific item at current threshold. Try selecting another high-volume product from the active catalog above.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {recs.map((rec, idx) => (
                  <div key={idx} className="card" style={{ padding: '14px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className="badge badge-blue">Rank #{idx + 1}</span>
                      <span className="badge badge-green">Lift: {rec.lift}x</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', marginBottom: '6px' }}>
                      [{rec.stock_code}] {rec.description}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      {rec.recommendation_reason}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                      <span>Confidence: {(rec.confidence * 100).toFixed(1)}%</span>
                      <span>Support: {(rec.support * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mined Association Rules Table */}
      <div className="card">
        <h3 className="card-title">Mined Frequent Itemsets & Association Rules (Apriori)</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Discovering relationships of the form: <code>{`{Antecedent} -> {Consequent}`}</code> with Support &ge; 3% and Confidence &ge; 20%.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            Mining Association Rules with Apriori on Active Dataset...
          </div>
        ) : rules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            No frequent itemsets met the support and confidence threshold in this dataset.
          </div>
        ) : (
          <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rule ID</th>
                  <th>Antecedent (Item A)</th>
                  <th>Consequent (Item B)</th>
                  <th style={{ textAlign: 'right' }}>Support</th>
                  <th style={{ textAlign: 'right' }}>Confidence</th>
                  <th style={{ textAlign: 'right' }}>Lift Ratio</th>
                  <th style={{ textAlign: 'right' }}>Leverage</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.rule_id}>
                    <td><span className="badge badge-blue">#{rule.rule_id}</span></td>
                    <td style={{ fontWeight: 600 }}>{rule.antecedents_names ? rule.antecedents_names.join(', ') : rule.antecedent_str}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{rule.consequents_names ? rule.consequents_names.join(', ') : rule.consequent_str}</td>
                    <td style={{ textAlign: 'right' }}>{(rule.support * 100).toFixed(2)}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{(rule.confidence * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: rule.lift > 1 ? '#16a34a' : 'inherit' }}>
                      {rule.lift}x
                    </td>
                    <td style={{ textAlign: 'right' }}>{rule.leverage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
