import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';

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

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dataset" element={<DatasetPage />} />
            <Route path="/warehouse" element={<DataWarehousePage />} />
            <Route path="/olap" element={<OlapPage />} />
            <Route path="/visualization" element={<VisualizationPage />} />
            <Route path="/regression" element={<RegressionPage />} />
            <Route path="/naive-bayes" element={<NaiveBayesPage />} />
            <Route path="/segmentation" element={<SegmentationPage />} />
            <Route path="/recommendation" element={<RecommendationPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
