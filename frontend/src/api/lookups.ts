import api from './axios';

export const getLookupValues = () => api.get('/lookup-values');
export const updateLookupValue = (id: number, data: any) => api.patch(`/lookup-values/${id}`, data);
export const createLookupValue = (data: any) => api.post('/lookup-values', data);