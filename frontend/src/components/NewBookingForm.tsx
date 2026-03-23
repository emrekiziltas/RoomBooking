import { useState, useEffect } from 'react';
import { createBooking } from '../api/bookings';
import { searchGuests } from '../api/guests';
import type { Room } from '../types';
import { Star, X, ArrowRight, Search, ChevronDown } from 'lucide-react';

interface NewBookingFormProps {
  rooms: Room[];
  guestRoles: any[];
  onSuccess: () => void;
  onCancel: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export function NewBookingForm({ rooms, guestRoles = [], onSuccess, onCancel, showToast }: NewBookingFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);

  const [form, setForm] = useState({
    room_id: '',
    guest_id: null as number | null,
    snapshot_guest_name: '',
    snapshot_guest_role_id: 33,
    snapshot_guest_email: '',
    snapshot_is_vip: false,
    status: 'confirmed',
    check_in: new Date().toISOString().split('T')[0],
    check_in_time: '14:00',
    check_out: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    check_out_time: '12:00',
  });

  const isDisabled = !form.room_id || !form.snapshot_guest_name.trim() || submitting;

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (form.snapshot_guest_name.length >= 2 && !form.guest_id) {
        setSearching(true);
        try {
          const results = await searchGuests(form.snapshot_guest_name);
          setSearchResults(results);
          setShowResults(true);
        } catch (err) {
          console.error(err);
        } finally {
          setSearching(false);
        }
      } else {
        setShowResults(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.snapshot_guest_name, form.guest_id]);
useEffect(() => {
  setForm(prev => {
    // Eğer check-out tarihi, yeni check-in tarihinden önce kalıyorsa
    // veya sadece check-in değiştiğinde check-out'u 1 gün sonrasına çekmek istersen:
    const checkInDate = new Date(prev.check_in);
    const checkOutDate = new Date(prev.check_out);

    if (checkOutDate <= checkInDate) {
      const nextDay = new Date(checkInDate);
      nextDay.setDate(nextDay.getDate() ); // Varsayılan 1 gece konaklama
      
      return {
        ...prev,
        check_out: nextDay.toISOString().split('T')[0]
      };
    }
    return prev;
  });
}, [form.check_in]);
  const selectGuest = (guest: any) => {
    setForm(prev => ({
      ...prev,
      guest_id: guest.id,
      snapshot_guest_name: guest.full_name,
      snapshot_guest_email: guest.email || '',
      snapshot_guest_role_id: guest.role_id || prev.snapshot_guest_role_id,
      snapshot_is_vip: Boolean(guest.is_vip),
    }));
    setShowResults(false);
  };

