import axios from 'axios';

const api = axios.create({
  baseURL: `http://${window.location.hostname}:8080/api`,
});

api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('redcode_current_user');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  }
  return config;
});

export default api;

