import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';

import LoginPage from './pages/LoginPage';
import CustomerPortalPage from './pages/CustomerPortalPage';
import DashboardPage from './pages/DashboardPage';
import DatasetPage from './pages/DatasetPage';
import DataWarehousePage from './pages/DataWarehousePage';
import OlapPage from './pages/OlapPage';
import VisualizationPage from './pages/VisualizationPage';
import RegressionPage from './pages/RegressionPage';
import NaiveBayesPage from './pages/NaiveBayesPage';
import SegmentationPage from './pages/SegmentationPage';
import RecommendationPage from './pages/RecommendationPage';
import ComparisonPage from './pages/ComparisonPage';
import AboutPage from './pages/AboutPage';

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading application session...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/storefront" replace />;
  }
  return children;
}

function CustomerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading application session...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Customer Portal Experience (Standalone Storefront Layout) */}
          <Route
            path="/storefront"
            element={
              <CustomerRoute>
                <CustomerPortalPage />
              </CustomerRoute>
            }
          />

          {/* Administrator Analytics & Management Routes */}
          <Route
            path="/"
            element={
              <AdminRoute>
                <AppLayout><DashboardPage /></AppLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/dataset"
            element={
              <AdminRoute>
                <AppLayout><DatasetPage /></AppLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/warehouse"
            element={
              <AdminRoute>
                <AppLayout><DataWarehousePage /></AppLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/olap"
            element={
              <AdminRoute>
                <AppLayout><OlapPage /></AppLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/visualization"
            element={
              <AdminRoute>
                <AppLayout><VisualizationPage /></AppLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/regression"
            element={
              <AdminRoute>
                <AppLayout><RegressionPage /></AppLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/naive-bayes"
            element={
              <AdminRoute>
                <AppLayout><NaiveBayesPage /></AppLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/segmentation"
            element={
              <AdminRoute>
                <AppLayout><SegmentationPage /></AppLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/recommendation"
            element={
              <AdminRoute>
                <AppLayout><RecommendationPage /></AppLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/comparison"
            element={
              <AdminRoute>
                <AppLayout><ComparisonPage /></AppLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/about"
            element={
              <AdminRoute>
                <AppLayout><AboutPage /></AppLayout>
              </AdminRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