  const handleCreate = async () => {
    if (isDisabled) return;
    setSubmitting(true);
    try {
      await createBooking({
        room_id: Number(form.room_id),
        guest_id: form.guest_id ?? undefined,
        snapshot_guest_name: form.snapshot_guest_name.toUpperCase().trim(),
        snapshot_guest_email: form.snapshot_guest_email || 'guest@hotel.com',
        snapshot_guest_role_id: Number(form.snapshot_guest_role_id)?? undefined,
        snapshot_is_vip: form.snapshot_is_vip ? 1 : 0,
        status: form.status,
        check_in: `${form.check_in} ${form.check_in_time}:00`,
        check_out: `${form.check_out} ${form.check_out_time}:00`,
      });
      showToast("RESERVATION RECORDED ✓", "success");
      onSuccess();
    } catch (err: any) {
      showToast("SAVE FAILED", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const h = 'h-9'; 
  const inputBase = `${h} border-2 border-slate-800 font-bold text-[10px] uppercase outline-none bg-white shadow-[2px_2px_0px_#0f172a] transition-all`;
  const divider = <div className="h-5 w-px bg-slate-300 mx-1 flex-shrink-0" />;

  return (
    <div className="relative bg-white border-2 border-slate-800 shadow-[6px_6px_0px_#0f172a] mb-4 overflow-visible">
      <div className="h-0.5 bg-brand-primary" />

      <div className="flex flex-wrap items-center gap-2 px-3 py-2">

        {/* GUEST SEARCH */}
        <div className="relative flex-shrink-0 z-[50]">
          <div className={`flex items-center border-2 shadow-[2px_2px_0px_#0f172a] ${form.guest_id ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-800 bg-white'}`}>
            <span className="pl-2 text-slate-400">
              {searching ? <span className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin inline-block" /> : <Search className="w-3 h-3" />}
            </span>
            <input
              type="text"
              placeholder="Guest Name..."
              value={form.snapshot_guest_name}
              onChange={e => setForm({ ...form, snapshot_guest_name: e.target.value, guest_id: null })}
              className={`${h} w-60 px-2 text-[10px] font-bold uppercase outline-none bg-transparent placeholder:text-slate-300`}
            />
            {form.guest_id && (
              <button onClick={() => setForm(f => ({ ...f, guest_id: null, snapshot_guest_name: '' }))} className="pr-2 text-slate-300 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {showResults && (
            <div className="absolute top-full left-0 mt-1 bg-white border-2 border-slate-800 z-[100] shadow-[6px_6px_0px_#0f172a] w-full min-w-[280px] max-h-48 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-3 text-[9px] font-bold text-slate-400 text-center italic">No results</div>
              ) : searchResults.map(guest => (
                <div key={guest.id} onClick={() => selectGuest(guest)} className="px-3 py-2 hover:bg-yellow-50 cursor-pointer border-b border-slate-100 flex justify-between items-center group">
                  <div className="text-left overflow-hidden">
                    <p className="font-bold text-[10px] uppercase text-slate-800 truncate leading-tight">{guest.full_name}</p>
                    {guest.email && <p className="text-[8px] text-slate-400 normal-case truncate">{guest.email}</p>}
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-brand-primary flex-shrink-0 ml-2" />
                </div>
              ))}
            </div>
          )}
        </div>
    {/* VIP BUTTON WITH TEXT */}
        <button type="button" onClick={() => setForm(f => ({ ...f, snapshot_is_vip: !f.snapshot_is_vip }))}
          className={`${h} px-3 border-2 border-slate-800 flex items-center gap-1.5 shadow-[2px_2px_0px_#0f172a] transition-all
            ${form.snapshot_is_vip ? 'bg-yellow-400 border-yellow-500' : 'bg-white hover:bg-slate-50'}`}>
          <Star className={`w-3.5 h-3.5 ${form.snapshot_is_vip ? 'fill-slate-800 text-slate-800' : 'text-slate-300'}`} />
          <span className={`text-[9px] font-black uppercase ${form.snapshot_is_vip ? 'text-slate-800' : 'text-slate-400'}`}>
            VIP
          </span>
        </button>

        {divider}
          {/* ROOM */}
        <div className="relative flex-shrink-0">
          <select value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}
            className={`${inputBase} px-2 pr-6 appearance-none bg-amber-50 min-w-[70px]`}>
            <option value="">Room</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
         {divider}
        {/* ROLE */}
        <div className="relative flex-shrink-0">
          <select value={form.snapshot_guest_role_id} onChange={e => setForm({ ...form, snapshot_guest_role_id: Number(e.target.value) })}
            className={`${inputBase} px-2 pr-6 appearance-none min-w-[85px]`}>
            {guestRoles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>

     {divider}

      

        {/* STATUS - NOW WHITE THEME */}
        <div className="relative flex-shrink-0">
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
            className={`${inputBase} px-2 pr-6 appearance-none min-w-[100px]`}>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="pending">Pending</option>
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>

        {divider}

        {/* CHECK-IN */}
        <div className="flex items-center border-2 border-slate-800 shadow-[2px_2px_0px_#0f172a] bg-white flex-shrink-0">
          <input type="date" value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })}
            className={`${h} px-1.5 text-[9px] font-bold outline-none w-[105px] bg-transparent`} />
          <input type="time" value={form.check_in_time} onChange={e => setForm({ ...form, check_in_time: e.target.value })}
            className={`${h} px-1.5 border-l-2 border-slate-800 text-[9px] font-bold outline-none bg-slate-50/50 w-[80px]`} />
        </div>

        <span className="text-slate-400 font-bold text-[10px]">→</span>

        {/* CHECK-OUT */}
        <div className="flex items-center border-2 border-slate-800 shadow-[2px_2px_0px_#0f172a] bg-white flex-shrink-0">
          <input type="date" value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })}
            className={`${h} px-1.5 text-[9px] font-bold outline-none w-[105px] bg-transparent`} />
          <input type="time" value={form.check_out_time} onChange={e => setForm({ ...form, check_out_time: e.target.value })}
            className={`${h} px-1.5 border-l-2 border-slate-800 text-[9px] font-bold outline-none bg-slate-50/50 w-[80px]`} />
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button type="button" onClick={onCancel} className={`${h} w-9 flex items-center justify-center border-2 border-slate-800 bg-white hover:bg-red-50 shadow-[2px_2px_0px_#0f172a]`}>
            <X className="w-4 h-4 text-slate-400" />
          </button>
          <button type="button" onClick={handleCreate} disabled={isDisabled}
            className={`${h} px-4 font-bold text-[10px] uppercase border-2 border-slate-800 transition-all ${isDisabled ? 'bg-slate-100 text-slate-300 shadow-none' : 'bg-slate-900 text-white shadow-[2px_2px_0px_#4f46e5] active:shadow-none'}`}>
            {submitting ? '...' : 'COMMIT ✓'}
          </button>
        </div>

      </div>
    </div>
  );
}