import client from './client';

export const listSessions = (params) => client.get('/sessions', { params }).then((r) => r.data.data);

export const listLiveSessions = (params) =>
  client.get('/sessions/live', { params }).then((r) => r.data.data);

export const getSession = (id) => client.get(`/sessions/${id}`).then((r) => r.data.data);

export const openSession = (payload) => client.post('/sessions', payload).then((r) => r.data.data);

export const endSession = (id, terminate = false) =>
  client.put(`/sessions/${id}/end`, { terminate }).then((r) => r.data.data);

export const reviewSession = (id, payload) =>
  client.put(`/sessions/${id}/review`, payload).then((r) => r.data.data);
