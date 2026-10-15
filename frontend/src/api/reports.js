import client from './client';

export const usageReport = (params) => client.get('/reports/usage', { params }).then((r) => r.data.data);

export const attendanceReport = (params) =>
  client.get('/reports/attendance', { params }).then((r) => r.data.data);

export const hardwareReport = (params) =>
  client.get('/reports/hardware', { params }).then((r) => r.data.data);

export const listSavedReports = (params) => client.get('/reports', { params }).then((r) => r.data.data);

export const saveReport = (payload) => client.post('/reports', payload).then((r) => r.data.data);

export const deleteSavedReport = (id) => client.delete(`/reports/${id}`).then((r) => r.data);

/** Downloads rows as an .xlsx file straight to the browser. */
export const exportRows = async (rows, filename, sheetName) => {
  const response = await client.post(
    '/reports/export',
    { rows, filename, sheetName },
    { responseType: 'blob' }
  );
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
