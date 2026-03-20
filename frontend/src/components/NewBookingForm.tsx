import { useState, useEffect } from 'react';
import { createBooking } from '../api/bookings';
import { searchGuests } from '../api/guests';
import type { Room } from '../types';
import { Star, User, X, Search, Loader2, ArrowRight, Calendar as CalIcon, Clock } from 'lucide-react';

interface NewBookingFormProps {
  rooms: Room[];
  guestRoles: any[];
  onSuccess: () => void;
  onCancel: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export function NewBookingForm({ rooms, guestRoles = [], onSuccess, onCancel, showToast }: NewBookingFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const [form, setForm] = useState({
    room_id: '',
    guest_id: null as number | null,
    snapshot_guest_name: '',
    snapshot_guest_role_id: 33,
    snapshot_guest_email: '',
    snapshot_is_vip: false,
    check_in: new Date().toISOString().split('T')[0],
    check_in_time: '14:00',
    check_out: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Yarına kur
    check_out_time: '12:00',
  });

  const h = "h-11";
  const inputBase = `${h} bg-white border-2 border-slate-800 font-black text-[11px] outline-none transition-all shadow-[3px_3px_0px_#000] focus:shadow-none focus:translate-x-0.5 focus:translate-y-0.5 px-3`;
  const isDisabled = !form.room_id || !form.snapshot_guest_name.trim() || submitting;

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (form.snapshot_guest_name.length >= 2 && !form.guest_id) {
        setSearching(true);
        try {
          const results = await searchGuests(form.snapshot_guest_name);
          setSearchResults(results);
          setShowResults(true);
        } catch (err) { console.error(err); } finally { setSearching(false); }
      } else { setShowResults(false); }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [form.snapshot_guest_name, form.guest_id]);

