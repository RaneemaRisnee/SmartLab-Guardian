import client from './client';

export const listAttendance = (params) => client.get('/attendance', { params }).then((r) => r.data.data);

export const attendanceSummary = (params) =>
  client.get('/attendance/summary', { params }).then((r) => r.data.data);

export const overrideAttendance = (id, payload) =>
  client.put(`/attendance/${id}`, payload).then((r) => r.data.data);
