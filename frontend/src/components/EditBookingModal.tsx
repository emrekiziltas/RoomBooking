import { useState, useEffect } from 'react';
import type { Booking } from '../types/index';
import { Crown, Star, User, ShieldCheck } from 'lucide-react';

interface EditBookingModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSave: (id: number, updatedData: any) => Promise<void>;
  onDelete?: () => void;
  guestRoles: any[];
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
    snapshot_guest_role_id: 0,
    check_in: '',
    check_out: '',
    check_in_time: '09:00:00',
    check_out_time: '12:30:00',
    room_id: 0
  });

  const roleMap = guestRoles.reduce((acc: any, role: any) => {
    acc[role.id] = role;
    return acc;
  }, {});

  const getRoleIcon = (roleLabel: string) => {
    const label = roleLabel?.toUpperCase() || '';
    if (label.includes('ORGANISER')) return <Crown className="w-4 h-4 mr-2" />;
    if (label.includes('VIP')) return <ShieldCheck className="w-4 h-4 mr-2" />;
    return <User className="w-4 h-4 mr-2" />;
  };

  useEffect(() => {
    if (isOpen && booking) {
      const b = booking as any;
      const guest = b.guest;

      const rawCheckIn = b.check_in || '';
      const rawCheckOut = b.check_out || '';

      const [ciDate, ciTime] = rawCheckIn.includes(' ') ? rawCheckIn.split(' ') : [rawCheckIn, '09:00:00'];
      const [coDate, coTime] = rawCheckOut.includes(' ') ? rawCheckOut.split(' ') : [rawCheckOut, '17:00:00'];

      const dbRoleId = b.snapshot_guest_role_id || guest?.role_id || 33;

      setForm({
        full_name: b.snapshot_guest_name || guest?.full_name || '',
        is_vip: Boolean(b.snapshot_is_vip ?? guest?.is_vip),
        snapshot_guest_role_id: Number(dbRoleId),
        check_in: (ciDate || '').slice(0, 10),
        check_in_time: ciTime || '09:00:00',
        check_out: (coDate || '').slice(0, 10),
        check_out_time: coTime || '17:00:00',
        room_id: Number(b.room_id || b.room?.id || 0)
      });
    }
  }, [booking, isOpen]);

  if (!isOpen || !booking) return null;

  const handleConfirm = async () => {
    await onSave(booking.id, {
      snapshot_guest_name: form.full_name,
      snapshot_guest_role_id: form.snapshot_guest_role_id,
      snapshot_is_vip: form.is_vip ? 1 : 0,
      guest_data: {
        full_name: form.full_name,
        is_vip: form.is_vip ? 1 : 0,
        role_id: form.snapshot_guest_role_id 
      },
      check_in: `${form.check_in} ${form.check_in_time}`,
      check_out: `${form.check_out} ${form.check_out_time}`,
      room_id: form.room_id
    });
    onClose();
  };

  const timeOptions = [
    { label: '09:00 (MORNING)', value: '09:00:00' },
    { label: '12:30 (NOON)', value: '12:30:00' },
    { label: '14:00 (STANDARD)', value: '14:00:00' },
    { label: '17:00 (EVENING)', value: '17:00:00' }
  ];

  const currentRole = roleMap[form.snapshot_guest_role_id];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[6000] p-4 text-left">
