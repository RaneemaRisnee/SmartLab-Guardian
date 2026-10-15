import client from './client';

export const listExams = (params) => client.get('/exams', { params }).then((r) => r.data.data);

export const getExam = (id) => client.get(`/exams/${id}`).then((r) => r.data.data);

export const createExam = (payload) => client.post('/exams', payload).then((r) => r.data.data);

export const updateExam = (id, payload) => client.put(`/exams/${id}`, payload).then((r) => r.data.data);

export const deleteExam = (id) => client.delete(`/exams/${id}`).then((r) => r.data);

export const importCandidates = (id, file, strategy = 'sequential') => {
  const form = new FormData();
  form.append('file', file);
  form.append('strategy', strategy);
  return client.post(`/exams/${id}/candidates`, form).then((r) => r.data.data);
};

export const reassignSeats = (id, strategy = 'sequential') =>
  client.post(`/exams/${id}/assign`, { strategy }).then((r) => r.data.data);

export const signInAllCandidates = (id) => client.post(`/exams/${id}/sign-in`).then((r) => r.data.data);

export const endExam = (id) => client.post(`/exams/${id}/end`).then((r) => r.data.data);

export const reassignSeat = (examId, assignmentId, computerId) =>
  client
    .put(`/exams/${examId}/assignments/${assignmentId}`, { computerId })
    .then((r) => r.data.data);
