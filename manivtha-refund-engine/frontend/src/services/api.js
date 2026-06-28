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

api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('manivtha_auth_token');
  if (auth) {
    config.headers.Authorization = `Bearer ${auth}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
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

export const authService = {
  login: async (username, password) => {
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      const response = await api.post('/api/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      console.error('Forgot password request failed:', error);
      throw error;
    }
  },
  resetPassword: async (token, new_password) => {
    try {
      const response = await api.post('/api/auth/reset-password', { token, new_password });
      return response.data;
    } catch (error) {
      console.error('Reset password failed:', error);
      throw error;
    }
  },
  me: async () => {
    try {
      const response = await api.get('/api/me');
      return response.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  },
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/api/me', profileData);
      return response.data;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }
};

export const userService = {
  getUsers: async () => {
    try {
      const response = await api.get('/api/users');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  },
  createUser: async (userData) => {
    try {
      const response = await api.post('/api/users/create', userData);
      return response.data;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  },
  fireUser: async (userId) => {
    const response = await api.patch(`/api/users/${userId}/fire`);
    return response.data;
  },
  updateUserRole: async (userId, role) => {
    const response = await api.patch(`/api/users/${userId}/role`, { role });
    return response.data;
  }
};

export default api;
