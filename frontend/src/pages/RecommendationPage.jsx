import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api';
import StatCard from '../components/StatCard';
import VivaNote from '../components/VivaNote';
import { ShoppingBag, ArrowRight, Search, Sparkles, RefreshCw } from 'lucide-react';

export default function RecommendationPage() {
  const [stockCode, setStockCode] = useState('85123A');
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

  const fetchRecommendations = async (targetCode) => {
    setRecLoading(true);
    try {
      const res = await analyticsApi.getRecommendations(targetCode, 5);
      setRecData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    fetchApriori();
    fetchRecommendations(stockCode);
  }, []);

  const handleRecommendClick = () => {
    fetchRecommendations(stockCode);
  };

  const rules = aprioriData?.association_rules || [];
  const catalog = recData?.available_catalog || [];
  const recs = recData?.recommendations || [];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Market Basket Analysis & Product Recommendation</h2>
        <p className="page-desc">
          Association rule mining via Apriori algorithm discovering frequent co-purchase itemsets and generating cross-sell recommendations.
        </p>
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
          Select a product from the retail catalog to evaluate association rules where the product appears in the antecedent set (Item A).
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <select
            className="select-field"
            style={{ maxWidth: '420px', flex: 1 }}
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
              <>
                <option value="85123A">[85123A] WHITE HANGING HEART T-LIGHT HOLDER</option>
                <option value="71053">[71053] WHITE METAL LANTERN</option>
                <option value="84406B">[84406B] CREAM CUPID HEARTS COAT HANGER</option>
                <option value="20725">[20725] LUNCH BAG RED RETROSPOT</option>
                <option value="22728">[22728] ALARM CLOCK BAKELIKE PINK</option>
              </>
            )}
          </select>

          <button
            className="btn btn-primary"
            onClick={handleRecommendClick}
            disabled={recLoading}
          >
            <Search size={15} />
            {recLoading ? 'Mining Rules...' : 'Get Recommendations'}
          </button>
        </div>

        {/* Recommendation Results Display */}
        {recData && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '10px' }}>
              Recommended Items for: <span style={{ color: 'var(--accent-primary)' }}>{recData.query_product_name} ({recData.query_stock_code})</span>
            </h4>

            {recs.length === 0 ? (
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-hover)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                No strong association rule met the confidence threshold for this specific item. Consider lowering min_support or choosing a more frequent basket item.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {recs.map((r, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="badge badge-blue">StockCode: {r.stock_code}</span>
                      <span className="badge badge-green">Lift: {r.lift}x</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', marginTop: '8px', color: 'var(--text-main)' }}>
                      {r.description}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      <div><strong>Confidence:</strong> {(r.confidence * 100).toFixed(1)}%</div>
                      <div><strong>Support:</strong> {(r.support * 100).toFixed(2)}%</div>
                      <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#1e3a8a' }}>
                        &bull; {r.recommendation_reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Association Rules Table */}
      {aprioriData && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              Top Mined Association Rules (Sorted by Lift & Confidence)
            </h3>
            <span className="badge badge-blue">
              Total Rules Discovered: {aprioriData.association_rules_count}
            </span>
          </div>

          <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rule ID</th>
                  <th>Antecedent (Item A)</th>
                  <th>Consequent (Item B)</th>
                  <th style={{ textAlign: 'right' }}>Support</th>
                  <th style={{ textAlign: 'right' }}>Confidence</th>
                  <th style={{ textAlign: 'right' }}>Lift Ratio</th>
                  <th style={{ textAlign: 'right' }}>Conviction</th>
                </tr>
              </thead>
              <tbody>
                {rules.slice(0, 35).map((rule) => (
                  <tr key={rule.rule_id}>
                    <td>#{rule.rule_id}</td>
                    <td style={{ fontWeight: 600 }}>{rule.antecedent_str}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{rule.consequent_str}</td>
                    <td style={{ textAlign: 'right' }}>{(rule.support * 100).toFixed(2)}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{(rule.confidence * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: rule.lift > 1 ? 'var(--success)' : 'inherit' }}>
                      {rule.lift.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{rule.conviction.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <VivaNote title="DWM Viva Focus: Market Basket Analysis & Apriori Algorithm">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <div>
            <strong>Apriori Principle:</strong> Any subset of a frequent itemset must also be frequent (anti-monotonicity property), which prunes the candidate search space.
          </div>
          <div>
            <strong>Support:</strong> Count(A &and; B) / N &mdash; frequency of joint occurrence in baskets.
          </div>
          <div>
            <strong>Confidence:</strong> Support(A &and; B) / Support(A) &mdash; conditional certainty of purchasing B given A.
          </div>
          <div>
            <strong>Lift:</strong> Confidence(A &rarr; B) / Support(B). A lift &gt; 1 implies positive correlation; lift = 1 implies independence.
          </div>
        </div>
      </VivaNote>
    </div>
  );
}
