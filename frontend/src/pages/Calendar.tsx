import { useEffect, useState, Fragment } from 'react';
import { getRooms } from '../api/rooms';
import { getBookings, createBooking, updateBooking, deleteBooking } from '../api/bookings';
import type { Room, Booking } from '../types/index';

// --- HELPERS (EN-GB Format: DD/MM/YYYY) ---
// --- HELPERS (EN-GB Format: DD/MM/YYYY) ---

function formatDateGB(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

function getDaysForPeriod(startDate: Date, daysCount: number) {
  const days = [];
  for (let i = 0; i < daysCount; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    date.setHours(12, 0, 0, 0); 
    days.push(date);
  }
  return days;
}

function getOccupancyColor(bookedCount: number, capacity: number, isWeekend: boolean): string {
  if (bookedCount >= capacity) return 'bg-red-600 text-white border-slate-300 shadow-inner';
  if (bookedCount > 0) return 'bg-orange-50/80 text-slate-900 border-slate-300 shadow-md';
  if (isWeekend) return 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-500';
  return 'bg-white hover:bg-slate-50 border-slate-100 text-slate-400';
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
      className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 font-black text-lg outline-none uppercase focus:ring-2 ring-blue-500/20 transition-all"
      placeholder={placeholder}
    />
  );
};

