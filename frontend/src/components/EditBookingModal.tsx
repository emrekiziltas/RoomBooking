import { useState, useEffect, useMemo } from 'react';
import type { Booking } from '../types/index';
import { Star, User, LogIn, CheckCircle, X, ShieldCheck, Crown } from 'lucide-react';

interface EditBookingModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSave: (id: number, data: any) => Promise<void>;
  onDelete?: () => void;
  guestRoles?: any[];
}

export function EditBookingModal({ 
  isOpen, 
  booking, 
  onClose, 
  onSave, 
  onDelete, 
  guestRoles = [] 
}: EditBookingModalProps) {
  
  const [form, setForm] = useState({
    full_name: '',
    is_vip: false,
    status: 'confirmed',
    snapshot_guest_role_id: 33,
    check_in: '',
    check_out: '',
    check_in_time: '14:00:00',
    check_out_time: '12:00:00',
    room_id: 0
  });

  const timeOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0');
      return { label: `${hour}:00`, value: `${hour}:00:00` };
    });
  }, []);

  // Seçili rolü bulur (Badge ve İkon için)
  const currentRole = useMemo(() => {
    return guestRoles.find(r => Number(r.id) === Number(form.snapshot_guest_role_id));
  }, [guestRoles, form.snapshot_guest_role_id]);

useEffect(() => {
  if (isOpen && booking) {
    const b = booking as any;
    const guest = b.guest;
    
    // API'den gelen veriyi (ISO formatı) güvenli bir şekilde ayıklayalım
    // Örnek: "2026-03-28T14:00:00.000000Z" -> "2026-03-28"
    const rawCheckIn = b.check_in || '';
    const rawCheckOut = b.check_out || '';

    // Sadece ilk 10 karakteri alarak YYYY-MM-DD formatını garantiliyoruz
    const ciDate = rawCheckIn.includes('T') ? rawCheckIn.split('T')[0] : rawCheckIn.split(' ')[0];
    const coDate = rawCheckOut.includes('T') ? rawCheckOut.split('T')[0] : rawCheckOut.split(' ')[0];

    // Saati ayıklayalım (T'den sonraki kısmı al veya varsayılan ata)
    const ciTime = rawCheckIn.includes('T') ? rawCheckIn.split('T')[1].slice(0, 8) : (rawCheckIn.split(' ')[1] || '14:00:00');
    const coTime = rawCheckOut.includes('T') ? rawCheckOut.split('T')[1].slice(0, 8) : (rawCheckOut.split(' ')[1] || '12:00:00');

    setForm({
      full_name: b.snapshot_guest_name || guest?.full_name || '',
      is_vip: Boolean(b.snapshot_is_vip ?? guest?.is_vip),
      status: b.status || 'confirmed',
      snapshot_guest_role_id: Number(b.snapshot_guest_role_id || guest?.role_id || 33),
      check_in: ciDate, // Artık "2026-03-28" formatında
      check_in_time: ciTime,
      check_out: coDate, // Artık "2026-04-01" formatında
      check_out_time: coTime,
      room_id: Number(b.room_id || b.room?.id || 0)
    });
  }
}, [booking, isOpen]);

  if (!isOpen || !booking) return null;

