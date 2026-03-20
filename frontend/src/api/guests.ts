import api from './axios';
import type { Guest } from '../types';

/**
 * Misafir ismine göre veritabanında arama yapar.
 * @param query - Arama yapılacak isim (min 2 karakter)
 */
export const searchGuests = async (query: string): Promise<Guest[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    // Backend endpoint'inin '/guests/search' olduğunu varsayıyoruz
    // query parametresini 'q' olarak gönderiyoruz
    const response = await api.get<Guest[]>('/guests/search', {
      params: { q: query.toUpperCase() }
    });
    
    return response.data;
  } catch (error) {
    console.error("Guest search error:", error);
    // Hata durumunda boş dizi dönerek uygulamanın kırılmasını engelliyoruz
    return [];
  }
};