<div className="bg-white border-4 border-slate-800 p-8 w-full max-w-lg animate-in zoom-in-95 duration-200 shadow-[12px_12px_0px_#000]">
        
        {/* HEADER SECTION - Başlık, İkonlar ve X Butonu Yan Yana */}
        <div className="flex justify-between items-center mb-6 border-b-4 border-slate-800 pb-4">
          <div className="flex items-center gap-4"> 
            {/* Başlık */}
            <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter whitespace-nowrap">
              Quick <span className="text-brand-primary">Edit</span>
            </h2>
            
            {/* Badge'ler */}
            <div className="flex items-center gap-2 pt-1"> 
              {/* ROL BADGE */}
              <div className={`inline-flex items-center px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-2 border-black transition-all shadow-[2px_2px_0px_#000] ${currentRole?.bg_color_class || 'bg-slate-200'}`}>
                {getRoleIcon(currentRole?.label)}
                {currentRole?.label || 'Standard'}
              </div>

              {/* VIP YILDIZI */}
              {form.is_vip && (
                <div className="inline-flex items-center px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-2 border-yellow-600 bg-yellow-400 text-black shadow-[2px_2px_0px_#000] animate-pulse">
                  <Star className="w-4 h-4 mr-1 fill-black" />
                  VIP
                </div>
              )}
            </div>
          </div>

          {/* KAPATMA BUTONU (Şimdi doğru yerde) */}
          <button onClick={onClose} className="text-2xl font-black hover:text-red-500 transition-colors ml-4">✕</button>
        </div>

        {/* FORM İÇERİĞİ (Geri kalan her şey burada devam ediyor) */}
        <div className="space-y-6">
          {/* GUEST NAME */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Guest Name</label>
            <input 
              type="text" 
              value={form.full_name} 
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
              className="w-full bg-slate-100 border-2 border-slate-800 px-4 py-3 font-black text-sm outline-none focus:bg-white uppercase" 
            />
          </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ROLE DROPDOWN */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Guest Role</label>
              <div className="relative">
                <select 
                  value={form.snapshot_guest_role_id}
                  onChange={(e) => setForm({ ...form, snapshot_guest_role_id: Number(e.target.value) })}
                  className={`w-full border-2 border-slate-800 px-4 py-[11px] font-black text-xs outline-none appearance-none cursor-pointer shadow-[4px_4px_0px_#000] transition-all ${currentRole?.bg_color_class || 'bg-white'}`}
                >
                  {[...guestRoles].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map((role) => (
                    <option key={role.id} value={role.id} className="bg-white text-slate-800 font-bold italic">
                      {role.label.toUpperCase()}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none font-black text-[10px]">▼</div>
              </div>
            </div>

            {/* VIP TOGGLE */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Special Status</label>
              <div 
                onClick={() => setForm({ ...form, is_vip: !form.is_vip })}
                className={`cursor-pointer border-2 h-[46px] px-4 flex items-center justify-between transition-all shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 ${form.is_vip ? 'bg-yellow-100 border-yellow-500' : 'bg-slate-50 border-slate-800'}`}
              >
                <span className="text-[10px] font-black uppercase tracking-tighter">
                  {form.is_vip ? '🌟 VIP GUEST' : '👤 STANDARD'}
                </span>
                <div className={`w-5 h-5 border-2 border-slate-800 flex items-center justify-center ${form.is_vip ? 'bg-yellow-400' : 'bg-white'}`}>
                  {form.is_vip && <span className="text-[10px]">✔</span>}
                </div>
              </div>
            </div>
          </div>

          {/* DATES & TIMES */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-brand-primary uppercase ml-1">Check-In</label>
                <input 
                  type="date" 
                  value={form.check_in} 
                  onChange={(e) => setForm({ ...form, check_in: e.target.value })} 
                  className="w-full bg-slate-100 border-2 border-slate-800 px-3 py-2 font-black text-xs outline-none focus:bg-white" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase italic ml-1">Entry Hour</label>
                <select 
                  value={form.check_in_time}
                  onChange={(e) => setForm({ ...form, check_in_time: e.target.value })}
                  className="w-full bg-white border-2 border-slate-800 px-2 py-1.5 font-black text-[10px] outline-none shadow-[2px_2px_0px_#000]"
                >
                  {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-red-500 uppercase ml-1">Check-Out</label>
                <input 
                  type="date" 
                  value={form.check_out} 
                  onChange={(e) => setForm({ ...form, check_out: e.target.value })} 
                  className="w-full bg-slate-100 border-2 border-slate-800 px-3 py-2 font-black text-xs outline-none focus:bg-white" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase italic ml-1">Exit Hour</label>
                <select 
                  value={form.check_out_time}
                  onChange={(e) => setForm({ ...form, check_out_time: e.target.value })}
                  className="w-full bg-white border-2 border-slate-800 px-2 py-1.5 font-black text-[10px] outline-none shadow-[2px_2px_0px_#000]"
                >
                  {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col gap-3 mt-10">
          <button 
            onClick={handleConfirm}
            className="w-full bg-slate-800 text-white py-4 font-black text-[11px] tracking-[0.2em] hover:bg-brand-primary transition-all uppercase shadow-[4px_4px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            Save Changes ✓
          </button>
          
          <div className="flex gap-3">
            {onDelete && (
              <button onClick={onDelete} className="flex-1 bg-white border-2 border-red-600 text-red-600 py-3 font-black text-[10px] tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all uppercase">
                Delete
              </button>
            )}
            <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-400 py-3 font-black text-[10px] tracking-[0.2em] hover:bg-slate-200 transition-all uppercase">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}