import { useState } from 'react';
import { createBooking } from '../api/bookings';
import type { Room } from '../types';

const SLOTS = {
  morning: { start: '08:30:00', end: '12:30:00', label: '08:30' },
  afternoon: { start: '12:30:00', end: '17:30:00', label: '12:30' }
};

interface NewBookingFormProps {
  rooms: Room[];
  onSuccess: () => void;
  onCancel: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export function NewBookingForm({ rooms, onSuccess, onCancel, showToast }: NewBookingFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    room_id: '',
    title: '',
    start_date: new Date().toISOString().split('T')[0],
    start_slot: 'morning',
    end_date: new Date().toISOString().split('T')[0],
    end_slot: 'afternoon',
  });

  // --- OTOMATİK TARİH EŞİTLEME ---
  const handleStartDateChange = (newDate: string) => {
    setForm(prev => ({
      ...prev,
      start_date: newDate,
      // Başlangıç değişince bitişi de otomatik eşitle
      end_date: newDate 
    }));
  };

  // --- FORM KONTROLLERİ VE VALIDASYON ---
  const startTimeStr = `${form.start_date} ${SLOTS[form.start_slot as keyof typeof SLOTS].start}`;
  const endTimeStr = `${form.end_date} ${SLOTS[form.end_slot as keyof typeof SLOTS].end}`;
  
  const isTimeInvalid = new Date(endTimeStr) <= new Date(startTimeStr);
  const isFormEmpty = !form.room_id || !form.title.trim();
  const isDisabled = isFormEmpty || isTimeInvalid || submitting;

  const handleCreate = async () => {
    if (isDisabled) return;

    setSubmitting(true);
    try {
      await createBooking({ 
        ...form, 
        room_id: Number(form.room_id), 
        title: form.title.toUpperCase(),
        start_time: startTimeStr, 
        end_time: endTimeStr, 
        color: '#4f46e5' 
      });
      
      showToast("RESERVATION CREATED ✓", "success");
      onSuccess();
    } catch (err: any) {
      // Backend Validation Mesajlarını Yakalama
      const validationErrors = err.response?.data?.errors;
      
      if (validationErrors) {
        // TypeScript hatasını önlemek için 'as string[][]' casting
        const errorArrays = Object.values(validationErrors) as string[][];
        if (errorArrays.length > 0 && errorArrays[0].length > 0) {
          showToast(errorArrays[0][0].toUpperCase(), "error");
        }
      } else {
        const msg = err.response?.data?.message || "ACTION FAILED";
        showToast(msg.toUpperCase(), "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ini-card p-6 border-t-4 border-brand-primary animate-in slide-in-from-top-2 shadow-xl bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sol Kolon: Başlık ve Kaynak */}
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-brand-muted uppercase ml-2 tracking-widest">Description</span>
            <input 
              type="text" 
              placeholder="GUEST NAME / EVENT TITLE" 
              value={form.title} 
              onChange={e => setForm({ ...form, title: e.target.value })} 
              className="w-full bg-brand-surface rounded-ini px-4 py-3 font-black text-xs outline-none uppercase border-2 border-transparent focus:border-brand-primary transition-all" 
            />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-brand-muted uppercase ml-2 tracking-widest">Resource</span>
            <select 
              value={form.room_id} 
              onChange={e => setForm({ ...form, room_id: e.target.value })} 
              className="w-full bg-brand-surface rounded-ini px-4 py-3 font-black text-xs outline-none uppercase cursor-pointer"
            >
              <option value="">Select Resource</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sağ Kolon: Tarih ve Slotlar */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-[9px] font-black text-brand-primary block text-center uppercase tracking-widest">Check-In</span>
            <input 
              type="date" 
              value={form.start_date} 
              onChange={e => handleStartDateChange(e.target.value)} 
              className="w-full bg-brand-surface rounded-ini px-4 py-3 font-black text-[10px] outline-none" 
            />
            <select value={form.start_slot} onChange={e => setForm({ ...form, start_slot: e.target.value })} className="w-full bg-brand-surface rounded-ini px-4 py-3 font-black text-[10px] outline-none">
              <option value="morning">Morning (08:30)</option>
              <option value="afternoon">Afternoon (12:30)</option>
            </select>
          </div>
          <div className="space-y-2">
            <span className="text-[9px] font-black text-brand-danger block text-center uppercase tracking-widest">Check-Out</span>
            <input 
              type="date" 
              value={form.end_date} 
              onChange={e => setForm({ ...form, end_date: e.target.value })} 
              className="w-full bg-brand-surface rounded-ini px-4 py-3 font-black text-[10px] outline-none" 
            />
            <select value={form.end_slot} onChange={e => setForm({ ...form, end_slot: e.target.value })} className="w-full bg-brand-surface rounded-ini px-4 py-3 font-black text-[10px] outline-none">
              <option value="morning">Ends 12:30</option>
              <option value="afternoon">Ends 17:30</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alt Kısım: Butonlar */}
      <div className="flex flex-col md:flex-row gap-3 mt-8">
        <button 
          onClick={handleCreate} 
          disabled={isDisabled}
          className={`flex-[2] py-4 rounded-ini font-black text-[11px] tracking-[0.2em] uppercase transition-all shadow-md
            ${isDisabled 
              ? 'bg-brand-surface text-brand-muted cursor-not-allowed opacity-60' 
              : 'bg-brand-primary text-white hover:bg-brand-secondary active:scale-[0.98] shadow-brand-primary/20'
            }`}
        >
          {submitting ? 'Processing...' : isTimeInvalid ? 'Invalid Time Range' : 'Commit Reservation'}
        </button>
        <button 
          onClick={onCancel} 
          className="flex-1 bg-brand-surface text-brand-muted py-4 rounded-ini font-black text-[11px] tracking-widest uppercase hover:bg-brand-surface/80 transition-all"
        >
          Dismiss
        </button>
      </div>
      
      {/* Uyarı Notu */}
      {isTimeInvalid && !isFormEmpty && (
        <p className="text-center text-brand-danger font-black text-[8px] mt-3 uppercase tracking-tighter animate-pulse">
          ⚠ Departure must be scheduled after arrival time.
        </p>
      )}
    </div>
  );
}