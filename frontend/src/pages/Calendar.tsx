import { useEffect, useState, Fragment, useMemo, useRef } from 'react';
import { getRooms, getFloors } from '../api/rooms';
import { getBookings, updateBooking, deleteBooking } from '../api/bookings';
import { NewBookingForm } from '../components/NewBookingForm';
import type { Room, Booking } from '../types/index';

// --- HELPERS ---

function getDaysForPeriod(startDate: Date, daysCount: number) {
  const days = [];
  for (let i = 0; i < daysCount; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    days.push(date);
  }
  return days;
}

function getOccupancyColor(bookedCount: number, capacity: number, isWeekend: boolean): string {
  if (bookedCount >= capacity) return 'bg-brand-primary text-white border-brand-primary shadow-lg ring-1 ring-brand-primary/20';
  if (bookedCount > 0) return 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 font-bold';
  if (isWeekend) return 'bg-brand-surface/50 border-brand-surface text-brand-muted';
  return 'bg-white border-brand-surface text-slate-200';
}

const cleanISO = (val: any) => {
  if (!val) return '—';
  return String(val).replace('T', ' ').split('.')[0];
};

const FastInput = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);
  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => { setLocalValue(e.target.value); onChange(e.target.value); }}
      className="w-full bg-brand-surface border-0 rounded-ini px-6 py-4 font-black text-brand-base outline-none uppercase focus:ring-2 ring-brand-primary transition-all placeholder:text-brand-muted"
      placeholder={placeholder}
    />
  );
};

// --- MAIN COMPONENT ---

