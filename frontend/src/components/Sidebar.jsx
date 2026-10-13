import React from 'react';
import { NavLink } from 'react-router-dom';
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
  Info
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dataset', label: 'Dataset & Preprocessing', icon: FileSpreadsheet },
  { path: '/warehouse', label: 'Data Warehouse', icon: Database },
  { path: '/olap', label: 'OLAP Analysis', icon: Layers },
  { path: '/visualization', label: 'Visualization', icon: BarChart3 },
  { path: '/regression', label: 'Linear Regression', icon: TrendingUp },
  { path: '/naive-bayes', label: 'Naive Bayes', icon: Binary },
  { path: '/segmentation', label: 'Customer Segmentation', icon: Users },
  { path: '/recommendation', label: 'Product Recommendation', icon: ShoppingBag },
  { path: '/comparison', label: 'Algorithm Comparison', icon: GitCompare },
  { path: '/about', label: 'About Project', icon: Info },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Online Retail Analytics</h1>
        <p className="sidebar-subtitle">DWM Academic Project</p>
      </div>
      <nav className="sidebar-nav">
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
