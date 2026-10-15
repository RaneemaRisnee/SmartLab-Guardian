import client from './client';

export const listLabs = () => client.get('/labs').then((r) => r.data.data);

export const getLab = (id) => client.get(`/labs/${id}`).then((r) => r.data.data);

export const createLab = (payload) => client.post('/labs', payload).then((r) => r.data.data);

export const updateLab = (id, payload) => client.put(`/labs/${id}`, payload).then((r) => r.data.data);

export const deleteLab = (id) => client.delete(`/labs/${id}`).then((r) => r.data);
