import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (data) => api.post('/auth/login/', data),
  register: (data) => api.post('/auth/register/', data),
  profile: () => api.get('/auth/profile/'),
};

export const ordersAPI = {
  list: (params = {}) => api.get('/orders/', { params }),
  create: (data) => api.post('/orders/', data),
  update: (id, data) => api.patch(`/orders/${id}/`, data),
  delete: (id) => api.delete(`/orders/${id}/`),

  validate: (id) => api.post(`/orders/${id}/validate/`),
  assign: (id, data) => api.post(`/orders/${id}/assign/`, data),
  autoAssign: (orderId) => api.post('/orders/auto-assign/', { order_id: orderId }),
  retryAssign: (id) => api.post(`/orders/${id}/retry-assign/`),

  start: (id) => api.post(`/orders/${id}/start/`),
  deliver: (id) => api.post(`/orders/${id}/deliver/`),

  stats: () => api.get('/orders/stats/'),
};

export const vehiclesAPI = {
  list: (params = {}) => api.get('/vehicles/vehicles/', { params }),
  create: (data) => api.post('/vehicles/vehicles/', data),
  update: (id, data) => api.patch(`/vehicles/vehicles/${id}/`, data),
  delete: (id) => api.delete(`/vehicles/vehicles/${id}/`),
};

export const driversAPI = {
  list: (params = {}) => api.get('/vehicles/drivers/', { params }),
  create: (data) => api.post('/vehicles/drivers/', data),
  update: (id, data) => api.patch(`/vehicles/drivers/${id}/`, data),
  delete: (id) => api.delete(`/vehicles/drivers/${id}/`),
};

export const transportersAPI = {
  list: (params = {}) => api.get('/transporters/', { params }),
  profile: () => api.get('/transporters/profile/'),
  dashboardStats: () => api.get('/transporters/dashboard-stats/'),
  stats: () => api.get('/transporters/dashboard-stats/'),
};

export const trackingAPI = {
  livePositions: () => api.get('/tracking/live/'),
  updatePosition: (data) => api.post('/tracking/update-position/', data),
};

export default api;