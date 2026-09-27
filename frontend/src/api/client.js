import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization token if stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('queuecare_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Helper Endpoints
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  getDemoAccounts: () => api.get('/auth/demo-accounts'),
};

export const departmentApi = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
};

export const doctorApi = {
  getAll: () => api.get('/doctors'),
  getMyProfile: () => api.get('/doctors/me'),
  updateStatus: (doctorId, status) => api.patch(`/doctors/${doctorId}/status?new_status=${status}`),
};

export const queueApi = {
  getLiveQueue: (params) => api.get('/queue/live', { params }),
  registerPatient: (data) => api.post('/queue/register', data),
  lookupStatus: (ticketNumber, lookupCode) => api.post('/queue/lookup', {
    ticket_number: ticketNumber,
    lookup_code: lookupCode,
  }),
  getPublicKiosk: () => api.get('/queue/public-kiosk'),
  callNext: (doctorId) => api.post(`/queue/call-next${doctorId ? `?doctor_id=${doctorId}` : ''}`),
  startConsultation: (queueId, doctorId) => api.post(`/queue/${queueId}/start-consultation${doctorId ? `?doctor_id=${doctorId}` : ''}`),
  completeConsultation: (queueId, data) => api.post(`/queue/${queueId}/complete-consultation`, data),
  reorderQueue: (data) => api.post('/queue/reorder', data),
  getAuditHistory: (queueId) => api.get(`/queue/${queueId}/audit-history`),
  cancelEntry: (queueId, reason) => api.delete(`/queue/${queueId}/cancel?reason=${encodeURIComponent(reason || '')}`),
};

export const aiApi = {
  predictWaitTime: (data) => api.post('/ai/predict', data),
  getMetrics: () => api.get('/ai/metrics'),
  getEvaluationComparison: () => api.get('/ai/evaluation-comparison'),
  retrainModel: () => api.post('/ai/retrain'),
};

export const analyticsApi = {
  getKpiSummary: (dateFilter = 'today') => api.get(`/analytics/kpi-summary?date_filter=${dateFilter}`),
  getHourlyArrivals: () => api.get('/analytics/hourly-arrivals'),
  getDepartmentWaitTimes: () => api.get('/analytics/department-wait-times'),
  getExportCsvUrl: (deptId) => `${API_BASE_URL}/analytics/export/csv${deptId ? `?department_id=${deptId}` : ''}`,
};

export default api;
