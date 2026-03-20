import api from './axios';
import type { Booking } from '../types';

export const getBookings = async () => {
  const response = await api.get('/bookings');
  return response.data;
};

export const createBooking = async (data: Partial<Booking>) => {
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
    snapshot_guest_name?: string; // title yerine bu
    snapshot_guest_role_id?: number;
    room_id?: number; 
    check_in?: string; 
    check_out?: string;
    guest_data?: any; // Backend'in beklediği asıl yapı
  }
) => {
  const response = await api.patch(`/bookings/${id}`, data);
  return response.data;
};