  const selectGuest = (guest: any) => {
    setForm(prev => ({
      ...prev,
      guest_id: guest.id,
      snapshot_guest_name: guest.full_name,
      snapshot_guest_email: guest.email || '',
      snapshot_guest_role_id: guest.role_id || prev.snapshot_guest_role_id,
      snapshot_is_vip: Boolean(guest.is_vip)
    }));
    setShowResults(false);
  };

// NewBookingForm.tsx içindeki handleCreate'i şu şekilde güncelle:

const handleCreate = async () => {
  if (isDisabled) return;
  setSubmitting(true);
  try {
    // Laravel'in itiraz edemeyeceği temiz bir paket hazırlıyoruz
    const payload = {
      room_id: Number(form.room_id),
      guest_id: form.guest_id, // Null olabilir
      snapshot_guest_name: form.snapshot_guest_name.toUpperCase().trim(),
      snapshot_guest_email: form.snapshot_guest_email || 'guest@hotel.com',
      snapshot_guest_role_id: Number(form.snapshot_guest_role_id),
      snapshot_is_vip: form.snapshot_is_vip ? 1 : 0,
      
      // Tarihleri YYYY-MM-DD HH:mm:ss formatına zorluyoruz
      check_in: `${form.check_in} ${form.check_in_time}:00`,
      check_out: `${form.check_out} ${form.check_out_time}:00`,
    };

    console.log("✈️ Giden Payload:", payload); // Bunu konsoldan kontrol et

    await createBooking(payload);
    showToast("RESERVATION RECORDED ✓", "success");
    onSuccess();
  } catch (err: any) {
    // 422 hatası aldığında detayları konsola yazdır ki görelim
    if (err.response && err.response.status === 422) {
      console.error("❌ VALIDASYON HATASI:", err.response.data.errors);
      showToast("CHECK FORM FIELDS", "error");
    } else {
      showToast("SAVE FAILED", "error");
    }
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="bg-white border-4 border-slate-800 p-5 shadow-[12px_12px_0px_#000] animate-in fade-in zoom-in duration-200">
      <div className="grid grid-cols-12 gap-4">
        
        {/* SOL KOLON: Misafir Bilgileri */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Guest Info</label>
           <div className="relative">
              <input
                type="text"
                placeholder="SEARCH GUEST..."
                value={form.snapshot_guest_name}
                onChange={e => setForm({ ...form, snapshot_guest_name: e.target.value, guest_id: null })}
                className={`${inputBase} w-full pl-10 uppercase ${form.guest_id ? 'bg-blue-50 border-blue-600' : ''}`}
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800" />
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-slate-800 z-[9999] shadow-[8px_8px_0px_#000] max-h-48 overflow-y-auto">
                  {searchResults.map(guest => (
                    <div key={guest.id} onClick={() => selectGuest(guest)} className="p-2 hover:bg-yellow-50 cursor-pointer border-b-2 border-slate-100 flex justify-between items-center font-black text-[10px] uppercase">
                      <span>{guest.full_name}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  ))}
                </div>
              )}
           </div>
           
           <div className="flex gap-2">
              <select
                value={form.snapshot_guest_role_id}
                onChange={e => setForm({ ...form, snapshot_guest_role_id: Number(e.target.value) })}
                className={`${inputBase} flex-1 uppercase`}
              >
                {guestRoles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
              </select>
              
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, snapshot_is_vip: !f.snapshot_is_vip }))}
                className={`${h} px-4 border-2 border-slate-800 flex items-center gap-2 shadow-[3px_3px_0px_#000] active:shadow-none ${form.snapshot_is_vip ? 'bg-yellow-400' : 'bg-slate-50 text-slate-400'}`}
              >
                <Star className={`w-4 h-4 ${form.snapshot_is_vip ? 'fill-black' : ''}`} />
              </button>
           </div>
        </div>

        {/* ORTA KOLON: Tarih & Oda */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-3">
           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stay & Schedule</label>
           <div className="flex flex-wrap gap-2">
              <select
                value={form.room_id}
                onChange={e => setForm({ ...form, room_id: e.target.value })}
                className={`${inputBase} w-32 bg-yellow-50 uppercase`}
              >
                <option value="">ROOM</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>

              <div className="flex items-center border-2 border-slate-800 bg-white shadow-[3px_3px_0px_#000]">
                <div className="px-2 border-r-2 border-slate-800 bg-slate-100 flex items-center h-full"><CalIcon className="w-3 h-3"/></div>
                <input type="date" value={form.check_in} onChange={e => setForm({...form, check_in: e.target.value})} className="h-full px-2 text-[10px] font-black outline-none w-28"/>
                <input type="time" value={form.check_in_time} onChange={e => setForm({...form, check_in_time: e.target.value})} className="h-full px-2 border-l-2 border-slate-800 text-[10px] font-black outline-none w-20"/>
              </div>

              <div className="flex items-center border-2 border-slate-800 bg-white shadow-[3px_3px_0px_#000]">
                <div className="px-2 border-r-2 border-slate-800 bg-slate-100 flex items-center h-full"><ArrowRight className="w-3 h-3"/></div>
                <input type="date" value={form.check_out} onChange={e => setForm({...form, check_out: e.target.value})} className="h-full px-2 text-[10px] font-black outline-none w-28"/>
                <input type="time" value={form.check_out_time} onChange={e => setForm({...form, check_out_time: e.target.value})} className="h-full px-2 border-l-2 border-slate-800 text-[10px] font-black outline-none w-20"/>
              </div>
           </div>
        </div>

        {/* SAĞ KOLON: Aksiyonlar */}
        <div className="col-span-12 lg:col-span-2 flex items-end justify-end gap-2">
           <button onClick={onCancel} className={`${h} w-11 flex items-center justify-center border-2 border-slate-800 hover:bg-slate-100 shadow-[3px_3px_0px_#000] active:shadow-none`}>
              <X className="w-5 h-5" />
           </button>
           <button
              onClick={handleCreate}
              disabled={isDisabled}
              className={`${h} flex-1 bg-slate-800 text-white font-black text-[10px] uppercase shadow-[4px_4px_0px_#4f46e5] active:translate-y-1 active:shadow-none disabled:opacity-50`}
            >
              {submitting ? '...' : 'COMMIT ✓'}
           </button>
        </div>

      </div>
    </div>
  );
}