import client from './client';

export const listPolicies = () => client.get('/policies').then((r) => r.data.data);

export const effectivePolicy = (labId) =>
  client.get('/policies/effective', { params: { lab: labId } }).then((r) => r.data.data);

export const upsertPolicy = (payload) => client.put('/policies', payload).then((r) => r.data.data);

export const deletePolicy = (id) => client.delete(`/policies/${id}`).then((r) => r.data);
