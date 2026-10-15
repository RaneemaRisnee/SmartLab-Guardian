import client from './client';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data.data);

export const me = () => client.get('/auth/me').then((r) => r.data.data);

export const changePassword = (payload) =>
  client.put('/auth/password', payload).then((r) => r.data);

export const listUsers = () => client.get('/auth/users').then((r) => r.data.data);

export const createUser = (payload) => client.post('/auth/users', payload).then((r) => r.data.data);

export const updateUser = (id, payload) =>
  client.put(`/auth/users/${id}`, payload).then((r) => r.data.data);