const handleConfirm = async () => {
  try {
    const payload = {
      // Mevcut form verileri
      full_name: form.full_name,
      room_id: Number(form.room_id),
      status: form.status, // 'checked_in' veya 'confirmed'
      
      // Snapshot alanları (API genelde bunları string/integer bekler)
      snapshot_guest_name: form.full_name.toUpperCase(),
      snapshot_is_vip: form.is_vip ? 1 : 0, 
      snapshot_guest_role_id: Number(form.snapshot_guest_role_id),
      
      // Tarih formatı: API "YYYY-MM-DD HH:mm:ss" bekliyor olabilir
      check_in: `${form.check_in} ${form.check_in_time}`,
      check_out: `${form.check_out} ${form.check_out_time}`,
    };

    console.log("Gönderilen Veri:", payload); // Tarayıcı konsolundan kontrol et

    await onSave(booking.id, payload);
    onClose();
  } catch (error) {
    console.error("DB Yazma Hatası:", error);
  }
};

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 text-left">
      <div className="bg-white border-4 border-slate-800 p-6 w-full max-w-lg animate-in zoom-in-95 duration-200 shadow-[8px_8px_0px_#000]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4 border-b-2 border-slate-800 pb-3">
          <div className="flex items-center gap-3"> 
            <h2 className="text-2xl font-black text-slate-800 italic tracking-tighter uppercase">
              Quick <span className="text-brand-primary">Edit</span>
            </h2>
            <div className={`px-2 py-1 text-[9px] font-black uppercase border-2 border-black shadow-[1px_1px_0px_#000] bg-slate-100`}>
              {currentRole?.label || 'Standard'}
            </div>
          </div>
          <button onClick={onClose} className="text-xl font-black hover:text-red-500 transition-colors">✕</button>
        </div>

        <div className="space-y-4">
          {/* GUEST NAME & ROLE ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Guest Name</label>
              <input 
                type="text" 
                value={form.full_name} 
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                className="w-full bg-slate-50 border-2 border-slate-800 px-3 py-2 font-black text-sm outline-none focus:bg-white transition-all" 
              />
            </div>
            
            {/* GUEST ROLE DROPDOWN (Geri gelen alan) */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Guest Role</label>
              <select 
                value={form.snapshot_guest_role_id}
                onChange={(e) => setForm({ ...form, snapshot_guest_role_id: Number(e.target.value) })}
                className="w-full bg-white border-2 border-slate-800 px-3 py-2 font-black text-sm outline-none shadow-[2px_2px_0px_#000] focus:shadow-none transition-all appearance-none cursor-pointer"
              >
                {guestRoles.map(role => (
                  <option key={role.id} value={role.id}>{role.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* VIP TOGGLE */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">VIP Status</label>
              <button 
                onClick={() => setForm({ ...form, is_vip: !form.is_vip })}
                className={`w-full border-2 h-[40px] px-3 flex items-center justify-between shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all ${form.is_vip ? 'bg-yellow-400 border-black' : 'bg-slate-50 border-slate-400'}`}
              >
                <span className="text-[9px] font-black uppercase">{form.is_vip ? 'VIP GUEST' : 'STANDARD'}</span>
                {form.is_vip ? <Star className="w-3 h-3 fill-black" /> : <User className="w-3 h-3" />}
              </button>
            </div>

            {/* STATUS TOGGLE */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Arrival Status</label>
              <button 
                onClick={() => setForm({ ...form, status: form.status === 'checked_in' ? 'confirmed' : 'checked_in' })}
                className={`w-full border-2 h-[40px] px-3 flex items-center justify-between shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all ${form.status === 'checked_in' ? 'bg-green-500 text-white border-black' : 'bg-slate-50 border-slate-400 text-slate-400'}`}
              >
                <span className="text-[9px] font-black uppercase">{form.status === 'checked_in' ? 'IN HOTEL' : 'WAITING'}</span>
                {form.status === 'checked_in' ? <CheckCircle className="w-3 h-3" /> : <LogIn className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* DATES & TIMES */}
          <div className="grid grid-cols-2 gap-3 border-t-2 border-slate-100 pt-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-brand-primary uppercase">Check-In</label>
              <input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-800 px-2 py-1.5 font-black text-[11px] outline-none" />
              <select value={form.check_in_time} onChange={(e) => setForm({ ...form, check_in_time: e.target.value })} className="w-full bg-white border-2 border-slate-800 px-2 py-1 font-black text-[10px]">
                {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-red-500 uppercase">Check-Out</label>
              <input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-800 px-2 py-1.5 font-black text-[11px] outline-none" />
              <select value={form.check_out_time} onChange={(e) => setForm({ ...form, check_out_time: e.target.value })} className="w-full bg-white border-2 border-slate-800 px-2 py-1 font-black text-[10px]">
                {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col gap-2 mt-6">
          <button onClick={handleConfirm} className="w-full bg-slate-800 text-white py-3 font-black text-[10px] tracking-widest hover:bg-brand-primary transition-all uppercase shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
            Save Changes ✓
          </button>
          <div className="flex gap-2">
            {onDelete && (
              <button onClick={onDelete} className="flex-1 bg-white border-2 border-red-600 text-red-600 py-2 font-black text-[9px] hover:bg-red-600 hover:text-white transition-all uppercase">
                Delete
              </button>
            )}
            <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-400 py-2 font-black text-[9px] hover:bg-slate-200 transition-all uppercase">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}