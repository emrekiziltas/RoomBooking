import { useState, useEffect, useMemo } from 'react';
import type { Booking } from '../types/index';
import { Star, User, LogIn, CheckCircle, X, Search, ChevronDown } from 'lucide-react';

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

  const currentRole = useMemo(() => {
    if (!guestRoles.length) return null;
    return guestRoles.find(r => String(r.id) === String(form.snapshot_guest_role_id));
  }, [guestRoles, form.snapshot_guest_role_id]);

useEffect(() => {
  if (isOpen && booking) {
    const b = booking as any;
    
    // Calendar.tsx'te hazırladığımız temizlenmiş verileri öncelikli kullanıyoruz
    // Eğer onlar yoksa (direkt objeden geliyorsa) parçalıyoruz
    const ciDate = b.check_in_date || (b.check_in?.includes('T') ? b.check_in.split('T')[0] : b.check_in?.split(' ')[0]);
    const coDate = b.check_out_date || (b.check_out?.includes('T') ? b.check_out.split('T')[0] : b.check_out?.split(' ')[0]);
    
    // Saatleri sadece HH:mm formatına (08:30 gibi) çekiyoruz
    const ciTime = b.check_in_time || (b.check_in?.includes('T') ? b.check_in.split('T')[1].slice(0, 5) : b.check_in?.split(' ')[1]?.slice(0, 5) || '08:30');
    const coTime = b.check_out_time || (b.check_out?.includes('T') ? b.check_out.split('T')[1].slice(0, 5) : b.check_out?.split(' ')[1]?.slice(0, 5) || '17:00');

    setForm({
      full_name: b.snapshot_guest_name || b.guest?.full_name || '',
      is_vip: Boolean(b.snapshot_is_vip ?? b.guest?.is_vip),
      status: b.status || 'confirmed',
      snapshot_guest_role_id: Number(b.snapshot_guest_role_id || b.guest?.role_id || 33),
      check_in: ciDate,
      check_in_time: ciTime, // Artık temiz 08:30 geliyor
      check_out: coDate,
      check_out_time: coTime, // Artık temiz 17:00 geliyor
      room_id: Number(b.room_id || b.room?.id || 0)
    });
  }
}, [booking, isOpen]);
  if (!isOpen || !booking) return null;

const handleConfirm = async () => {
  try {
    // Saatlerin sonunda saniye yoksa (08:30 ise) :00 ekle
    const finalCiTime = form.check_in_time.length === 5 ? `${form.check_in_time}:00` : form.check_in_time;
    const finalCoTime = form.check_out_time.length === 5 ? `${form.check_out_time}:00` : form.check_out_time;

    const payload = {
      full_name: form.full_name,
      room_id: Number(form.room_id),
      status: form.status,
      snapshot_guest_name: form.full_name.toUpperCase(),
      snapshot_is_vip: form.is_vip ? 1 : 0, 
      snapshot_guest_role_id: Number(form.snapshot_guest_role_id),
      check_in: `${form.check_in} ${finalCiTime}`,
      check_out: `${form.check_out} ${finalCoTime}`,
    };

    await onSave(booking!.id, payload);
    onClose();
  } catch (error) {
    console.error("DB Yazma Hatası:", error);
  }
};
const checkInTimes = [
  { value: "08:30", label: "08:30" },
  { value: "12:30", label: "12:30" }
];

const checkOutTimes = [
  { value: "12:15", label: "12:15" },
  { value: "17:00", label: "17:00" }
];
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 text-left">
      <div className="bg-white border-4 border-slate-800 p-6 w-full max-w-lg animate-in zoom-in-95 duration-200 shadow-[8px_8px_0px_#000]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4 border-b-2 border-slate-800 pb-3">
          <div className="flex items-center gap-3"> 
            <h2 className="text-2xl font-black text-slate-800 italic tracking-tighter uppercase">
              Quick <span className="text-brand-primary">Edit</span>
            </h2>
            <div className="px-2 py-1 text-[9px] font-black uppercase border-2 border-black shadow-[1px_1px_0px_#000] bg-slate-100">
              {currentRole?.label || 'Standard'}
            </div>
          </div>
          <button onClick={onClose} className="text-xl font-black hover:text-red-500 transition-colors">✕</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* GUEST NAME */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Guest Name</label>
              <input 
                type="text" 
                value={form.full_name} 
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                className="w-full bg-slate-50 border-2 border-slate-800 px-3 py-2 font-black text-sm outline-none focus:bg-white transition-all" 
              />
            </div>

            {/* GUEST ROLE SELECT */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Guest Role</label>
              <div className="relative">
                <select 
                  value={String(form.snapshot_guest_role_id)}
                  onChange={(e) => {
                    const newId = Number(e.target.value);
                    const selectedRole = guestRoles.find(r => Number(r.id) === newId);
                    setForm({ 
                      ...form, 
                      snapshot_guest_role_id: newId,
                      is_vip: selectedRole?.metadata?.is_vip ?? form.is_vip 
                    });
                  }}
                  className="w-full bg-white border-2 border-slate-800 px-3 py-2 font-black text-sm outline-none shadow-[2px_2px_0px_#000] focus:shadow-none transition-all appearance-none cursor-pointer"
                >
                  {guestRoles.length === 0 ? (
                    <option value="33">LOADING...</option>
                  ) : (
                    guestRoles.map(role => (
                      <option key={role.id} value={String(role.id)}>
                        {role.label.toUpperCase()}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
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

                  {/* CHECK-IN SATIRI */}
<div className="flex items-end gap-3 mb-4"> {/* mb-4 ekledim ki yapışmasın */}
  <div className="flex-1 space-y-1">
    <label className="text-[9px] font-black text-brand-primary uppercase block">Check-In Tarihi</label>
    <input 
      type="date" 
      value={form.check_in} 
      onChange={(e) => setForm({ ...form, check_in: e.target.value })} 
      className="w-full bg-slate-50 border-2 border-slate-800 px-2 py-1.5 font-black text-[11px] outline-none" 
    />
  </div>
  <div className="w-32 space-y-1">
    <label className="text-[9px] font-black text-brand-primary uppercase block">Giriş Saati</label>
    <select 
      value={form.check_in_time} 
      onChange={(e) => setForm({ ...form, check_in_time: e.target.value })} 
      className="w-full bg-white border-2 border-slate-800 px-2 py-1.5 font-black text-[11px] cursor-pointer"
    >
      <option value="08:30">08:30</option>
      <option value="12:30">12:30</option>
    </select>
  </div>
</div>

{/* CHECK-OUT SATIRI - Bu div artık check-in div'inin dışında */}
<div className="flex items-end gap-3">
  <div className="flex-1 space-y-1">
    <label className="text-[9px] font-black text-red-500 uppercase block">Check-Out Tarihi</label>
    <input 
      type="date" 
      value={form.check_out} 
      onChange={(e) => setForm({ ...form, check_out: e.target.value })} 
      className="w-full bg-slate-50 border-2 border-slate-800 px-2 py-1.5 font-black text-[11px] outline-none" 
    />
  </div>
  <div className="w-32 space-y-1">
    <label className="text-[9px] font-black text-red-500 uppercase block">Çıkış Saati</label>
    <select 
      value={form.check_out_time} 
      onChange={(e) => setForm({ ...form, check_out_time: e.target.value })} 
      className="w-full bg-white border-2 border-slate-800 px-2 py-1.5 font-black text-[11px] cursor-pointer"
    >
      <option value="12:15">12:15</option>

      <option value="17:00">17:00</option>
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