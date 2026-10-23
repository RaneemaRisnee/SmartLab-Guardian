const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Request failed (${response.status})`);
  return payload;
}

export const getHardware = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return request(`/hardware${query.size ? `?${query.toString()}` : ''}`);
};

export const createHardware = (data) => request('/hardware', {
  method: 'POST', body: JSON.stringify(data)
});

export const updateHardware = (id, data) => request(`/hardware/${id}`, {
  method: 'PUT', body: JSON.stringify(data)
});

export const deleteHardware = (id) => request(`/hardware/${id}`, { method: 'DELETE' });
