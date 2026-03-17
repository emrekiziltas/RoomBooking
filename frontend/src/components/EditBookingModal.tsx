import { useState, useEffect } from 'react';
import type { Booking, Room } from '../types/index';

interface EditBookingModalProps {
  isOpen: boolean;
  booking: Booking | null;
  rooms?: Room[];
  onClose: () => void;
  onSave: (id: number, updatedData: any) => Promise<void>;
  onDelete?: (id: number) => void;
  showSlots?: boolean;
}

export function EditBookingModal({ isOpen, booking, onClose, onSave, onDelete, showSlots = false }: EditBookingModalProps) {
  const [form, setForm] = useState({
    title: '',
    start_date: '',
    end_date: '',
    start_slot: 'morning',
    end_slot: 'afternoon'
  });

  useEffect(() => {
    if (isOpen && booking) {
      setForm({
        title: booking.title,
        start_date: booking.start_time.slice(0, 10),
        end_date: booking.end_time.slice(0, 10),
        start_slot: booking.start_time.includes('08:30') ? 'morning' : 'afternoon',
        end_slot: booking.end_time.includes('12:30') ? 'morning' : 'afternoon'
      });
    }
  }, [booking, isOpen]);

  if (!isOpen || !booking) return null;

  const handleConfirm = () => {
    const finalStart = showSlots 
      ? `${form.start_date} ${form.start_slot === 'morning' ? '08:30:00' : '12:30:00'}`
      : `${form.start_date} 08:30:00`;
    
    const finalEnd = showSlots 
      ? `${form.end_date} ${form.end_slot === 'morning' ? '12:30:00' : '17:30:00'}`
      : `${form.end_date} 17:30:00`;

    onSave(booking.id, {
      title: form.title.toUpperCase(),
      start_time: finalStart,
      end_time: finalEnd,
      room_id: booking.room?.id || booking.room_id
    });
  };

  return (
    <div className="fixed inset-0 bg-brand-secondary/90 backdrop-blur-md flex items-center justify-center z-[6000] p-6 text-left">
      <div className="bg-white border-4 border-brand-secondary p-8 w-full max-w-xl animate-in zoom-in-95 duration-200 shadow-2xl">
        <h2 className="text-2xl font-black mb-8 text-brand-secondary uppercase italic border-b-4 border-brand-primary pb-2 inline-block">
          Update Entry
        </h2>
        
        <div className="space-y-6">
          {/* Title Section */}
          <div className="space-y-1">
            <span className="text-[9px] font-black text-brand-muted uppercase tracking-[0.2em] ml-1">Log Description</span>
            <input 
              type="text" 
              value={form.title} 
              onChange={(e) => setForm({ ...form, title: e.target.value })} 
              className="w-full bg-brand-surface border-2 border-transparent focus:border-brand-primary px-4 py-4 font-black text-xs outline-none uppercase transition-all" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* START DATE (Her zaman görünür) */}
            <div className="bg-brand-surface p-5 space-y-3 border-l-4 border-brand-primary">
              <span className="text-[9px] font-black text-brand-primary block uppercase tracking-[0.2em]">Start Date</span>
              <input 
                type="date" 
                value={form.start_date} 
                onChange={(e) => setForm({ ...form, start_date: e.target.value })} 
                className="w-full bg-white px-3 py-2 font-black text-[11px] border-2 border-brand-surface outline-none focus:border-brand-primary" 
              />
              {showSlots && (
                <select 
                  value={form.start_slot} 
                  onChange={(e) => setForm({ ...form, start_slot: e.target.value })}
                  className="w-full bg-white px-3 py-2 font-black text-[11px] border-2 border-brand-surface"
                >
                  <option value="morning">🕒 08:30 (Morning)</option>
                  <option value="afternoon">🕒 12:30 (Afternoon)</option>
                </select>
              )}
            </div>

            {/* END DATE (Her zaman görünür) */}
            <div className="bg-brand-surface p-5 space-y-3 border-l-4 border-brand-danger">
              <span className="text-[9px] font-black text-brand-danger block uppercase tracking-[0.2em]">End Date</span>
              <input 
                type="date" 
                value={form.end_date} 
                onChange={(e) => setForm({ ...form, end_date: e.target.value })} 
                className="w-full bg-white px-3 py-2 font-black text-[11px] border-2 border-brand-surface outline-none focus:border-brand-danger" 
              />
              {showSlots && (
                <select 
                  value={form.end_slot} 
                  onChange={(e) => setForm({ ...form, end_slot: e.target.value })}
                  className="w-full bg-white px-3 py-2 font-black text-[11px] border-2 border-brand-surface"
                >
                  <option value="morning">🕒 12:30 (Noon)</option>
                  <option value="afternoon">🕒 17:30 (Evening)</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-10">
          <button 
            onClick={handleConfirm}
            className="flex-[3] bg-brand-secondary text-white py-4 font-black text-xs tracking-[0.2em] hover:bg-brand-primary transition-all uppercase shadow-lg active:scale-95"
          >
            Save Changes
          </button>
          
          {onDelete && (
            <button 
              onClick={() => onDelete(booking.id)}
              className="flex-1 bg-brand-danger/10 text-brand-danger border-2 border-brand-danger py-4 font-black text-xs tracking-widest hover:bg-brand-danger hover:text-white transition-all uppercase"
            >
              Delete
            </button>
          )}

          <button 
            onClick={onClose} 
            className="flex-1 bg-brand-surface text-brand-muted py-4 font-black text-xs tracking-widest hover:text-brand-secondary transition-all uppercase"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}