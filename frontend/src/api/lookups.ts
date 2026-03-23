import api from './axios';

export const getLookupValues = (typeId: number) => api.get(`/lookup-values/type/${typeId}`);
export const updateLookupValue = (id: number, data: any) => api.patch(`/lookup-values/${id}`, data);
export const createLookupValue = (data: any) => api.post('/lookup-values', data);