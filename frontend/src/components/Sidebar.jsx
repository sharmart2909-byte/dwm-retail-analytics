import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Database,
  Layers,
  BarChart3,
  TrendingUp,
  Binary,
  Users,
  ShoppingBag,
  GitCompare,
  Info,
  LogOut,
  ShieldCheck,
  User
} from 'lucide-react';

const adminNavItems = [
  { path: '/', label: 'Executive Dashboard', icon: LayoutDashboard },
  { path: '/dataset', label: 'Dataset & Safe ETL', icon: FileSpreadsheet },
  { path: '/warehouse', label: 'Data Warehouse', icon: Database },
  { path: '/olap', label: 'OLAP Analysis', icon: Layers },
  { path: '/visualization', label: 'Visualization', icon: BarChart3 },
  { path: '/segmentation', label: 'Customer Segmentation', icon: Users },
  { path: '/recommendation', label: 'Apriori Recommendation', icon: ShoppingBag },
  { path: '/regression', label: 'Linear Regression', icon: TrendingUp },
  { path: '/naive-bayes', label: 'Naive Bayes Classifier', icon: Binary },
  { path: '/comparison', label: 'Algorithm Comparison', icon: GitCompare },
  { path: '/about', label: 'About Project', icon: Info },
];

const customerNavItems = [
  { path: '/storefront', label: 'Shopper Storefront', icon: ShoppingBag },
];

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = isAdmin ? adminNavItems : customerNavItems;

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="sidebar-header">
        <h1 className="sidebar-title">Online Retail Analytics</h1>
        <p className="sidebar-subtitle">DWM Academic Project</p>

        {/* User Identity Banner */}
        {user ? (
          <div style={{
            marginTop: '12px',
            padding: '10px',
            backgroundColor: 'var(--bg-hover, #f1f5f9)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: isAdmin ? '#1e3a8a' : '#166534',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isAdmin ? <ShieldCheck size={16} /> : <User size={16} />}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {user.fullName || user.username}
                </div>
                <span className={`badge ${isAdmin ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '10px' }}>
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '12px' }}>
            <NavLink to="/login" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '6px' }}>
              Sign In
            </NavLink>
          </div>
        )}
      </div>

      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)' }}>
        <div>Spring Boot 3 + MySQL 8</div>
        <div>Python FastAPI + React Vite</div>
      </div>
    </aside>
  );
}
