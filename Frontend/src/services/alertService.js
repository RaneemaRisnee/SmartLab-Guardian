const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/alerts';

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || `Server error (${res.status})`);
  }
  return data;
}

export const fetchAlerts = async () => {
  const data = await request('/all');
  if (!Array.isArray(data)) throw new Error('Unexpected response from server');
  return data;
};

// status: 'Reviewed' | 'Dismissed'
export const resolveAlert = (alertId, status = 'Reviewed', adminId = null) =>
  request(`/resolve/${alertId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, admin_id: adminId }),
  });
