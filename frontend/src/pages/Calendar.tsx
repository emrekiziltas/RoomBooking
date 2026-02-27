import { useEffect, useState, Fragment, useMemo } from 'react';
import { getRooms } from '../api/rooms';
import { getBookings, createBooking, updateBooking, deleteBooking } from '../api/bookings';
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

const FastInput = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        onChange(e.target.value);
      }}
      className="w-full bg-brand-surface border-0 rounded-ini px-6 py-4 font-black text-brand-base outline-none uppercase focus:ring-2 ring-brand-primary transition-all placeholder:text-brand-muted"
      placeholder={placeholder}
    />
  );
};

export function Calendar() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewWindow, setViewWindow] = useState<7 | 15>(15);
  // Kapalı katları tutan state (Collapse özelliği için)
  const [collapsedFloors, setCollapsedFloors] = useState<string[]>([]);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [newBookingData, setNewBookingData] = useState({ roomId: 0, startDate: '', endDate: '', title: '' });
  const [editForm, setEditForm] = useState<any>({ title: '', start_date: '', end_date: '', duration: 1 });
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ roomId: number, date: string } | null>(null);

  const days = useMemo(() => getDaysForPeriod(startDate, viewWindow), [startDate, viewWindow]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fetchData = async () => {
    try {
      const [r, b] = await Promise.all([getRooms(), getBookings()]);
      setRooms(r.data);
      setBookings(b.data);
      setLoading(false);
    } catch (err) { console.error("Veri hatası:", err); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (editingBooking) {
      const start = new Date(editingBooking.start_time.split(/[\sT]/)[0]);
      const end = new Date(editingBooking.end_time.split(/[\sT]/)[0]);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      setEditForm({
        title: editingBooking.title,
        start_date: editingBooking.start_time.split(/[\sT]/)[0],
        end_date: editingBooking.end_time.split(/[\sT]/)[0],
        duration: diffDays
      });
    }
  }, [editingBooking]);

  // Kat açma/kapama fonksiyonu
  const toggleFloor = (floor: string) => {
    setCollapsedFloors(prev => 
      prev.includes(floor) ? prev.filter(f => f !== floor) : [...prev, floor]
    );
  };

  const getIsShadow = (roomId: number, dateStr: string) => {
    if (!draggedBooking || !dragOverCell) return false;
    if (dragOverCell.roomId !== roomId) return false;
    const startTs = new Date(draggedBooking.start_time).setHours(0,0,0,0);
    const endTs = new Date(draggedBooking.end_time).setHours(0,0,0,0);
    const durationDays = Math.round((endTs - startTs) / (1000 * 60 * 60 * 24));
    const currentCellDate = new Date(dateStr);
    const dragStartDate = new Date(dragOverCell.date);
    const dragEndDate = new Date(dragStartDate);
    dragEndDate.setDate(dragStartDate.getDate() + durationDays);
    return currentCellDate >= dragStartDate && currentCellDate <= dragEndDate;
  };

  const moveNext = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + viewWindow);
    setStartDate(d);
  };

  const movePrev = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - viewWindow);
    setStartDate(d);
  };

  const handleCreate = async () => {
    if (!newBookingData.title) return;
    try {
      await createBooking({
        room_id: newBookingData.roomId,
        title: newBookingData.title,
        start_time: `${newBookingData.startDate}T09:00:00`,
        end_time: `${newBookingData.endDate || newBookingData.startDate}T17:00:00`,
      });
      setIsNewBookingModalOpen(false);
      setNewBookingData({ roomId: 0, startDate: '', endDate: '', title: '' });
      await fetchData();
    } catch (err) { alert("Hata oluştu."); }
  };

  const handleUpdate = async () => {
    if (!editingBooking) return;
    try {
      await updateBooking(editingBooking.id, {
        title: editForm.title,
        start_time: `${editForm.start_date}T09:00:00`,
        end_time: `${editForm.end_date}T17:00:00`,
      });
      setEditingBooking(null);
      await fetchData();
    } catch (err) { alert("Güncellenemedi."); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Silinsin mi?")) return;
    try {
      await deleteBooking(id);
      setEditingBooking(null);
      await fetchData();
    } catch (err) { alert("Hata."); }
  };

  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    setDraggedBooking(booking);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, roomId: number, date: string) => {
    e.preventDefault();
    setDragOverCell({ roomId, date });
  };

  const handleDrop = async (e: React.DragEvent, targetRoomId: number, targetDate: string) => {
    e.preventDefault();
    if (!draggedBooking) return;
    const start = new Date(draggedBooking.start_time);
    const end = new Date(draggedBooking.end_time);
    const durationMs = end.getTime() - start.getTime();
    const newStart = new Date(`${targetDate}T${start.toTimeString().split(' ')[0]}`);
    const newEnd = new Date(newStart.getTime() + durationMs);
    const format = (d: Date) => d.toISOString().split('.')[0];
    try {
      await updateBooking(draggedBooking.id, {
        room_id: targetRoomId,
        title: draggedBooking.title,
        start_time: format(newStart),
        end_time: format(newEnd),
      });
      await fetchData();
    } catch (err) { alert("İşlem başarısız."); }
    finally { setDraggedBooking(null); setDragOverCell(null); }
  };

  const handleStartDateChange = (newStartStr: string) => {
    if (!newStartStr) return;
    const currentDuration = editingBooking ? (editForm.duration || 1) : 1;
    const newStartDate = new Date(newStartStr);
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newStartDate.getDate() + currentDuration);
    const formattedEnd = newEndDate.toISOString().split('T')[0];
    if (editingBooking) setEditForm({ ...editForm, start_date: newStartStr, end_date: formattedEnd });
    else setNewBookingData({ ...newBookingData, startDate: newStartStr, endDate: formattedEnd });
  };

  function getBookingsForRoomAndDay(roomId: number, day: Date) {
    const ts = new Date(day).setHours(0, 0, 0, 0);
    return bookings.filter(b => {
      const bRoomId = b.room?.id || (b as any).room_id;
      const start = new Date(b.start_time).setHours(0, 0, 0, 0);
      const end = new Date(b.end_time).setHours(0, 0, 0, 0);
      return Number(bRoomId) === Number(roomId) && ts >= start && ts <= end;
    });
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-brand-secondary animate-pulse text-2xl uppercase tracking-widest font-brand">
      InI Preparing...
    </div>
  );

  return (
    <div className={`min-h-screen bg-brand-surface px-4 pt-2 pb-8 font-brand transition-all duration-500 ${viewWindow === 15 ? 'view-15' : ''}`}>
      
      {/* HEADER SECTION */}
      <div className="max-w-[100vw] mx-auto mb-1 flex flex-col md:flex-row justify-between items-end gap-2 border-b-2 border-brand-surface pb-1">
        <div>
          <h1 className="text-2xl font-black text-brand-secondary uppercase tracking-tighter leading-none italic">
            Daily <span className="text-brand-primary">Ops</span>
          </h1>
          <p className="text-brand-muted text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">
            {days[0].toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' })} — {days[days.length - 1].toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center gap-2 mb-0.5">
          <div className="flex bg-brand-surface p-0.5 rounded-lg border border-brand-surface">
            {[7, 15].map((v) => (
              <button 
                key={v} 
                onClick={() => setViewWindow(v as any)} 
                className={`px-3 py-1.5 rounded-md text-[9px] font-black transition-all ${viewWindow === v ? 'bg-white text-brand-secondary shadow-sm' : 'text-brand-muted hover:text-brand-secondary'}`}
              >
                {v} GÜN
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={movePrev} className="w-9 h-9 flex items-center justify-center bg-white border border-brand-surface rounded-md hover:border-brand-primary transition-all text-brand-secondary font-bold shadow-sm text-xs">←</button>
            <button onClick={() => setStartDate(new Date(new Date().setHours(0,0,0,0)))} className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white bg-brand-secondary rounded-md hover:bg-brand-primary transition-all shadow-md">Bugün</button>
            <button onClick={moveNext} className="w-9 h-9 flex items-center justify-center bg-white border border-brand-surface rounded-md hover:border-brand-primary transition-all text-brand-secondary font-bold shadow-sm text-xs">→</button>
          </div>
        </div>
      </div>

      {/* CALENDAR TABLE */}
      <div className="ini-card overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-brand-surface/30">
                <th className="sticky left-0 z-40 bg-brand-surface p-4 sticky-resource border-r border-brand-primary/10 text-center font-black uppercase text-brand-secondary text-[10px] tracking-widest shadow-md transition-all">Resources</th>
                {days.map(day => {
                  const isToday = day.getTime() === today.getTime();
                  return (
                    <th key={day.toISOString()} className={`p-2 border-r border-brand-surface min-w-[90px] text-center transition-all ${isToday ? 'bg-brand-primary text-white' : ''}`}>
                      <div className={`text-[9px] font-black uppercase ${isToday ? 'text-white/40' : 'text-brand-muted'}`}>{day.toLocaleDateString('tr-TR', { weekday: 'short' })}</div>
                      <div className="text-lg font-black">{day.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="ini-divide">
              {['F', 'M', 'S'].map(floor => (
                <Fragment key={floor}>
                  {/* Floor Satırı (Tıklanabilir Harmonic Yapı) */}
                  <tr 
                    onClick={() => toggleFloor(floor)}
                    className="cursor-pointer bg-gradient-to-r from-brand-secondary to-brand-secondary/90 text-[9px] font-black uppercase tracking-[0.4em] text-white hover:brightness-110 transition-all select-none"
                  >
                    <td className="sticky left-0 z-30 bg-brand-secondary px-4 py-2 sticky-resource border-y border-white/5 text-center shadow-md">
                      <span className="flex items-center justify-center gap-2">
                        {collapsedFloors.includes(floor) ? '▶' : '▼'} Floor {floor}
                      </span>
                    </td>
                    <td colSpan={days.length} className="border-y border-white/5 opacity-30 italic pl-4 text-[8px] tracking-widest">
                      {collapsedFloors.includes(floor) ? 'Click to Expand' : 'InI Operational Sector'}
                    </td>
                  </tr>

                  {/* Odalar (Eğer kat kapalı değilse göster) */}
                  {!collapsedFloors.includes(floor) && rooms.filter(r => r.name?.[0].toUpperCase() === floor).map(room => (
                    <tr key={room.id} className="group/row border-b border-brand-surface animate-in fade-in slide-in-from-top-1 duration-200">
                      <td className="sticky left-0 z-30 bg-white p-4 sticky-resource border-r border-brand-primary/5 group-hover/row:bg-brand-surface/40 transition-all text-center shadow-sm">
                        <div className="font-black text-brand-secondary text-sm uppercase tracking-tighter">{room.name}</div>
                        <div className="text-[7px] font-black text-brand-primary mt-1 uppercase bg-brand-primary/10 rounded-full px-2 py-0.5 inline-block">Cap: {room.capacity}</div>
                      </td>
                      {days.map(day => {
                        const dateStr = day.toISOString().split('T')[0];
                        const dayBookings = getBookingsForRoomAndDay(room.id, day);
                        const isShadow = getIsShadow(room.id, dateStr);
                        return (
                          <td 
                            key={day.toISOString()} 
                            onDragOver={(e) => handleDragOver(e, room.id, dateStr)}
                            onDrop={(e) => handleDrop(e, room.id, dateStr)}
                            className={`p-1.5 border-r border-brand-surface min-w-[40px] h-full relative transition-all group/cell
                              ${getOccupancyColor(dayBookings.length, room.capacity, day.getDay() === 0 || day.getDay() === 6)}
                              ${isShadow ? 'bg-brand-primary ring-4 ring-brand-primary ring-inset scale-95 z-10 shadow-2xl' : ''}
                            `}
                          >
                            <div className="flex flex-col gap-1 relative z-10">
                              {dayBookings.map(b => (
                                <div
                                  key={b.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, b)}
                                  onClick={() => setEditingBooking(b)}
                                  className="booking-card w-full p-1.5 bg-brand-secondary text-white rounded-md text-[8px] font-black uppercase cursor-grab active:cursor-grabbing hover:bg-brand-primary transition-all border border-white/10"
                                >
                                  {b.title}
                                </div>
                              ))}
                            </div>

                            {dayBookings.length < room.capacity && (
                              <button 
                                onClick={() => { setNewBookingData({ roomId: room.id, startDate: dateStr, endDate: dateStr, title: '' }); setIsNewBookingModalOpen(true); }} 
                                className="absolute bottom-1 right-1 w-5 h-5 flex items-center justify-center bg-brand-primary text-white rounded-full opacity-0 group-hover/cell:opacity-100 transition-all z-30 shadow-lg hover:scale-110 active:scale-90 font-bold text-sm"
                              >
                                +
                              </button>
                            )}
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

      {/* MODAL SECTION */}
      {(isNewBookingModalOpen || editingBooking) && (
        <div className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-ini p-8 w-full max-w-lg shadow-2xl border-4 border-brand-secondary animate-in zoom-in duration-200">
            <h2 className="text-3xl font-black text-brand-secondary mb-6 tracking-tighter uppercase italic underline decoration-brand-primary decoration-4 underline-offset-8">
              {editingBooking ? 'Update' : 'New Entry'}
            </h2>
            <div className="space-y-4">
              <FastInput value={editingBooking ? editForm.title : newBookingData.title} onChange={(val) => editingBooking ? setEditForm({...editForm, title: val}) : setNewBookingData({...newBookingData, title: val})} placeholder="GUEST NAME / TITLE..." />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase ml-1 text-brand-muted tracking-widest">Arrival</label>
                  <input type="date" value={editingBooking ? editForm.start_date : newBookingData.startDate} onChange={(e) => handleStartDateChange(e.target.value)} className="bg-brand-surface p-4 rounded-md font-black w-full border-0 focus:ring-2 ring-brand-primary outline-none text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase ml-1 text-brand-muted tracking-widest">Departure</label>
                  <input 
                    type="date" 
                    value={editingBooking ? editForm.end_date : newBookingData.endDate} 
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      if (editingBooking) {
                        const start = new Date(editForm.start_date);
                        const diff = Math.ceil((new Date(newEnd).getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                        setEditForm({...editForm, end_date: newEnd, duration: diff});
                      } else {
                        setNewBookingData({...newBookingData, endDate: newEnd});
                      }
                    }} 
                    className="bg-brand-surface p-4 rounded-md font-black w-full border-0 focus:ring-2 ring-brand-primary outline-none text-xs" 
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={editingBooking ? handleUpdate : handleCreate} className="flex-1 bg-brand-primary text-white py-4 rounded-md font-black uppercase hover:bg-brand-primary/90 transition-all shadow-lg text-xs">Confirm</button>
              {editingBooking && <button onClick={() => handleDelete(editingBooking.id)} className="px-6 bg-brand-danger text-white rounded-md font-black uppercase hover:bg-brand-danger/90 transition-all text-xs">Delete</button>}
              <button onClick={() => { setIsNewBookingModalOpen(false); setEditingBooking(null); }} className="px-6 bg-brand-surface text-brand-muted rounded-md font-black uppercase hover:bg-brand-surface/80 transition-all text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}