export function Calendar() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewWindow, setViewWindow] = useState<7 | 15>(15);
  const [floorConfigs, setFloorConfigs] = useState<Record<string, any>>({});
  const [collapsedFloors, setCollapsedFloors] = useState<string[]>(['M', 'S']);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState<any>({ title: '', start_date: '', end_date: '' });
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ roomId: number, date: string } | null>(null);
  const isDraggingRef = useRef(false);

  const days = useMemo(() => getDaysForPeriod(startDate, viewWindow), [startDate, viewWindow]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    try {
      const [r, b, f] = await Promise.all([getRooms(), getBookings(), getFloors()]);
      setRooms(r.data);
      setBookings(b.data);
      const configs: Record<string, any> = {};
      (f.data ?? []).forEach((floor: any) => {
        configs[floor.key.toUpperCase()] = { label: floor.label.toUpperCase() };
      });
      setFloorConfigs(configs);
      setLoading(false);
    } catch (err) { console.error("Data error:", err); }
  };

  useEffect(() => { fetchData(); }, []);

  const getBookingsForRoomAndDay = (roomId: number, day: Date) => {
    const ts = new Date(day).setHours(0, 0, 0, 0);
    return bookings.filter(b => {
      const bRoomId = b.room?.id || (b as any).room_id;
      const start = new Date(b.start_time.replace(' ', 'T')).setHours(0, 0, 0, 0);
      const end = new Date(b.end_time.replace(' ', 'T')).setHours(0, 0, 0, 0);
      return Number(bRoomId) === Number(roomId) && ts >= start && ts <= end;
    });
  };

  const getShadowState = (roomId: number, dateStr: string) => {
    if (!draggedBooking || !dragOverCell) return { isShadow: false, isConflict: false };
    if (dragOverCell.roomId !== roomId) return { isShadow: false, isConflict: false };

    const startTs = new Date(draggedBooking.start_time.replace(' ', 'T')).setHours(0, 0, 0, 0);
    const endTs = new Date(draggedBooking.end_time.replace(' ', 'T')).setHours(0, 0, 0, 0);
    const durationDays = Math.round((endTs - startTs) / (1000 * 60 * 60 * 24));

    const currentCellDate = new Date(dateStr);
    const dragStartDate = new Date(dragOverCell.date);
    const dragEndDate = new Date(dragStartDate);
    dragEndDate.setDate(dragStartDate.getDate() + durationDays);

    const isShadow = currentCellDate >= dragStartDate && currentCellDate <= dragEndDate;
    let isConflict = false;
    if (isShadow) {
      const existing = getBookingsForRoomAndDay(roomId, currentCellDate);
      isConflict = existing.some(b => b.id !== draggedBooking.id);
    }
    return { isShadow, isConflict };
  };

  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    isDraggingRef.current = true;
    setDraggedBooking(booking);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedBooking(null);
    setDragOverCell(null);
    setTimeout(() => { isDraggingRef.current = false; }, 100);
  };

  const handleDragOver = (e: React.DragEvent, roomId: number, date: string) => {
    e.preventDefault();
    setDragOverCell({ roomId, date });
  };

  const handleDrop = async (e: React.DragEvent, targetRoomId: number, targetDate: string) => {
    e.preventDefault();
    if (!draggedBooking) return;

    const oldStart = new Date(draggedBooking.start_time.replace(' ', 'T')).getTime();
    const oldEnd = new Date(draggedBooking.end_time.replace(' ', 'T')).getTime();
    const durationMs = oldEnd - oldStart;

    const newStartObj = new Date(targetDate + "T08:30:00");
    const newEndObj = new Date(newStartObj.getTime() + durationMs);

    try {
      const finalStart = cleanISO(newStartObj.toISOString());
      const finalEnd = cleanISO(newEndObj.toISOString());

      await updateBooking(draggedBooking.id, {
        room_id: targetRoomId,
        title: draggedBooking.title,
        start_time: finalStart,
        end_time: finalEnd,
      } as any);

      setToast({ msg: "UPDATED SUCCESSFULLY ✓", type: 'success' });
      await fetchData();
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || err.response?.data?.error || "SERVER REJECTED ACTION";
      setToast({ msg: `FAILED: ${backendMessage.toUpperCase()}`, type: 'error' });
    } finally {
      setDraggedBooking(null);
      setDragOverCell(null);
    }
  };

  const handleBookingClick = (b: Booking) => {
    if (isDraggingRef.current) return;
    setEditingBooking(b);
    const startDate = b.start_time.split(/[\sT]/)[0];
    const endDate = b.end_time.split(/[\sT]/)[0];
    setEditForm({ title: b.title, start_date: startDate, end_date: endDate });
  };

  const moveNext = () => setStartDate(d => { const n = new Date(d); n.setDate(n.getDate() + viewWindow); return n; });
  const movePrev = () => setStartDate(d => { const n = new Date(d); n.setDate(n.getDate() - viewWindow); return n; });

  const dynamicFloors = useMemo(() => {
    const floorSet = new Set(rooms.map(room => room.name?.[0]?.toUpperCase()).filter(Boolean));
    return Array.from(floorSet).sort();
  }, [rooms]);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-brand-secondary animate-pulse text-2xl tracking-widest italic uppercase">Syncing...</div>;

  return (
    <div className="min-h-screen bg-brand-surface font-brand">
      <div className="max-w-[100vw] mx-auto px-4 pt-4">
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-brand-surface pb-4 mb-4">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-brand-secondary uppercase tracking-tighter italic">DAILY OPS</h1>
              <div className="h-6 w-[2px] bg-brand-primary/20 rotate-[20deg]" />
              <p className="text-brand-muted text-[10px] font-black uppercase tracking-[0.2em]">
                {days[0].toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {days[days.length - 1].toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
            <div className="flex bg-white p-1 rounded-ini border border-brand-surface shadow-sm">
              {[7, 15].map((v) => (
                <button key={v} onClick={() => setViewWindow(v as any)} className={`px-3 py-1 rounded-ini text-[9px] font-black ${viewWindow === v ? 'bg-brand-secondary text-white' : 'text-brand-muted'}`}>{v} DAYS</button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-white p-1 rounded-ini border border-brand-surface shadow-sm">
              <button onClick={movePrev} className="w-8 h-8 font-bold text-xs">←</button>
              <button onClick={() => setStartDate(new Date(new Date().setHours(0, 0, 0, 0)))} className="px-4 h-8 text-[9px] font-black uppercase">Today</button>
              <button onClick={moveNext} className="w-8 h-8 font-bold text-xs">→</button>
            </div>
            <button onClick={() => setIsFormOpen(!isFormOpen)} className={`px-6 py-3 font-black uppercase text-[10px] rounded-ini transition-all shadow-md ${isFormOpen ? 'bg-brand-primary text-white' : 'bg-brand-secondary text-white'}`}>
              {isFormOpen ? '✕ CLOSE' : '+ NEW ENTRY'}
            </button>
          </div>
        </div>

        {/* --- NEW FORM SECTION --- */}
        {isFormOpen && (
          <div className="mb-6 relative z-50 animate-in slide-in-from-top duration-300">
            <div className="bg-white rounded-ini shadow-2xl border border-brand-surface p-6">
              <NewBookingForm
                rooms={rooms}
                onSuccess={async () => {
                  setIsFormOpen(false);
                  await fetchData();
                  setToast({ msg: "RESERVATION CREATED ✓", type: 'success' });
                }}
                onCancel={() => setIsFormOpen(false)}
                showToast={(msg, type) => setToast({ msg, type: type as 'error' | 'success' })}
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-4">
        <div className="overflow-x-auto no-scrollbar border border-brand-surface rounded-ini shadow-sm bg-white">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="bg-brand-surface/30">
                <th className="sticky left-0 z-40 bg-brand-surface p-4 border-r border-brand-primary/10 text-center font-black uppercase text-[10px] w-[120px]">Resources</th>
                {days.map(day => (
                  <th key={day.toISOString()} className={`p-2 border-r border-brand-surface min-w-[90px] text-center ${day.getTime() === today.getTime() ? 'bg-brand-primary text-white' : ''}`}>
                    <div className="text-[9px] font-black uppercase opacity-60">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                    <div className="text-lg font-black">{day.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dynamicFloors.map(floor => (
                <Fragment key={floor}>
                  <tr onClick={() => setCollapsedFloors(prev => prev.includes(floor) ? prev.filter(f => f !== floor) : [...prev, floor])} className="cursor-pointer bg-brand-secondary/90 text-white h-10 transition-all">
                    <td className="sticky left-0 z-30 bg-brand-secondary px-4 text-center font-black uppercase text-[10px]">
                      {collapsedFloors.includes(floor) ? '▶' : '▼'} {floorConfigs[floor]?.label || floor}
                    </td>
                    <td colSpan={days.length} className="text-center italic text-[8px] opacity-30 uppercase font-black">Section Active</td>
                  </tr>
                  {!collapsedFloors.includes(floor) && rooms.filter(r => r.name?.[0].toUpperCase() === floor).map(room => (
                    <tr key={room.id} className="border-b border-brand-surface group">
                      <td className="sticky left-0 z-30 bg-white p-4 border-r border-brand-primary/5 text-center shadow-sm">
                        <div className="font-black text-brand-secondary text-sm uppercase">{room.name}</div>
                        <div className="text-[7px] font-black text-brand-primary mt-1 uppercase bg-brand-primary/10 rounded-full px-2 py-0.5 inline-block">Cap: {room.capacity}</div>
                      </td>
                      {days.map(day => {
                        const dateStr = day.toISOString().split('T')[0];
                        const dayBookings = getBookingsForRoomAndDay(room.id, day);
                        const { isShadow, isConflict } = getShadowState(room.id, dateStr);

                        return (
                          <td
                            key={day.toISOString()}
                            onDragOver={(e) => handleDragOver(e, room.id, dateStr)}
                            onDrop={(e) => handleDrop(e, room.id, dateStr)}
                            className={`p-0.5 border-r border-brand-surface min-w-[40px] min-h-14 relative transition-all 
                              ${getOccupancyColor(dayBookings.length, room.capacity, day.getDay() === 0 || day.getDay() === 6)}
                              ${isShadow ? (isConflict 
                                ? 'bg-brand-danger ring-4 ring-brand-danger ring-inset z-20 animate-pulse shadow-2xl scale-95' 
                                : 'bg-brand-primary ring-4 ring-brand-primary ring-inset scale-95 z-10 shadow-xl') 
                              : ''}
                            `}
                          >
                            <div className="flex flex-col gap-0.5 relative z-10">
                              {dayBookings.map(b => (
                                <div
                                  key={b.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, b)}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => handleBookingClick(b)}
                                  className="px-1.5 py-1 bg-brand-secondary text-white rounded-sm text-[7px] font-black uppercase cursor-grab truncate shadow-sm transition-transform hover:scale-105 active:scale-95"
                                >
                                  {b.title}
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- EDIT MODAL --- */}
      {editingBooking && (
        <div className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-md flex items-center justify-center z-[5000] p-4">
          <div className="bg-white rounded-ini p-8 w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-brand-secondary mb-6 uppercase italic underline decoration-brand-primary decoration-4">Update</h2>
            <div className="space-y-4">
              <FastInput value={editForm.title} onChange={(val) => setEditForm({ ...editForm, title: val })} placeholder="TITLE..." />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} className="bg-brand-surface p-4 rounded font-black w-full text-xs" />
                <input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} className="bg-brand-surface p-4 rounded font-black w-full text-xs" />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={async () => {
                try {
                  const finalStart = `${editForm.start_date} 08:30:00`;
                  const finalEnd = `${editForm.end_date} 17:30:00`;
                  await updateBooking(editingBooking.id, { title: editForm.title.toUpperCase(), start_time: finalStart, end_time: finalEnd } as any);
                  setEditingBooking(null); fetchData(); setToast({ msg: "UPDATED ✓", type: 'success' });
                } catch (err: any) {
                  const errorMsg = err.response?.data?.message || err.response?.data?.error || "UPDATE FAILED";
                  setToast({ msg: `ERROR: ${errorMsg.toUpperCase()}`, type: 'error' });
                }
              }} className="flex-1 bg-brand-primary text-white py-4 rounded font-black uppercase text-xs">Confirm</button>
              <button onClick={async () => { if (confirm("Delete?")) { await deleteBooking(editingBooking.id); setEditingBooking(null); fetchData(); } }} className="px-6 bg-brand-danger text-white rounded font-black uppercase text-xs">Delete</button>
              <button onClick={() => setEditingBooking(null)} className="px-6 bg-brand-surface text-brand-muted rounded font-black uppercase text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* --- TOAST SYSTEM --- */}
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[6000] animate-in fade-in slide-in-from-top-10">
          <div className={`px-8 py-4 rounded-full shadow-2xl border-2 bg-white ${toast.type === 'error' ? 'border-brand-danger' : 'border-brand-primary'}`}>
            <p className="font-black text-brand-secondary text-sm uppercase italic">{toast.msg}</p>
          </div>
        </div>
      )}
    </div>
  );
}