import { useEffect, useState, Fragment, useMemo } from 'react';
import { getRooms } from '../api/rooms';
import { getBookings, createBooking, updateBooking, deleteBooking } from '../api/bookings';
import type { Room, Booking } from '../types/index';

// Dosyanın en üstüne, importların altına ekle:
const scrollbarHideStyle = {
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': {
    display: 'none'
  }
} as any;

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
  // TAM DOLU: Artık daha koyu bir kırmızı/bordo tonu (Rose-900 zemin, Beyaz yazı)
  if (bookedCount >= capacity) return 'bg-rose-700 text-white border-rose-800 shadow-inner ring-1 ring-rose-900/20'; 
  
  // KISMİ DOLU: Indigo (Mor-Mavi) tonu
  if (bookedCount > 0) return 'bg-indigo-100 text-indigo-900 border-indigo-200 shadow-sm'; 
  
  // HAFTA SONU: Belirgin gri
  if (isWeekend) return 'bg-slate-50 border-slate-50 text-slate-500'; 
  
  // BOŞ: Saf beyaz
  return 'bg-white border-slate-200 text-slate-400'; 
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
      className="w-full bg-slate-100 border-0 rounded-2xl px-6 py-4 font-black text-lg outline-none uppercase focus:ring-2 ring-indigo-500 transition-all placeholder:text-slate-400"
      placeholder={placeholder}
    />
  );
};

