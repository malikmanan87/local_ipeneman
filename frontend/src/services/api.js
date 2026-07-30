import axios from 'axios';

const API_BASE_URL = window.location.origin.includes('localhost') 
  ? window.location.origin + '/ipeneman/public/api' 
  : '/ipeneman/public/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getProfile: (id) => api.get(`/auth/profile/${id}`),
};

export const requestAPI = {
  create: (data) => api.post('/requests/create', data),
  update: (id, data) => api.post(`/requests/update/${id}`, data),
  getAvailable: (gender, companionId) => api.get(`/requests/available?gender=${gender}${companionId ? `&companion_id=${companionId}` : ''}`),
  getMyRequests: (userId) => api.get(`/requests/my/${userId}`),
  getApplicants: (requestId) => api.get(`/requests/applicants/${requestId}`),
  acceptCompanion: (data) => api.post('/requests/accept-companion', data),
  rateCompanion: (data) => api.post('/requests/rate-companion', data),
};

export const companionAPI = {
  applyJob: (data) => api.post('/companion/apply', data),
  getMyDuties: (companionId) => api.get(`/companion/duties/${companionId}`),
  checkIn: (data) => api.post('/companion/check-in', data),
  checkOut: (data) => api.post('/companion/check-out', data),
  addCareNote: (data) => api.post('/companion/add-note', data),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getAllRequests: () => api.get('/admin/requests'),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.post('/admin/settings/update', data),
};

export default api;
