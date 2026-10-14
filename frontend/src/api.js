import axios from 'axios';

let rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
if (!rawBaseUrl.startsWith('http://') && !rawBaseUrl.startsWith('https://')) {
  rawBaseUrl = `https://${rawBaseUrl}`;
}
if (!rawBaseUrl.endsWith('/api') && !rawBaseUrl.endsWith('/api/')) {
  rawBaseUrl = rawBaseUrl.replace(/\/+$/, '') + '/api';
}
const API_BASE_URL = rawBaseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

// Attach Authorization Bearer token to all outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('retail_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (username, password, fullName, customerId) =>
    api.post('/auth/register', { username, password, fullName, customerId }),
  getProfile: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const customerApi = {
  getOrders: () => api.get('/customer/orders'),
  getCatalog: (search = '', limit = 50) =>
    api.get(`/customer/catalog?limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  getRecommendations: (stockCode = '') =>
    api.get(`/customer/recommendations${stockCode ? `?stock_code=${encodeURIComponent(stockCode)}` : ''}`),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

export const datasetApi = {
  inspectDataset: (formData) =>
    api.post('/dataset/inspect', formData),
  uploadDataset: (formData, autoSyncDw = false, mapping = null) => {
    let url = `/dataset/upload?auto_sync_dw=${autoSyncDw}`;
    if (mapping) {
      formData.append('mapping', JSON.stringify(mapping));
    }
    // Note: Do NOT set Content-Type header manually; Axios automatically sets multipart boundary
    return api.post(url, formData);
  },
  getPreview: () => api.get('/dataset/preview'),
};

export const warehouseApi = {
  getOverview: () => api.get('/warehouse/overview'),
  getTableData: (tableName, limit = 50) => api.get(`/warehouse/table/${tableName}?limit=${limit}`),
  syncEtl: (mode = 'replace') => api.post(`/warehouse/sync-etl?mode=${encodeURIComponent(mode)}`),
};

export const olapApi = {
  getRollup: (dimension = 'time') => api.get(`/olap/rollup?dimension=${dimension}`),
  getDrilldown: (year = 2011, month = 12) => api.get(`/olap/drilldown?year=${year}&month=${month}`),
  getSlice: (dimension = 'country', value = 'United Kingdom') =>
    api.get(`/olap/slice?dimension=${dimension}&value=${encodeURIComponent(value)}`),
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
