import client from './client';

export const listHardware = (params) => client.get('/hardware', { params }).then((r) => r.data.data);

export const hardwareSummary = (params) =>
  client.get('/hardware/summary', { params }).then((r) => r.data.data);

export const getHardware = (id) => client.get(`/hardware/${id}`).then((r) => r.data.data);

export const createHardware = (payload) => client.post('/hardware', payload).then((r) => r.data.data);

export const updateHardware = (id, payload) =>
  client.put(`/hardware/${id}`, payload).then((r) => r.data.data);

export const deleteHardware = (id) => client.delete(`/hardware/${id}`).then((r) => r.data);
