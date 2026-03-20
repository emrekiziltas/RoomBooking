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

export interface Guest {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
  is_vip: boolean | number;
  role_id: number;
}

export interface Booking {
  id: number;
  guest_id: number;
  room_id: number;
  check_in: string;    // datetime/string
  check_out: string;   // datetime/string
  status: string;
  
  // --- SNAPSHOT ALANLARI (Yeni eklenenler) ---
  snapshot_guest_name: string;
  snapshot_guest_email: string;
  snapshot_guest_company?: string | null;
  snapshot_is_vip: boolean | number;

  // İlişkiler (Opsiyonel gelebilir)
  room?: Room;
  guest?: any; 
  
  // Eski kodlardan kalanlar varsa (Hata almamak için opsiyonel bırakabilirsin)
  start_time?: string;
  end_time?: string;
  title?: string;
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

