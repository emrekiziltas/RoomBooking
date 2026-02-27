import { useEffect, useState, Fragment } from 'react';
import { getRooms } from '../api/rooms';
import { getBookings, createBooking, updateBooking, deleteBooking } from '../api/bookings';
import type { Room, Booking } from '../types/index';

// --- YARDIMCI FONKSİYONLAR ---
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
  if (bookedCount >= capacity) return 'bg-red-600 text-white border-red-700 shadow-inner';
  if (bookedCount > 0) return 'bg-yellow-400 text-slate-900 border-yellow-500 shadow-md';
  if (isWeekend) return 'bg-slate-300 hover:bg-slate-400 border-slate-400 text-slate-600';
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
  const [viewWindow, setViewWindow] = useState<7 | 15 >(15);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [newBookingData, setNewBookingData] = useState({ roomId: 0, startDate: '', endDate: '', title: '' });
  const [editForm, setEditForm] = useState({ title: '', start_date: '', end_date: '' });
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ roomId: number, date: string } | null>(null);

  const days = getDaysForPeriod(startDate, viewWindow);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fetchData = async () => {
    try {
      const [r, b] = await Promise.all([getRooms(), getBookings()]);
      setRooms(r.data);
      setBookings(b.data);
      setLoading(false);
    } catch (err) { console.error("Veri çekme hatası:", err); }
  };

  useEffect(() => { fetchData(); }, []);

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
    if (!newBookingData.title) { alert("İsim girmelisiniz!"); return; }
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
    } catch (err: any) { alert("Kayıt oluşturulamadı."); }
  };

  const handleUpdate = async () => {
    if (!editingBooking) return;
    if (editForm.end_date < editForm.start_date) { alert("Bitiş tarihi hatalı!"); return; }
    try {
      await updateBooking(editingBooking.id, {
        title: editForm.title,
        start_time: `${editForm.start_date}T09:00:00`,
        end_time: `${editForm.end_date}T17:00:00`,
      });
      setEditingBooking(null);
      await fetchData();
    } catch (err: any) { alert("Güncelleme hatası."); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Silinsin mi?")) return;
    try {
      await deleteBooking(id);
      setEditingBooking(null);
      await fetchData();
    } catch (err) { alert("Silme hatası."); }
  };

  // --- DRAG & DROP (Süreyi Koruyan Versiyon) ---
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

    const formatDateTime = (date: Date) => {
      return date.getFullYear() + '-' + 
             String(date.getMonth() + 1).padStart(2, '0') + '-' + 
             String(date.getDate()).padStart(2, '0') + 'T' + 
             String(date.getHours()).padStart(2, '0') + ':' + 
             String(date.getMinutes()).padStart(2, '0') + ':00';
    };

    try {
      await updateBooking(draggedBooking.id, {
        room_id: targetRoomId,
        title: draggedBooking.title,
        start_time: formatDateTime(newStart),
        end_time: formatDateTime(newEnd),
      });
      await fetchData();
    } catch (err: any) {
      alert("Taşıma işlemi başarısız: " + (err.response?.data?.message || "Oda dolu."));
    } finally {
      setDraggedBooking(null);
      setDragOverCell(null);
    }
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

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 animate-pulse uppercase tracking-widest">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans overflow-x-hidden">
      
      {/* HEADER */}
      <div className="max-w-[100vw] mx-auto mb-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">InI Booking v2</h1>
              <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest mt-1">
                {days[0].toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} - {days[days.length - 1].toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {[7, 15].map((v) => (
                <button
                  key={v}
                  onClick={() => setViewWindow(v as any)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${viewWindow === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {v} GÜN
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <button onClick={movePrev} className="p-3 hover:bg-white hover:text-blue-600 rounded-xl transition-all font-bold text-slate-400">◀</button>
              <button onClick={() => { const d = new Date(); d.setHours(0,0,0,0); setStartDate(d); }} className="px-6 py-2 bg-white text-slate-900 rounded-xl font-black text-[11px] uppercase shadow-sm border border-slate-100">BUGÜN</button>
              <button onClick={moveNext} className="p-3 hover:bg-white hover:text-blue-600 rounded-xl transition-all font-bold text-slate-400">▶</button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLO */}
      <div className="max-w-[100vw] mx-auto bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto touch-pan-x select-none">
          <table className="w-full border-collapse" style={{ minWidth: viewWindow === 30 ? '1600px' : '1000px' }}>
            <thead>
              <tr className="bg-slate-50/50">
                <th className="sticky left-0 z-40 bg-slate-50 p-4 min-w-[140px] border-r border-slate-200 text-left font-black uppercase text-slate-400 text-[10px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                  Kaynaklar
                </th>
                {days.map(day => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = day.getTime() === today.getTime();
                  return (
                    <th key={day.toISOString()} className={`p-2 border-r border-slate-100 min-w-[42px] text-center ${isToday ? 'bg-blue-600/10' : (isWeekend ? 'bg-slate-300' : '')}`}>
                      <div className="text-[8px] font-black text-slate-400 uppercase leading-none">{day.toLocaleDateString('tr-TR', { weekday: 'short' }).charAt(0)}</div>
                      <div className={`text-sm font-black mt-0.5 ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>{day.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {['F', 'M', 'S'].map(floor => {
                const floorStyles = {
                  F: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                  M: 'bg-blue-50 text-blue-700 border-blue-100',
                  S: 'bg-amber-50 text-amber-700 border-amber-100'
                }[floor.toUpperCase()] || 'bg-slate-100 text-slate-500 border-slate-200';

                return (
                  <Fragment key={floor}>
                    <tr className={`${floorStyles} text-[10px] font-black uppercase tracking-[0.3em]`}>
                      <td className={`sticky left-0 z-30 ${floorStyles} backdrop-blur-md px-4 py-3 border-y shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]`}>
                        Floor {floor}
                      </td>
                      <td colSpan={days.length} className="border-y opacity-50"></td>
                    </tr>
                    {rooms.filter(r => r.name?.[0].toUpperCase() === floor).map(room => (
                      <tr key={room.id} className="border-b border-slate-50 group/row hover:bg-slate-50/50">
<td className="sticky left-0 z-30 bg-white p-4 border-r border-slate-200 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] group-hover/row:bg-slate-50 transition-all">
  <div className="flex flex-col items-center justify-center gap-2 text-center h-full">
    {/* Oda İsmi - Tam Orta */}
    <span className="font-black text-slate-900 text-[13px] uppercase tracking-tight group-hover/row:text-blue-600 transition-colors leading-tight">
      {room.name}
    </span>
    
    {/* Kapasite Badge - Altında ve Ortalı */}
    <div className="flex items-center justify-center gap-1.5">
      <div className="flex items-center h-5 px-2 rounded-full bg-slate-100 border border-slate-200 group-hover/row:bg-white transition-colors shadow-sm">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mr-1">CAP:</span>
        <span className="text-[10px] font-black text-slate-800">{room.capacity}</span>
      </div>

    </div>
  </div>
</td>
                         
                        {days.map(day => {
                          const dateStr = day.toISOString().split('T')[0];
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          const dayBookings = getBookingsForRoomAndDay(room.id, day);
                          const isDragOver = dragOverCell?.roomId === room.id && dragOverCell?.date === dateStr;
                          
                          return (
                            <td 
                              key={day.toISOString()} 
                              onDragOver={(e) => handleDragOver(e, room.id, dateStr)}
                              onDrop={(e) => handleDrop(e, room.id, dateStr)}
                              className={`p-1 border-r border-slate-100 text-center h-28 min-w-[100px] relative transition-all group/cell
                                ${getOccupancyColor(dayBookings.length, room.capacity, isWeekend)}
                                ${isDragOver ? 'ring-4 ring-blue-500 ring-inset scale-105 shadow-2xl z-20' : ''}
                              `}
                            >
                              {dayBookings.length > 0 ? (
                                <div className="flex flex-col gap-1.5 justify-start h-full overflow-y-auto no-scrollbar py-1">
                                  {dayBookings.map(b => (
                                    <div
                                      key={b.id}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, b)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingBooking(b);
                                        setEditForm({ 
                                          title: b.title, 
                                          start_date: new Date(b.start_time).toISOString().split('T')[0], 
                                          end_date: new Date(b.end_time).toISOString().split('T')[0]
                                        });
                                      }}
                                      className="w-full px-2 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase cursor-move hover:bg-blue-600 transition-all truncate text-left border border-white/20 shadow-md"
                                      title={b.title}
                                    >
                                      {b.title}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setNewBookingData({ roomId: room.id, startDate: dateStr, endDate: dateStr, title: '' });
                                    setIsNewBookingModalOpen(true);
                                  }}
                                  className="w-full h-full opacity-0 group-hover/cell:opacity-100 text-blue-500 text-3xl font-light transition-opacity"
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL (Create/Edit) */}
      {(isNewBookingModalOpen || editingBooking) && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl animate-in zoom-in-90 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{editingBooking ? 'GÜNCELLE' : 'YENİ KAYIT'}</h2>
              {editingBooking && <button onClick={() => handleDelete(editingBooking.id)} className="text-red-500 font-black text-[10px] uppercase hover:underline">SİL</button>}
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">İsim / Başlık</label>
                <FastInput 
                  value={editingBooking ? editForm.title : newBookingData.title} 
                  onChange={(val) => editingBooking ? setEditForm({...editForm, title: val}) : setNewBookingData({...newBookingData, title: val})}
                  placeholder="İSİM GİRİNİZ..." 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Başlangıç</label>
                  <input type="date" value={editingBooking ? editForm.start_date : newBookingData.startDate} onChange={(e) => editingBooking ? setEditForm({...editForm, start_date: e.target.value}) : setNewBookingData({...newBookingData, startDate: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-center" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Bitiş</label>
                  <input type="date" value={editingBooking ? editForm.end_date : newBookingData.endDate} min={editingBooking ? editForm.start_date : newBookingData.startDate} onChange={(e) => editingBooking ? setEditForm({...editForm, end_date: e.target.value}) : setNewBookingData({...newBookingData, endDate: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-center" />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={editingBooking ? handleUpdate : handleCreate} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase shadow-lg hover:bg-blue-700 active:scale-95 transition-all">ONAYLA</button>
              <button onClick={() => { setIsNewBookingModalOpen(false); setEditingBooking(null); }} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black uppercase hover:bg-slate-200 transition-all">İPTAL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}