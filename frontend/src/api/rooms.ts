import api from './axios';

export const getRooms = async () => {
  const response = await api.get('/rooms');
  return response.data;
};

export const getAvailableRooms = async (date: string) => {
  const response = await api.get('/rooms/available', {
    params: { 
      date: date
    }
  });
  return response.data;
};

export const getAvailableRanges = async (startDate: string, days: number = 5) => {
  const response = await api.get('/rooms/available-ranges', {
    params: { 
      start_date: startDate,
      days: days
    }
  });
  return response.data;
};

export const updateRoom = async (id: number, data: { capacity?: number; features?: { blackboard?: boolean } }) => {
  const response = await api.patch(`/rooms/${id}`, data);
  return response.data;
};