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

  const handleStartDateChange = (newDate: string) => {
    setForm(prev => ({ ...prev, start_date: newDate, end_date: newDate }));
  };

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
    if (!dateStr) return 'SELECT...';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }).toUpperCase();
  };

  const boxHeight = "h-[52px]";

  const CalendarIcon = ({ color }: { color: string }) => (
    <svg className={`w-5 h-5 ${color} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  return (
    <div className="bg-white border-[6px] border-brand-secondary p-4 rounded-ini shadow-2xl animate-in slide-in-from-top duration-300">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-4">

        {/* RESOURCE SELECT */}
        <div className="flex-[1.2] min-w-[160px]">
          <label className="text-[10px] font-black text-brand-muted uppercase ml-1 tracking-[0.2em] mb-1 block">Resource</label>
          <select
            value={form.room_id}
            onChange={e => setForm({ ...form, room_id: e.target.value })}
            className={`w-full bg-brand-surface rounded-ini px-4 font-black text-xs uppercase border-2 border-transparent focus:border-brand-primary outline-none transition-all cursor-pointer ${boxHeight}`}
          >
            <option value="">SELECT RESOURCE</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>)}
          </select>
        </div>

        {/* GUEST / TITLE INPUT */}
        <div className="flex-[2.5] min-w-[240px]">
          <label className="text-[10px] font-black text-brand-muted uppercase ml-1 tracking-[0.2em] mb-1 block">Guest / Title</label>
          <input
            type="text"
            placeholder="ENTER NAME..."
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className={`w-full bg-brand-surface rounded-ini px-4 font-black text-xs uppercase border-2 border-transparent focus:border-brand-primary outline-none transition-all ${boxHeight}`}
          />
        </div>

        {/* ARRIVAL DATE PICKER */}
        <div className="flex-[3] min-w-[280px]">
          <span className="text-[10px] font-black text-brand-primary uppercase ml-1 tracking-[0.2em] mb-1 block">Arrival</span>
          <div className="flex gap-2">
            <div className={`relative flex-1 ${boxHeight} group/date`}>
              {/* TASARIM KATMANI */}
              <div className={`absolute inset-0 flex items-center justify-between bg-brand-surface rounded-ini px-4 font-black text-xs text-brand-secondary border-2 border-transparent group-hover/date:bg-brand-surface/80 group-focus-within/date:border-brand-primary transition-all pointer-events-none ${boxHeight}`}>
                <span>{formatDateLabel(form.start_date)}</span>
                <CalendarIcon color="text-brand-primary" />
              </div>
              {/* GERÇEK TIKLAMA ALANI (Görünmez ama devasa) */}
              <input
                type="date"
                value={form.start_date}
                onChange={e => handleStartDateChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 
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
              className={`w-32 bg-brand-surface rounded-ini px-2 font-black text-[11px] outline-none cursor-pointer border-2 border-transparent focus:border-brand-primary ${boxHeight}`}
            >
              <option value="morning">08:30 AM</option>
              <option value="afternoon">12:30 PM</option>
            </select>
          </div>
        </div>

        {/* DEPARTURE DATE PICKER */}
        <div className="flex-[3] min-w-[280px]">
          <span className="text-[10px] font-black text-brand-danger uppercase ml-1 tracking-[0.2em] mb-1 block">Departure</span>
          <div className="flex gap-2">
            <div className={`relative flex-1 ${boxHeight} group/date`}>
              {/* TASARIM KATMANI */}
              <div className={`absolute inset-0 flex items-center justify-between bg-brand-surface rounded-ini px-4 font-black text-xs text-brand-secondary border-2 border-transparent group-hover/date:bg-brand-surface/80 group-focus-within/date:border-brand-danger transition-all pointer-events-none ${boxHeight}`}>
                <span>{formatDateLabel(form.end_date)}</span>
                <CalendarIcon color="text-brand-danger" />
              </div>
              {/* GERÇEK TIKLAMA ALANI (Görünmez ama devasa) */}
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 
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
              className={`w-32 bg-brand-surface rounded-ini px-2 font-black text-[11px] outline-none cursor-pointer border-2 border-transparent focus:border-brand-danger ${boxHeight}`}
            >
              <option value="morning">12:30 PM</option>
              <option value="afternoon">05:30 PM</option>
            </select>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-end gap-2 lg:ml-4">
          <button
            onClick={handleCreate}
            disabled={isDisabled}
            className={`px-10 rounded-ini font-black text-xs tracking-[0.2em] uppercase transition-all whitespace-nowrap shadow-xl active:scale-95 ${boxHeight}
              ${isDisabled
                ? 'bg-brand-surface text-brand-muted cursor-not-allowed'
                : 'bg-brand-primary text-white hover:bg-brand-secondary active:bg-brand-primary'
              }`}
          >
            {submitting ? 'WAIT...' : 'COMMIT ✓'}
          </button>

          <button
            onClick={onCancel}
            className={`w-14 bg-brand-surface text-brand-muted rounded-ini font-black text-lg uppercase hover:bg-brand-danger hover:text-white transition-all flex items-center justify-center ${boxHeight}`}
          >
            ✕
          </button>
        </div>
      </div>

      {isTimeInvalid && !isFormEmpty && (
        <div className="text-[10px] font-black text-brand-danger mt-2 uppercase tracking-widest text-right animate-pulse px-2">
          ⚠ ERROR: Check-out must be after arrival.
        </div>
      )}
    </div>
  );
}