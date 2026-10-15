import client from './client';

export const getOverview = () => client.get('/dashboard/overview').then((r) => r.data.data);
