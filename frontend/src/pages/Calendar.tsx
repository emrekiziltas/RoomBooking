import { useEffect, useState, Fragment, useMemo, useRef } from 'react';
import { getRooms, getFloors } from '../api/rooms';
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
  const [floorConfigs, setFloorConfigs] = useState<Record<string, any>>({});
  const [collapsedFloors, setCollapsedFloors] = useState<string[]>(['M', 'S']);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // --- NEW TOAST STATE ---
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [newBookingData, setNewBookingData] = useState({ roomId: 0, startDate: '', endDate: '', title: '' });
  const [editForm, setEditForm] = useState<any>({ title: '', start_date: '', end_date: '', duration: 1 });
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ roomId: number, date: string } | null>(null);
  
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const days = useMemo(() => getDaysForPeriod(startDate, viewWindow), [startDate, viewWindow]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Auto-hide Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
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

  const toggleFloor = (floor: string) => {
    setCollapsedFloors(prev => 
      prev.includes(floor) ? prev.filter(f => f !== floor) : [...prev, floor]
    );
  };

  const handleDragOverFloor = (e: React.DragEvent, floor: string) => {
    e.preventDefault();
    if (!dragTimeoutRef.current && collapsedFloors.includes(floor)) {
      dragTimeoutRef.current = setTimeout(() => {
        setCollapsedFloors(prev => prev.filter(f => f !== floor));
        dragTimeoutRef.current = null;
      }, 500);
    }
  };

  const handleDragLeaveFloor = () => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
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

  const moveNext = () => setStartDate(d => { const n = new Date(d); n.setDate(n.getDate() + viewWindow); return n; });
  const movePrev = () => setStartDate(d => { const n = new Date(d); n.setDate(n.getDate() - viewWindow); return n; });

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
      setToast({ msg: "Kayıt başarıyla oluşturuldu.", type: 'success' });
      await fetchData();
    } catch (err: any) { 
      setToast({ msg: err.response?.data?.message || "Hata oluştu.", type: 'error' }); 
    }
  };

  const handleUpdate = async () => {
    if (!editingBooking) return;
    try {
      await updateBooking(editingBooking.id, {
        title: editForm.title,
        start_time: `${editForm.start_date}T09:00:00`,
        end_time: `${editForm.end_date}T17:00:00`,
      } as any);
      setEditingBooking(null);
      setToast({ msg: "Güncelleme başarılı.", type: 'success' });
      await fetchData();
    } catch (err: any) { 
      setToast({ msg: err.response?.data?.message || "Güncellenemedi.", type: 'error' }); 
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Silinsin mi?")) return;
    try {
      await deleteBooking(id);
      setEditingBooking(null);
      setToast({ msg: "Kayıt silindi.", type: 'success' });
      await fetchData();
    } catch (err) { setToast({ msg: "Silme hatası.", type: 'error' }); }
  };

  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    setDraggedBooking(booking);
    const dragTarget = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(dragTarget, 0, 0); 
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, roomId: number, date: string) => {
    e.preventDefault();
    setDragOverCell({ roomId, date });
  };

  const dynamicFloors = useMemo(() => {
    const floorSet = new Set(rooms.map(room => room.name?.[0]?.toUpperCase()).filter(Boolean));
    return Array.from(floorSet).sort();
  }, [rooms]);

  const handleDrop = async (e: React.DragEvent, targetRoomId: number, targetDate: string) => {
    e.preventDefault();
    if (!draggedBooking) return;

    const start = new Date(draggedBooking.start_time);
    const end = new Date(draggedBooking.end_time);
    const durationMs = end.getTime() - start.getTime();
    
    const newStart = new Date(`${targetDate}T${draggedBooking.start_time.split(/[T\s]/)[1] || '09:00:00'}`);
    const newEnd = new Date(newStart.getTime() + durationMs);
    
    const format = (d: Date) => {
      const z = d.getTimezoneOffset() * 60 * 1000;
      const local = new Date(d.getTime() - z);
      return local.toISOString().split('.')[0];
    };

    try {
      await updateBooking(draggedBooking.id, {
        room_id: targetRoomId,
        title: draggedBooking.title,
        start_time: format(newStart),
        end_time: format(newEnd),
      } as any);
      
      setToast({ msg: "Rezervasyon taşındı.", type: 'success' });
      await fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Taşıma işlemi yapılamadı.";
      setToast({ msg: `DİKKAT: ${msg}`, type: 'error' });
    } finally {
      setDraggedBooking(null);
      setDragOverCell(null);
    }
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
const [isModalOpen, setIsModalOpen] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [bookingPayload, setBookingPayload] = useState({
  roomId: 'all',
  title: '',
  start: new Date().toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
});

const handleQuickSubmit = async () => {
  if (bookingPayload.roomId === 'all' || !bookingPayload.title) return;
  setSubmitting(true);
  try {
    await createBooking({
      room_id: Number(bookingPayload.roomId),
      title: bookingPayload.title.toUpperCase(),
      color: 'var(--brand-primary)',
      // Laravel'in anlaması için 'T' yerine boşluklu formatı dene (veya tam tersi)
      start_time: `${bookingPayload.start} 08:30:00`,
      end_time: `${bookingPayload.end} 17:30:00`,
    });

    setIsModalOpen(false);
    setBookingPayload(p => ({ ...p, title: '' })); 
    
    // fetchData senin dosyadaki orijinal fonksiyonun adı
    await fetchData(); 
    
    setToast({ msg: "SEQUENCE COMMITTED ✓", type: 'success' });
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || "ACTION FAILED";
    setToast({ msg: errorMsg.toUpperCase(), type: 'error' });
    console.error("Detail:", error.response?.data);
  } finally {
    setSubmitting(false);
  }
};

 return (
  <div className={`min-h-screen bg-brand-surface font-brand transition-all duration-500 ${viewWindow === 15 ? 'view-15' : ''}`}>
    
    {/* 1. HEADER SECTION - Diğer sayfalarla milimetrik hiza için pt-4 */}
<div className="max-w-[100vw] mx-auto px-4 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-brand-surface pb-4"> {/* Alt çizgi ve iç boşluk eklendi */}
        
        {/* Başlık Grubu */}
        <div className="flex-1 w-full">
           <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-brand-secondary uppercase tracking-tighter leading-none italic">
                INI <span className="text-brand-primary">CALENDAR</span>
              </h1>
              <div className="h-6 w-[2px] bg-brand-primary/20 rotate-[20deg]" />
              <p className="text-brand-muted text-[10px] font-black uppercase tracking-[0.2em]">
                {days[0].toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} — {days[days.length - 1].toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
           </div>
        </div>
        {/* Kontroller Grubu */}
        <div className="flex flex-wrap items-center gap-2 pb-[2px] mt-4 md:mt-0">
          
          {/* Gün Seçici */}
          <div className="flex bg-white p-1 rounded-ini border border-brand-surface shadow-sm">
            {[7, 15].map((v) => (
              <button 
                key={v} 
                onClick={() => setViewWindow(v as any)} 
                className={`px-3 py-1 rounded-ini text-[9px] font-black transition-all ${viewWindow === v ? 'bg-brand-secondary text-white shadow-sm' : 'text-brand-muted hover:text-brand-secondary'}`}
              >
                {v} DAYS
              </button>
            ))}
          </div>

          {/* Navigasyon */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-ini border border-brand-surface shadow-sm">
            <button onClick={movePrev} className="w-8 h-8 flex items-center justify-center hover:bg-brand-surface rounded-ini transition-all text-brand-secondary font-bold text-xs">←</button>
            <button onClick={() => setStartDate(new Date(new Date().setHours(0,0,0,0)))} className="px-4 h-8 text-[9px] font-black uppercase tracking-widest text-brand-secondary hover:text-brand-primary transition-all">Today</button>
            <button onClick={moveNext} className="w-8 h-8 flex items-center justify-center hover:bg-brand-surface rounded-ini transition-all text-brand-secondary font-bold text-xs">→</button>
          </div>

          {/* Yeni Kayıt Butonu */}
          <button 
            onClick={() => {
              setBookingPayload(prev => ({
                ...prev,
                start: startDate.toISOString().split('T')[0],
                end: startDate.toISOString().split('T')[0]
              }));
              setIsModalOpen(true);
            }}
            className="px-6 py-3 bg-brand-secondary text-white font-black uppercase text-[10px] tracking-widest rounded-ini hover:bg-brand-primary transition-all shadow-md active:scale-95"
          >
            + New Entry
          </button>
        </div>
      </div>
    </div>

      {/* CALENDAR TABLE */}
      <div className="ini-card overflow-visible">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="bg-brand-surface/30">
                <th className="sticky left-0 z-40 bg-brand-surface p-4 border-r border-brand-primary/10 text-center font-black uppercase text-brand-secondary text-[10px] tracking-widest shadow-md w-[120px]">Resources</th>
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
              {dynamicFloors.map(floor => (
                <Fragment key={floor}>
                  <tr 
                    onClick={() => toggleFloor(floor)}
                    onDragOver={(e) => handleDragOverFloor(e, floor)}
                    onDragLeave={handleDragLeaveFloor}
                    className={`cursor-pointer transition-all duration-300 select-none border-y border-white/10 h-10
                      ${collapsedFloors.includes(floor) ? 'bg-brand-secondary hover:bg-brand-primary/80' : 'bg-brand-secondary/90'}
                    `}
                  >
                    <td className="sticky left-0 z-30 bg-brand-secondary px-4 text-center shadow-xl border-r border-white/10">
                        <div className="flex items-center justify-center gap-2 text-white font-black uppercase text-[10px] tracking-widest h-full">
                    {collapsedFloors.includes(floor) ? '▶' : '▼'} {floorConfigs[floor]?.label || `FLOOR ${floor}`}
                        </div>
                    </td>
                    <td colSpan={days.length} className="relative overflow-hidden group">
                        <div className="flex items-center justify-center w-full h-full min-h-[38px]">
                            <div className={`absolute inset-0 transition-opacity duration-300 bg-brand-primary/20 ${draggedBooking ? 'opacity-100' : 'opacity-0'}`} />
                            <span className="text-white font-black italic tracking-[0.5em] text-[8px] animate-pulse opacity-60 uppercase">
                                {collapsedFloors.includes(floor) ? "● ● ● Click to Reveal ● ● ●" : "Section Active"}
                            </span>
                        </div>
                    </td>
                  </tr>

                  {!collapsedFloors.includes(floor) && rooms.filter(r => r.name?.[0].toUpperCase() === floor).map(room => (
                    <tr key={room.id} className="group/row border-b border-brand-surface">
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
                            className={`p-0.5 border-r border-brand-surface min-w-[40px] min-h-14 relative transition-all group/cell
                              ${getOccupancyColor(dayBookings.length, room.capacity, day.getDay() === 0 || day.getDay() === 6)}
                              ${isShadow ? 'bg-brand-primary ring-4 ring-brand-primary ring-inset scale-95 z-10 shadow-2xl' : ''}
                            `}
                          >
                            <div className="flex flex-col gap-0.5 relative z-10 w-full">
                              {dayBookings.map(b => (
                                <div
                                  key={b.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, b)}
                                  onDragEnd={() => { setDraggedBooking(null); setDragOverCell(null); }}
                                  onClick={() => setEditingBooking(b)}
                                  className="group/booking relative w-full px-1.5 py-1 bg-brand-secondary text-white rounded-sm text-[7px] font-black uppercase cursor-grab active:cursor-grabbing transition-all border border-white/5 flex items-start shadow-sm shrink-0"
                                >
                                  <span className="break-words w-full pointer-events-none leading-tight">
                                    {b.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                            
                            {dayBookings.length < room.capacity && (
                              <button 
                                onClick={() => { setNewBookingData({ roomId: room.id, startDate: dateStr, endDate: dateStr, title: '' }); setIsNewBookingModalOpen(true); }} 
                                className="absolute bottom-0.5 right-0.5 w-4 h-4 flex items-center justify-center bg-brand-primary text-white rounded-full opacity-0 group-hover/cell:opacity-100 transition-all z-30 shadow-lg font-bold text-[10px]"
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
{isModalOpen && (
  <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4">
    {/* Backdrop */}
    <div className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
    
    {/* Modal Content */}
    <div className="bg-white max-w-sm w-full p-8 rounded-ini relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
      <h2 className="text-xl font-black text-brand-secondary uppercase italic text-center mb-8">Quick Entry</h2>
      
      <div className="space-y-5">
        {/* ODA SEÇİCİ (Paylaştığın Yapı) */}
        <div className="bg-brand-surface p-3 rounded flex items-center gap-4 border border-brand-surface">
          <span className="text-xs">🏢</span>
          <select 
            value={bookingPayload.roomId} 
            onChange={(e) => setBookingPayload({...bookingPayload, roomId: e.target.value})}
            className="flex-1 bg-transparent font-black text-brand-secondary outline-none text-[11px] uppercase cursor-pointer"
          >
            <option value="all">Select Resource</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id.toString()}>{room.name.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* BAŞLIK */}
        <div className="space-y-1">
            <label className="text-[8px] font-black text-brand-muted uppercase ml-2">Mission Title</label>
            <input 
              autoFocus
              type="text" 
              placeholder="E.G. PROJECT X"
              className="w-full bg-brand-surface p-4 rounded font-black text-[11px] outline-none ring-1 ring-transparent focus:ring-brand-primary uppercase transition-all"
              value={bookingPayload.title}
              onChange={(e) => setBookingPayload({...bookingPayload, title: e.target.value})}
            />
        </div>

        {/* TARİHLER */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-brand-muted uppercase ml-2">Start</label>
            <input type="date" className="w-full bg-brand-surface p-3 rounded font-black text-[10px] outline-none" value={bookingPayload.start} onChange={(e) => setBookingPayload({...bookingPayload, start: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-brand-muted uppercase ml-2">End</label>
            <input type="date" className="w-full bg-brand-surface p-3 rounded font-black text-[10px] outline-none" value={bookingPayload.end} onChange={(e) => setBookingPayload({...bookingPayload, end: e.target.value})} />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
            <button 
                disabled={submitting || bookingPayload.roomId === 'all' || !bookingPayload.title}
                onClick={handleQuickSubmit}
                className="flex-[2] bg-brand-secondary text-white py-4 rounded font-black uppercase text-[10px] hover:bg-brand-primary disabled:opacity-30 transition-all shadow-lg"
            >
                {submitting ? 'COMMITTING...' : 'CONFIRM ENTRY'}
            </button>
            <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-brand-surface text-brand-muted py-4 rounded font-black uppercase text-[10px] hover:bg-gray-200"
            >
                Abort
            </button>
        </div>
      </div>
    </div>
  </div>
)}
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
                  <input type="date" value={editingBooking ? editForm.end_date : newBookingData.endDate} onChange={(e) => {
                      const newEnd = e.target.value;
                      if (editingBooking) {
                        const start = new Date(editForm.start_date);
                        const diff = Math.ceil((new Date(newEnd).getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                        setEditForm({...editForm, end_date: newEnd, duration: diff});
                      } else {
                        setNewBookingData({...newBookingData, endDate: newEnd});
                      }
                    }} className="bg-brand-surface p-4 rounded-md font-black w-full border-0 focus:ring-2 ring-brand-primary outline-none text-xs" />
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

    {/* TOASTER UI - ÜST ORTA KONUM */}
{toast && (
  <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-top-10 duration-500">
    <div className={`
      flex items-center gap-4 px-8 py-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2
      ${toast.type === 'error' ? 'bg-white border-brand-danger' : 'bg-white border-brand-primary'}
    `}>
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center font-black text-sm
        ${toast.type === 'error' ? 'bg-brand-danger text-white' : 'bg-brand-primary text-white'}
      `}>
        {toast.type === 'error' ? '!' : '✓'}
      </div>
      <p className="font-black text-brand-secondary text-sm uppercase tracking-tight italic whitespace-nowrap">
        {toast.msg}
      </p>
      <div className="w-[2px] h-4 bg-brand-surface mx-2" />
      <button onClick={() => setToast(null)} className="text-brand-muted hover:text-brand-secondary font-black text-sm px-2">KAPAT</button>
    </div>
  </div>
)}
    </div>
  );
}