export function Calendar() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewWindow, setViewWindow] = useState<7 | 15>(15);
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
    // Saatleri temizleyerek sadece gün bazlı obje oluşturuyoruz
    const start = new Date(editingBooking.start_time.split(/[\sT]/)[0]);
    const end = new Date(editingBooking.end_time.split(/[\sT]/)[0]);
    
    // Milisaniye farkını alıp güne çeviriyoruz
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    setEditForm({
      title: editingBooking.title,
      start_date: editingBooking.start_time.split(/[\sT]/)[0],
      end_date: editingBooking.end_time.split(/[\sT]/)[0],
      duration: diffDays // Artık net gece sayısını tutuyor
    });
  }
}, [editingBooking]);


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
  
  const newStartDate = new Date(newStartStr);
  const newEndDate = new Date(newStartDate);
  
  // Örn: Duration 1 ise, 01.03.2026 üzerine 1 gün ekler -> 02.03.2026 olur.
  newEndDate.setDate(newStartDate.getDate() + (editForm.duration || 0));
  
  // ISO formatına çevirirken yerel saat dilimi kaymasını önlemek için manuel format:
  const y = newEndDate.getFullYear();
  const m = String(newEndDate.getMonth() + 1).padStart(2, '0');
  const d = String(newEndDate.getDate()).padStart(2, '0');
  const formattedEnd = `${y}-${m}-${d}`;
  
  setEditForm({
    ...editForm,
    start_date: newStartStr,
    end_date: formattedEnd
  });
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

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-900 animate-pulse text-2xl uppercase">InI Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F1F3F6] p-4 md:p-8 font-sans">
      
      {/* HEADER */}
      <div className="max-w-[100vw] mx-auto mb-8 flex flex-col md:flex-row justify-between items-end gap-6 border-b-2 border-slate-200 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
            InI Booking <span className="text-[12px] bg-slate-900 text-white px-3 py-1 rounded ml-2 align-middle">PRO v2</span>
          </h1>
          <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] mt-3">
            {days[0].toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' })} — {days[days.length - 1].toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-200 p-1 rounded-xl border border-slate-300">
            {[7, 15].map((v) => (
              <button key={v} onClick={() => setViewWindow(v as any)} className={`px-6 py-2 rounded-lg text-[11px] font-black transition-all ${viewWindow === v ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>{v} GÜN</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={movePrev} className="w-12 h-12 flex items-center justify-center bg-white border-2 border-slate-200 rounded-2xl hover:border-indigo-500 transition-all text-slate-900 font-bold">←</button>
            <button onClick={() => setStartDate(new Date(new Date().setHours(0,0,0,0)))} className="px-8 py-3 text-[11px] font-black uppercase tracking-widest text-white bg-slate-900 rounded-2xl hover:bg-indigo-600 transition-all shadow-lg">Bugün</button>
            <button onClick={moveNext} className="w-12 h-12 flex items-center justify-center bg-white border-2 border-slate-200 rounded-2xl hover:border-indigo-500 transition-all text-slate-900 font-bold">→</button>
          </div>
        </div>
      </div>

      {/* TABLO */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-40 bg-slate-100 p-6 min-w-[200px] border-r-2 border-slate-200 text-center font-black uppercase text-slate-900 text-[12px] tracking-widest shadow-md">Kaynaklar</th>
                {days.map(day => {
                  const isToday = day.getTime() === today.getTime();
                  return (
                    <th key={day.toISOString()} className={`p-4 border-r border-slate-200 min-w-[70px] text-center ${isToday ? 'bg-indigo-600 text-white' : ''}`}>
                      <div className={`text-[10px] font-black uppercase ${isToday ? 'text-indigo-100' : 'text-slate-400'}`}>{day.toLocaleDateString('tr-TR', { weekday: 'short' })}</div>
                      <div className="text-xl font-black">{day.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {['F', 'M', 'S'].map(floor => (
                <Fragment key={floor}>
                  <tr className="bg-slate-800 text-[11px] font-black uppercase tracking-[0.5em] text-white">
                    <td className="sticky left-0 z-30 bg-slate-800 px-6 py-3 border-y border-slate-700 text-center shadow-md">Floor {floor}</td>
                    <td colSpan={days.length} className="border-y border-slate-700 opacity-20 italic pl-4">InI Multi-Resource Management</td>
                  </tr>
                  {rooms.filter(r => r.name?.[0].toUpperCase() === floor).map(room => (
                    <tr key={room.id} className="group/row border-b border-slate-100">
                      <td className="sticky left-0 z-30 bg-white p-6 border-r-2 border-slate-200 group-hover/row:bg-slate-50 transition-all text-center">
                        <div className="font-black text-slate-900 text-[15px] uppercase tracking-tighter">{room.name}</div>
                        <div className="text-[10px] font-black text-indigo-600 mt-1 uppercase bg-indigo-50 rounded-full px-2 py-0.5 inline-block">Kapasite: {room.capacity}</div>
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
  className={`p-1.5 border-r border-slate-100 h-36 min-w-[120px] relative transition-all group/cell
    ${getOccupancyColor(dayBookings.length, room.capacity, day.getDay() === 0 || day.getDay() === 6)}
    ${isShadow ? 'bg-indigo-700 ring-4 ring-indigo-900 ring-inset scale-95 z-10' : ''}
  `}
>
  {/* Kaydırma çubuğu gizlenmiş konteyner */}
  <div 
    className="flex flex-col gap-1 h-full overflow-y-auto" 
    style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
  >
    {/* Webkit için gizleme sınıfını (no-scrollbar) Tailwind config'e eklemediysen inline style en garantisi */}
    <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    
    <div className="no-scrollbar flex flex-col gap-1 h-full overflow-y-auto">
      {dayBookings.map(b => (
        <div
          key={b.id}
          draggable
          onDragStart={(e) => handleDragStart(e, b)}
          onClick={() => { setEditingBooking(b); setEditForm({ title: b.title, start_date: b.start_time.split('T')[0], end_date: b.end_time.split('T')[0] }); }}
          className="w-full p-2.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase cursor-grab active:cursor-grabbing hover:bg-indigo-600 transition-all shadow-md border border-white/10 shrink-0"
        >
          {b.title}
        </div>
      ))}
    </div>
  </div>

  {!dayBookings.length && (
    <button onClick={() => { setNewBookingData({ roomId: room.id, startDate: dateStr, endDate: dateStr, title: '' }); setIsNewBookingModalOpen(true); }} className="absolute inset-0 opacity-0 group-hover/cell:opacity-100 text-indigo-600 text-4xl font-light transition-all cursor-crosshair">+</button>
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

      {/* MODAL */}
      {(isNewBookingModalOpen || editingBooking) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[3rem] p-12 w-full max-w-lg shadow-2xl border-4 border-slate-900">
            <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tighter uppercase italic underline decoration-indigo-500">{editingBooking ? 'Güncelle' : 'Yeni Kayıt'}</h2>
            <div className="space-y-6">
              <FastInput value={editingBooking ? editForm.title : newBookingData.title} onChange={(val) => editingBooking ? setEditForm({...editForm, title: val}) : setNewBookingData({...newBookingData, title: val})} placeholder="KAYIT BAŞLIĞI..." />
              <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
  <label className="text-[10px] font-black uppercase ml-2 text-slate-400">Giriş</label>
  <input 
    type="date" 
    value={editForm.start_date}
    onChange={(e) => handleStartDateChange(e.target.value)} // Yeni fonksiyon
    className="bg-slate-100 p-5 rounded-2xl font-black w-full" 
  />
</div>

<div className="space-y-2">
  <label className="text-[10px] font-black uppercase ml-2 text-slate-400">Çıkış</label>
  <input 
    type="date" 
    value={editForm.end_date}
    onChange={(e) => {
      // Eğer kullanıcı manuel olarak çıkış tarihini değiştirirse, süreyi (duration) yeniden hesapla
      const newEnd = new Date(e.target.value);
      const start = new Date(editForm.start_date);
      const diff = Math.ceil((newEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      setEditForm({...editForm, end_date: e.target.value, duration: diff});
    }}
    className="bg-slate-100 p-5 rounded-2xl font-black w-full" 
  />
</div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={editingBooking ? handleUpdate : handleCreate} className="flex-1 bg-indigo-600 text-white py-6 rounded-2xl font-black uppercase hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">Onayla</button>
              {editingBooking && <button onClick={() => handleDelete(editingBooking.id)} className="px-10 bg-rose-600 text-white rounded-2xl font-black uppercase hover:bg-rose-700 transition-all">Sil</button>}
              <button onClick={() => { setIsNewBookingModalOpen(false); setEditingBooking(null); }} className="px-8 bg-slate-200 text-slate-600 rounded-2xl font-black uppercase hover:bg-slate-300 transition-all">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}