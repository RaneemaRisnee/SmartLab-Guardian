import client from './client';

export const listStudents = (params) => client.get('/students', { params }).then((r) => r.data.data);

export const getStudent = (id) => client.get(`/students/${id}`).then((r) => r.data.data);

export const createStudent = (payload) => client.post('/students', payload).then((r) => r.data.data);

export const updateStudent = (id, payload) =>
  client.put(`/students/${id}`, payload).then((r) => r.data.data);

export const deleteStudent = (id) => client.delete(`/students/${id}`).then((r) => r.data);

export const importStudents = (file) => {
  const form = new FormData();
  form.append('file', file);
  return client.post('/students/import', form).then((r) => r.data.data);
};
