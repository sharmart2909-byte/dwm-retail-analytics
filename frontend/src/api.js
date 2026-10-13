import axios from 'axios';

// Backend is Spring Boot 3 running on port 8080
const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

export const datasetApi = {
  uploadDataset: (formData, autoSyncDw = true) =>
    api.post(`/dataset/upload?auto_sync_dw=${autoSyncDw}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getPreview: () => api.get('/dataset/preview'),
};

export const warehouseApi = {
  getOverview: () => api.get('/warehouse/overview'),
  getTableData: (tableName, limit = 50) => api.get(`/warehouse/table/${tableName}?limit=${limit}`),
  syncEtl: () => api.post('/warehouse/sync-etl'),
};

export const olapApi = {
  getRollup: (dimension = 'time') => api.get(`/olap/rollup?dimension=${dimension}`),
  getDrilldown: (year = 2011, month = 12) => api.get(`/olap/drilldown?year=${year}&month=${month}`),
  getSlice: (dimension = 'country', value = 'United Kingdom') => api.get(`/olap/slice?dimension=${dimension}&value=${encodeURIComponent(value)}`),
  getDice: (quarter = 4, year = 2011) => api.get(`/olap/dice?quarter=${quarter}&year=${year}`),
};

export const analyticsApi = {
  getRegression: () => api.get('/analytics/regression'),
  getNaiveBayes: () => api.get('/analytics/naive-bayes'),
  getClustering: (nClusters = 3) => api.get(`/analytics/clustering?n_clusters=${nClusters}`),
  getApriori: (minSupport = 0.03, minConfidence = 0.2) =>
    api.get(`/analytics/apriori?min_support=${minSupport}&min_confidence=${minConfidence}`),
  getRecommendations: (stockCode, topN = 5) =>
    api.post('/analytics/recommend', { stock_code: stockCode, top_n: topN }),
  getComparison: () => api.get('/analytics/comparison'),
};

export default api;
