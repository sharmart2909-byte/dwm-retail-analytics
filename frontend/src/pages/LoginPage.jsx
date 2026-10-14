import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ShoppingBag, Lock, User, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState('ADMIN'); // 'ADMIN' or 'CUSTOMER'
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [fullName, setFullName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setIsRegistering(false);
    setError(null);
    if (newMode === 'ADMIN') {
      setUsername('admin');
      setPassword('Admin@123');
    } else {
      setUsername('customer1');
      setPassword('Customer@123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering && mode === 'CUSTOMER') {
        const user = await register(username, password, fullName, customerId);
        navigate('/storefront');
      } else {
        const user = await login(username, password);
        if (user.role === 'ADMIN') {
          navigate('/');
        } else {
          navigate('/storefront');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-main, #f8fafc)',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        border: '1px solid var(--border-color, #e2e8f0)',
        overflow: 'hidden'
      }}>
        {/* Header Banner */}
        <div style={{
          backgroundColor: mode === 'ADMIN' ? '#0f172a' : '#1e3a8a',
          color: '#ffffff',
          padding: '28px 24px',
          textAlign: 'center',
          transition: 'background-color 0.3s ease'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            marginBottom: '12px'
          }}>
            {mode === 'ADMIN' ? <ShieldCheck size={26} color="#60a5fa" /> : <ShoppingBag size={26} color="#93c5fd" />}
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {mode === 'ADMIN' ? 'Executive Analytics & ETL Portal' : 'Retail Customer Storefront'}
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', marginTop: '6px', marginBottom: 0 }}>
            {mode === 'ADMIN'
              ? 'Data Warehouse, OLAP, and Machine Learning Administration'
              : 'Browse Catalog & Personalized Recommendations'}
          </p>
        </div>

        {/* Portal Switcher Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => handleModeSwitch('ADMIN')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: mode === 'ADMIN' ? '#ffffff' : '#f1f5f9',
              fontWeight: 600,
              fontSize: '13px',
              color: mode === 'ADMIN' ? '#0f172a' : '#64748b',
              borderBottom: mode === 'ADMIN' ? '3px solid #3b82f6' : 'none',
              cursor: 'pointer'
            }}
          >
            Administrator Login
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('CUSTOMER')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: mode === 'CUSTOMER' ? '#ffffff' : '#f1f5f9',
              fontWeight: 600,
              fontSize: '13px',
              color: mode === 'CUSTOMER' ? '#1e3a8a' : '#64748b',
              borderBottom: mode === 'CUSTOMER' ? '3px solid #3b82f6' : 'none',
              cursor: 'pointer'
            }}
          >
            Customer Portal
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '36px' }}
                  placeholder="Enter username"
                />
              </div>
            </div>

            {isRegistering && mode === 'CUSTOMER' && (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Linked Customer ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="e.g. 17850 or leave empty for auto-generated"
                  />
                </div>
              </>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '36px' }}
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
            >
              {loading ? 'Authenticating...' : (isRegistering ? 'Create Customer Account' : 'Sign In')}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Registration Toggle for Customers */}
          {mode === 'CUSTOMER' && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register as Customer"}
              </button>
            </div>
          )}

          {/* Demo Credentials Pill */}
          <div style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px dashed #cbd5e1',
            fontSize: '12px',
            color: '#475569'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
              <Sparkles size={14} color="#3b82f6" />
              Demo Credentials Available:
            </div>
            <div>
              <strong>Admin:</strong> <code>admin</code> / <code>Admin@123</code>
            </div>
            <div>
              <strong>Customer:</strong> <code>customer1</code> / <code>Customer@123</code> (ID: 17850)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
