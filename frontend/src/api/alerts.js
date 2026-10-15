import client from './client';

export const listAlerts = (params) => client.get('/alerts', { params }).then((r) => r.data.data);

export const alertSummary = () => client.get('/alerts/summary').then((r) => r.data.data);

export const updateAlertStatus = (id, payload) =>
  client.put(`/alerts/${id}`, payload).then((r) => r.data.data);