export function Calendar() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string, type: 'error' | 'success' } | null>(null);

  const VIEW_DAYS = 15;
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });

  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [newBookingData, setNewBookingData] = useState({ roomId: 0, date: '', title: '' });
  const [editForm, setEditForm] = useState({ title: '', start_date: '', end_date: '' });
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ roomId: number, date: string } | null>(null);

  const days = getDaysForPeriod(startDate, VIEW_DAYS);

  const showNotification = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    try {
      const [r, b] = await Promise.all([getRooms(), getBookings()]);
      setRooms(r.data);
      setBookings(b.data);
      setLoading(false);
    } catch (err) { console.error("Fetch error:", err); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- DRAG & DROP ----
  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    setDraggedBooking(booking);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '0.1';
  };

  const handleDrop = async (e: React.DragEvent, targetRoomId: number, targetDate: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCell(null);
    if (!draggedBooking) return;

    try {
      await updateBooking(draggedBooking.id, {
        room_id: targetRoomId,
        title: draggedBooking.title,
        start_time: `${targetDate}T08:30:00`,
        end_time: `${targetDate}T16:30:00`,
      });
      await fetchData();
      // ÖRN: "JOHN DOE is scheduled to 27/02/2026"
      showNotification(`${draggedBooking.title.toUpperCase()} is scheduled to ${formatDateGB(targetDate)}`, 'success');
    } catch (err: any) {
      showNotification("Could not reschedule the booking.", 'error');
    } finally {
      setDraggedBooking(null);
    }
  };

  const handleCreate = async () => {
    if (!newBookingData.title) { showNotification("Please enter a title.", 'error'); return; }
    try {
      await createBooking({
        room_id: newBookingData.roomId,
        title: newBookingData.title,
        start_time: `${newBookingData.date}T08:30:00`,
        end_time: `${newBookingData.date}T16:30:00`,
      });
      const savedTitle = newBookingData.title;
      const savedDate = newBookingData.date;
      setIsNewBookingModalOpen(false);
      setNewBookingData({ roomId: 0, date: '', title: '' });
      await fetchData();
      // ÖRN: "NEW TASK is scheduled to 27/02/2026"
      showNotification(`${savedTitle.toUpperCase()} is scheduled to ${formatDateGB(savedDate)}`, 'success');
    } catch (err) { showNotification("Failed to create booking.", 'error'); }
  };

  const handleUpdate = async () => {
    if (!editingBooking) return;
    try {
      await updateBooking(editingBooking.id, {
        title: editForm.title,
        room_id: (editingBooking as any).room_id || editingBooking.room?.id,
        start_time: `${editForm.start_date}T08:30:00`,
        end_time: `${editForm.start_date}T16:30:00`,
      });
      const updatedTitle = editForm.title;
      const updatedDate = editForm.start_date;
      setEditingBooking(null);
      await fetchData();
      showNotification(`${updatedTitle.toUpperCase()} is scheduled to ${formatDateGB(updatedDate)}`, 'success');
    } catch (err) { showNotification("Update failed.", 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteBooking(id);
      setEditingBooking(null);
      await fetchData();
      showNotification("Booking deleted successfully.", 'success');
    } catch (err) { showNotification("Delete failed.", 'error'); }
  };

  function getBookingsForRoomAndDay(roomId: number, day: Date) {
    const checkStr = day.toISOString().split('T')[0];
    return bookings.filter(b => {
      const bRoomId = b.room?.id || (b as any).room_id;
      const bStartStr = new Date(b.start_time).toISOString().split('T')[0];
      return Number(bRoomId) === Number(roomId) && checkStr === bStartStr;
    });
  }

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 animate-pulse uppercase tracking-widest">Initialising Matrix...</div>;

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] font-sans overflow-hidden relative">
      
      {/* TOAST (TITLE + DATE INFO) */}
      {toast && (
        <div className="fixed top-6 right-6 z-[999] animate-in slide-in-from-right fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl font-black text-[10px] tracking-widest flex items-center gap-4 border-2 ${toast.type === 'error' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-emerald-50 border-emerald-500 text-emerald-600'}`}>
            <span className="text-lg">{toast.type === 'error' ? '✕' : '✓'}</span> 
            <div className="flex flex-col">
              <span className="uppercase opacity-50 text-[8px]">{toast.type === 'error' ? 'System Error' : 'Schedule Updated'}</span>
              <span>{toast.msg}</span>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex-none p-4 md:p-6 z-[200]">
        <div className="max-w-full bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">M</div>
            <div>
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-tight">Matrix v2</h1>
              <p className="text-blue-600 text-[9px] font-black uppercase tracking-widest">Shift: 08:30 – 16:30</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
            <button onClick={() => { const d = new Date(startDate); d.setDate(d.getDate() - VIEW_DAYS); setStartDate(d); }} className="p-2 hover:bg-white text-slate-400 font-bold text-[10px] uppercase transition-all">◀ Previous</button>
            <button onClick={() => { const d = new Date(); d.setHours(12,0,0,0); setStartDate(d); }} className="px-4 py-1.5 bg-white text-slate-900 rounded-lg font-black text-[9px] uppercase shadow-sm border border-slate-100">TODAY</button>
            <button onClick={() => { const d = new Date(startDate); d.setDate(d.getDate() + VIEW_DAYS); setStartDate(d); }} className="p-2 hover:bg-white text-slate-400 font-bold text-[10px] uppercase transition-all">Next ▶</button>
          </div>
        </div>
      </header>

      {/* MAIN TABLE */}
      <main className="flex-1 min-h-0 px-4 md:px-6 pb-6 overflow-hidden">
        <div className="h-full bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto select-none scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-[150]">
                <tr>
                  <th className="sticky left-0 top-0 z-[160] bg-slate-50 p-4 min-w-[180px] border-r border-b border-slate-200 text-left font-black uppercase text-slate-400 text-[10px] shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Resources</th>
                  {days.map(day => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <th key={day.toISOString()} className={`p-3 border-r border-b border-slate-100 min-w-[90px] text-center sticky top-0 z-[150] ${isToday ? 'bg-blue-600/10' : 'bg-slate-50'}`}>
                        <div className="text-[9px] font-black text-slate-400 uppercase leading-none">{day.toLocaleDateString('en-GB', { weekday: 'long' })}</div>
                        <div className={`text-lg font-black mt-1 ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>{day.getDate()}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="z-[100]">
                {['F', 'M', 'S'].map(floor => (
                  <Fragment key={floor}>
                    <tr className="bg-slate-50/50 text-[9px] font-black uppercase">
                      <td className="sticky left-0 z-[140] bg-slate-100 px-4 py-2 border-y border-slate-200 text-slate-500 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">FLOOR {floor}</td>
                      <td colSpan={VIEW_DAYS} className="border-y border-slate-200"></td>
                    </tr>
                    {rooms.filter(r => r.name?.[0].toUpperCase() === floor).map(room => (
                      <tr key={room.id} className="group">
                        <td className="sticky left-0 z-[130] bg-white p-4 border-r border-b border-slate-100 font-black text-slate-700 text-[12px] uppercase group-hover:text-blue-600 shadow-[2px_0_5px_rgba(0,0,0,0.05)] transition-colors">{room.name}</td>
                        {days.map(day => {
                          const dateStr = day.toISOString().split('T')[0];
                          const dayBookings = getBookingsForRoomAndDay(room.id, day);
                          const bookedCount = dayBookings.length;
                          const isDragOver = dragOverCell?.roomId === room.id && dragOverCell?.date === dateStr;
                          
                          return (
                            <td 
                              key={day.toISOString()} 
                              onDragOver={(e) => { e.preventDefault(); setDragOverCell({ roomId: room.id, date: dateStr }); }}
                              onDragLeave={() => setDragOverCell(null)}
                              onDrop={(e) => handleDrop(e, room.id, dateStr)}
                              className={`p-2 border-r border-b border-slate-50 min-h-[100px] h-28 relative transition-all ${getOccupancyColor(bookedCount, room.capacity, day.getDay() === 0 || day.getDay() === 6)} ${isDragOver ? 'ring-4 ring-blue-500 ring-inset z-[145] bg-blue-50/50' : ''}`}
                            >
                              <div className="flex flex-col h-full w-full gap-1.5 relative group/cell">
                                <div className="flex flex-col gap-1 overflow-y-auto scrollbar-hide flex-1 relative z-20">
                                  
                                  {dayBookings.map(b => (
                                    <div key={b.id} draggable onDragStart={(e) => handleDragStart(e, b)} onDragEnd={() => {setDraggedBooking(null); setDragOverCell(null);}}
                                      onClick={(e) => { e.stopPropagation(); setEditingBooking(b); setEditForm({ title: b.title, start_date: new Date(b.start_time).toISOString().split('T')[0], end_date: new Date(b.end_time).toISOString().split('T')[0] }); }}
                                      className="px-2 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-grab bg-slate-900 text-white hover:bg-blue-600 transition-all truncate border border-black/10 shadow-sm"
                                    >
                                      {b.title}
                                    </div>
                                  ))}
                                </div>
                                {bookedCount < room.capacity && (
                                  <button onClick={() => { setNewBookingData({ roomId: room.id, date: dateStr, title: '' }); setIsNewBookingModalOpen(true); }} className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-tl-2xl opacity-0 group-hover/cell:opacity-100 flex items-center justify-center shadow-lg z-30 transition-all">
                                    <span className="text-xl font-bold">+</span>
                                  </button>
                                )}
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
      </main>

      {/* MODAL */}
      {(isNewBookingModalOpen || editingBooking) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{editingBooking ? 'Edit Booking' : 'New Entry'}</h2>
              {editingBooking && (
                <button onClick={() => handleDelete(editingBooking.id)} className="bg-red-50 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase">
                  DELETE 🗑️
                </button>
              )}
            </div>
            <div className="space-y-4">
              <FastInput value={editingBooking ? editForm.title : newBookingData.title} onChange={(val) => editingBooking ? setEditForm({...editForm, title: val}) : setNewBookingData({...newBookingData, title: val})} placeholder="ENTRY TITLE..." />
              <input type="date" value={editingBooking ? editForm.start_date : newBookingData.date} onChange={(e) => editingBooking ? setEditForm({...editForm, start_date: e.target.value}) : setNewBookingData({...newBookingData, date: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-center outline-none border-2 border-transparent focus:border-blue-500" />
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl border-2 border-blue-100">
                <div className="text-center flex-1 border-r border-blue-200">
                  <p className="text-[9px] font-black text-blue-400 uppercase">Check-In</p>
                  <p className="font-black text-blue-700">08:30</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-[9px] font-black text-blue-400 uppercase">Check-Out</p>
                  <p className="font-black text-blue-700">16:30</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={editingBooking ? handleUpdate : handleCreate} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black uppercase shadow-lg hover:bg-blue-700 transition-all">CONFIRM</button>
              <button onClick={() => { setIsNewBookingModalOpen(false); setEditingBooking(null); }} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black uppercase hover:bg-slate-200">CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}