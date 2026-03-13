import { useState } from 'react';
import { createBooking } from '../api/bookings';
import type { Room } from '../types';

const SLOTS = {
  morning: { start: '08:30:00', end: '12:30:00' },
  afternoon: { start: '12:30:00', end: '17:30:00' }
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
      const validationErrors = err.response?.data?.errors;
      if (validationErrors) {
        const errorArrays = Object.values(validationErrors) as string[][];
        if (errorArrays.length > 0 && errorArrays[0].length > 0) {
          showToast(errorArrays[0][0].toUpperCase(), "error");
        }
      } else {
        showToast((err.response?.data?.message || "ACTION FAILED").toUpperCase(), "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  };

  const h = "h-10";
  const base = `${h} bg-brand-surface rounded-ini font-black text-xs outline-none border-2 border-transparent transition-all`;

  return (
    <div className="bg-white border-[6px] border-brand-secondary px-4 py-3 rounded-ini shadow-2xl animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2">

        {/* RESOURCE */}
        <select
          value={form.room_id}
          onChange={e => setForm({ ...form, room_id: e.target.value })}
          className={`${base} focus:border-brand-primary px-3 uppercase cursor-pointer w-28 shrink-0`}
        >
          <option value="">ROOM</option>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>)}
        </select>

        <div className="w-px h-6 bg-brand-surface shrink-0" />

 {/* TITLE / GUEST - flex-1 yaparak genişletildi */}
<div className="flex-1 min-w-[200px] shrink">
  <input
    type="text"
    placeholder="ENTER MISSION OR GUEST NAME..."
    value={form.title}
    onChange={e => setForm({ ...form, title: e.target.value })}
    onKeyDown={e => e.key === 'Enter' && handleCreate()}
    // w-36 kaldırıldı, flex-1 ve min-w eklendi
    className={`${base} w-full focus:border-brand-primary px-4 uppercase tracking-wider text-[11px]`}
  />
</div>
        {/* ARRIVAL */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest">In</span>
          <div className="relative">
            <div className={`${h} flex items-center px-3 bg-brand-surface rounded-ini font-black text-[11px] text-brand-secondary pointer-events-none w-24 justify-center`}>
              {formatDateLabel(form.start_date)}
            </div>
            <input
              type="date"
              value={form.start_date}
              onChange={e => setForm(p => ({ ...p, start_date: e.target.value, end_date: e.target.value }))}
              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full
                         [&::-webkit-calendar-picker-indicator]:absolute
                         [&::-webkit-calendar-picker-indicator]:inset-0
                         [&::-webkit-calendar-picker-indicator]:w-full
                         [&::-webkit-calendar-picker-indicator]:h-full
                         [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
          <select
            value={form.start_slot}
            onChange={e => setForm({ ...form, start_slot: e.target.value })}
            className={`${base} focus:border-brand-primary px-2 cursor-pointer w-24`}
          >
            <option value="morning">08:30</option>
            <option value="afternoon">12:30</option>
          </select>
        </div>

        <span className="text-brand-muted font-black text-xs shrink-0">→</span>

        {/* DEPARTURE */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[8px] font-black text-brand-danger uppercase tracking-widest">Out</span>
          <div className="relative">
            <div className={`${h} flex items-center px-3 bg-brand-surface rounded-ini font-black text-[11px] text-brand-secondary pointer-events-none w-24 justify-center`}>
              {formatDateLabel(form.end_date)}
            </div>
            <input
              type="date"
              value={form.end_date}
              onChange={e => setForm({ ...form, end_date: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full
                         [&::-webkit-calendar-picker-indicator]:absolute
                         [&::-webkit-calendar-picker-indicator]:inset-0
                         [&::-webkit-calendar-picker-indicator]:w-full
                         [&::-webkit-calendar-picker-indicator]:h-full
                         [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
          <select
            value={form.end_slot}
            onChange={e => setForm({ ...form, end_slot: e.target.value })}
            className={`${base} focus:border-brand-danger px-2 cursor-pointer w-24`}
          >
            <option value="morning">12:30</option>
            <option value="afternoon">17:30</option>
          </select>
        </div>

        <div className="w-px h-6 bg-brand-surface shrink-0" />

        {/* ACTIONS */}
        <button
          onClick={handleCreate}
          disabled={isDisabled}
          className={`${h} px-6 rounded-ini font-black text-xs tracking-widest uppercase transition-all whitespace-nowrap active:scale-95 shrink-0
            ${isDisabled ? 'bg-brand-surface text-brand-muted cursor-not-allowed' : 'bg-brand-primary text-white hover:bg-brand-secondary'}`}
        >
          {submitting ? '...' : 'COMMIT ✓'}
        </button>

        <button
          onClick={onCancel}
          className={`${h} w-10 bg-brand-surface text-brand-muted rounded-ini font-black text-sm hover:bg-brand-danger hover:text-white transition-all flex items-center justify-center shrink-0`}
        >
          ✕
        </button>

      </div>

      {isTimeInvalid && !isFormEmpty && (
        <p className="text-[9px] font-black text-brand-danger mt-2 uppercase tracking-widest text-right animate-pulse">
          ⚠ CHECK-OUT MUST BE AFTER ARRIVAL
        </p>
      )}
    </div>
  );
}
