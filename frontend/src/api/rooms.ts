import api from './axios';

export const getRooms = async () => {
  const response = await api.get('/rooms');
  return response.data;
};

export const getFloors = () => api.get('/floors');


export const getSystemSettings = async () => {
  const token = localStorage.getItem('token');
  
  // Laravel'de tanımladığımız yeni, temiz route'a gidiyoruz
  return api.get('/settings', { 
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const getAvailableRooms = async (date: string) => {
  const response = await api.get('/rooms/available', {
    params: { 
      date: date
    }
  });
  return response.data;
};

export const getAvailableRanges = async (
  startDate: string, 
  days: number = 5, 
  startTime: string = "08:00:00", 
  endTime: string = "18:00:00"
) => {
  const response = await api.get('/rooms/available-ranges', {
    params: { 
      start_date: startDate,
      days: days,
      start_time: startTime, // Laravel'e giden anahtar (key)
      end_time: endTime      // Laravel'e giden anahtar (key)
    }
  });
  return response.data;
};

export const updateRoom = async (id: number, data: { capacity?: number; features?: any[] }) => {
  const response = await api.put(`/rooms/${id}`, data);
  return response.data;
};

export const getAllLookupFeatures = async () => {
  const response = await api.get('/lookup-values/type/3'); // Backend'de Features tipi 3 ise
  return response.data;
};


export const getAuditLogs = async (limit: number = 20) => {
  const res = await api.get('/booking-logs', { params: { limit } });
  return res.data?.data || [];
};