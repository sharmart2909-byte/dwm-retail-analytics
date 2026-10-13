import React from 'react';

export default function StatCard({ label, value, desc, badge, badgeType = "badge-blue" }) {
  return (
    <div className="stat-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="stat-label">{label}</span>
        {badge && <span className={`badge ${badgeType}`}>{badge}</span>}
      </div>
      <div className="stat-value">{value}</div>
      {desc && <div className="stat-desc">{desc}</div>}
    </div>
  );
}
