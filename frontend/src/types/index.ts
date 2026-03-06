export interface Feature {
  id: number | string;
  key: string;
  label: string;
}

export interface Room {
  id: number;
  name: string;
  capacity: number;
  features?: Feature[]
  booked_slots?: number;
  available_capacity?: number;
  occupancy_rate?: number; // Yeni
  is_fully_booked?: boolean; // Yeni
  created_at?: string;
  updated_at?: string;
}

export interface Booking {
  id: number;
  room_id: number;
  user_id: number;
  title: string;
  start_time: string;
  end_time: string;
  color: string;
  room?: Room;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface AuthResponse {
  success: boolean;
  data: User;
  token: string;
}

