import api from './axios';
import type { Booking } from '../types';

export const getBookings = async () => {
  const response = await api.get('/bookings');
  return response.data;
};

export const createBooking = async (data: {
  room_id: number;
  title: string;
  start_time: string;
  end_time: string;
  color?: string;
}) => {
  const response = await api.post('/bookings', data);
  return response.data;
};

export const deleteBooking = async (id: number) => {
  const response = await api.delete(`/bookings/${id}`);
  return response.data;
};


export const getRecentBookings = async (limit: number = 10) => {
  return api.get('/bookings/recent', { params: { limit } });
};

export const getAuditLogs = async (limit: number = 20) => {
  const res = await api.get('/booking-logs', { params: { limit } });
  return res.data?.data || [];
};
//export const updateBooking = async (id: number, data: { title?: string; color?: string }) => {
export const updateBooking = async (
  id: number, 
  data: { 
    title?: string; 
    color?: string; 
    room_id?: number; 
    start_time?: string; 
    end_time?: string; 
  }
) => {
  const response = await api.patch(`/bookings/${id}`, data);
  return response.data;
};