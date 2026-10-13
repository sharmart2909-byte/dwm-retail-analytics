import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../api';
import VivaNote from '../components/VivaNote';
import { BarChart3, RefreshCw } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function VisualizationPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVisualData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getStats();
      setStats(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load visualization data. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisualData();
  }, []);

  const topProducts = stats?.top_products || [];
  const countrySales = stats?.country_sales || [];
  const monthlyTrend = stats?.monthly_trend || [];

  // Chart 1: Top 5 Products by Revenue
  const topProductsChart = {
    labels: topProducts.map(p => p.stockCode || 'Item'),
    datasets: [
      {
        label: 'Revenue ($)',
        data: topProducts.map(p => Number(p.totalRevenue || 0)),
        backgroundColor: '#1e40af',
        borderRadius: 4,
      }
    ]
  };

  // Chart 2: Country Distribution
  const countryChart = {
    labels: countrySales.slice(0, 6).map(c => c.country),
    datasets: [
      {
        label: 'Country Revenue ($)',
        data: countrySales.slice(0, 6).map(c => Number(c.totalRevenue || 0)),
        backgroundColor: '#3b82f6',
        borderRadius: 4,
      }
    ]
  };

  // Chart 3: Monthly Trend
  const monthlyChart = {
    labels: monthlyTrend.map(m => `Month ${m.month}/${m.year}`),
    datasets: [
      {
        label: 'Monthly Sales ($)',
        data: monthlyTrend.map(m => Number(m.totalRevenue || 0)),
        backgroundColor: '#60a5fa',
        borderRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { boxWidth: 12, font: { family: 'Inter', size: 12 } }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'Inter', size: 11 } }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 11 } }
      }
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Data Warehouse Visualizations</h2>
          <p className="page-desc">Academic graphical representation of dimensions, temporal trends, and product measures.</p>
        </div>
        <button className="btn btn-outline" onClick={fetchVisualData} disabled={loading}>
          <RefreshCw size={15} />
          Refresh Charts
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', backgroundColor: '#fef2f2', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>Loading visual charts from MySQL...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>

          {/* Top Products Chart */}
          <div className="card">
            <h3 className="card-title">Top Products by Total Revenue</h3>
            <div style={{ height: '280px' }}>
              <Bar data={topProductsChart} options={chartOptions} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
              Labels represent StockCode keys from dim_product
            </div>
          </div>

          {/* Country Distribution Chart */}
          <div className="card">
            <h3 className="card-title">Geographic Sales Distribution</h3>
            <div style={{ height: '280px' }}>
              <Bar data={countryChart} options={chartOptions} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
              Aggregated across dim_customer.country
            </div>
          </div>

          {/* Monthly Trend Chart */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3 className="card-title">Temporal Monthly Revenue Progression</h3>
            <div style={{ height: '280px' }}>
              <Bar data={monthlyChart} options={chartOptions} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
              Temporal rollup derived from dim_date.month and dim_date.year
            </div>
          </div>

        </div>
      )}

      <VivaNote title="DWM Viva Focus: Role of Visual Data Mining">
        <p>
          Data visualization translates abstract multidimensional cube points into intuitive patterns. Visual data mining combines computer vision capabilities of the human analyst with algorithmic mining, facilitating exploratory data analysis (EDA), outlier detection, and pattern validation.
        </p>
      </VivaNote>
    </div>
  );
}
