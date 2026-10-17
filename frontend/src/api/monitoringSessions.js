import client from './client';

export const listMonitoringSessions = (params) =>
  client.get('/monitoring-sessions', { params }).then((r) => r.data.data);
export const startMonitoringSession = (payload) =>
  client.post('/monitoring-sessions', payload).then((r) => r.data.data);
export const finishMonitoringSession = (id) =>
  client.put(`/monitoring-sessions/${id}/end`).then((r) => r.data.data);
