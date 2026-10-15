import client from './client';

export const listComputers = (params) => client.get('/computers', { params }).then((r) => r.data.data);

export const getComputer = (id) => client.get(`/computers/${id}`).then((r) => r.data.data);

export const createComputer = (payload) => client.post('/computers', payload).then((r) => r.data.data);

export const updateComputer = (id, payload) =>
  client.put(`/computers/${id}`, payload).then((r) => r.data.data);

export const deleteComputer = (id) => client.delete(`/computers/${id}`).then((r) => r.data);

export const importComputers = (file, labId) => {
  const form = new FormData();
  form.append('file', file);
  form.append('lab', labId);
  return client.post('/computers/import', form).then((r) => r.data.data);
};
