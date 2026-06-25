import axios from 'axios';

// Configure Axios instance for backend API
const getBaseUrl = () => {
  // If running locally, use localhost:8000
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `http://${window.location.hostname}:8000`;
  }
  // Otherwise, FORCE the production Render backend URL to prevent Vercel env var overrides
  return 'https://trip-cancellation-and-refund-policy.onrender.com';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const refundService = {
  checkHealth: async () => {
    try {
      const response = await api.get('/api/health');
      return response.data;
    } catch (error) {
      console.error('API health check failed:', error);
      throw error;
    }
  },

  getPolicies: async () => {
    try {
      const response = await api.get('/api/policies');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch policies:', error);
      throw error;
    }
  },

  updatePolicies: async (policies) => {
    try {
      const response = await api.put('/api/policies', policies);
      return response.data;
    } catch (error) {
      console.error('Failed to update policies:', error);
      throw error;
    }
  },

  getOrders: async () => {
    try {
      const response = await api.get('/api/orders');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      throw error;
    }
  },

  getAuditLogs: async () => {
    try {
      const response = await api.get('/api/audit-logs');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      throw error;
    }
  },
  
  processCancellation: async (cancellationData) => {
    try {
      const response = await api.post('/api/cancel-order', cancellationData);
      return response.data;
    } catch (error) {
      console.error('Failed to process cancellation:', error);
      throw error;
    }
  },

  updateAuditLog: async (logId, data) => {
    try {
      const response = await api.put(`/api/audit-logs/${logId}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update audit log:', error);
      throw error;
    }
  },

  updateAuditLogStatus: async (logId, status) => {
    try {
      const response = await api.patch(`/api/audit-logs/${logId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Failed to update status:', error);
      throw error;
    }
  },

  getAuditLogDetails: async (logId) => {
    try {
      const response = await api.get(`/api/audit-logs/${logId}/details`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch details:', error);
      throw error;
    }
  }
};

export default api;
