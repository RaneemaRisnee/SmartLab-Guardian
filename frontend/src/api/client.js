import axios from 'axios';

const TOKEN_KEY = 'smartlab_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api'
});

client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Every failure is normalised to a plain Error with the server's message,
// so callers can show `err.message` directly without unwrapping axios shapes.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.message || error.message || 'Request failed';
    return Promise.reject(Object.assign(new Error(message), { details: error.response?.data?.details }));
  }
);

export default client;
