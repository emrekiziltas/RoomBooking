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

// --- OPTİMİZE EDİLMİŞ INPUT (Yazma takılmasını önler) ---
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
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [selectedDetail, setSelectedDetail] = useState<{ room: Room, day: Date, bookings: Booking[] } | null>(null);
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const [newBookingData, setNewBookingData] = useState({ roomId: 0, date: '', title: '' });
  const [editForm, setEditForm] = useState({ title: '', start_date: '', end_date: '' });

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
  const days = getDaysForPeriod(startDate, daysInMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
const getFloorColor = (floor: string) => {
  switch (floor.toUpperCase()) {
    case 'F': return 'bg-emerald-50 text-emerald-700 border-emerald-100'; // Giriş/Zemin
    case 'M': return 'bg-blue-50 text-blue-700 border-blue-100';          // Orta Kat
    case 'S': return 'bg-amber-50 text-amber-700 border-amber-100';       // Üst Kat/S
    default: return 'bg-slate-100 text-slate-500 border-slate-200';
  }
};
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
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    setStartDate(d);
  };

  const movePrev = () => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    setStartDate(d);
  };

  const goToMonth = (index: number) => {
    const d = new Date(startDate);
    d.setMonth(index);
    d.setDate(1);
    setStartDate(d);
  };

  // --- CRUD (Otomatik Yenileme ve Hata Takibi) ---
  const handleCreate = async () => {
    if (!newBookingData.title) { alert("İsim girmelisiniz!"); return; }
    try {
      await createBooking({
        room_id: newBookingData.roomId,
        title: newBookingData.title,
        start_time: `${newBookingData.date}T09:00:00`,
        end_time: `${newBookingData.date}T17:00:00`,
      });
      setIsNewBookingModalOpen(false);
      setNewBookingData({ roomId: 0, date: '', title: '' });
      await fetchData(); // TABLOYU GÜNCELLE
    } catch (err: any) {
      console.error("Backend Hatası (Oluşturma):", err);
      alert("Kayıt oluşturulamadı. Detayları konsoldan (F12) inceleyin.");
    }
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
      await fetchData(); // TABLOYU GÜNCELLE
    } catch (err: any) {
      console.error("Backend Hatası (Güncelleme):", err);
      alert("Güncelleme yapılamadı.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Silinsin mi?")) return;
    try {
      await deleteBooking(id);
      setEditingBooking(null);
      setSelectedDetail(null);
      await fetchData(); // TABLOYU GÜNCELLE
    } catch (err) { alert("Silme hatası."); }
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
            <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl">M</div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Matrix v2</h1>
              <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest mt-1">
                {startDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <button onClick={movePrev} className="p-3 hover:bg-white hover:text-blue-600 rounded-xl transition-all font-bold text-slate-400">◀</button>
            <button onClick={() => { const d = new Date(); d.setDate(1); setStartDate(d); }} className="px-6 py-2 bg-white text-slate-900 rounded-xl font-black text-[11px] uppercase shadow-sm border border-slate-100">BUGÜN</button>
            <button onClick={moveNext} className="p-3 hover:bg-white hover:text-blue-600 rounded-xl transition-all font-bold text-slate-400">▶</button>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 pt-4 border-t border-slate-50">
          {months.map((month, index) => (
            <button
              key={month}
              onClick={() => goToMonth(index)}
              className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase transition-all border
                ${startDate.getMonth() === index ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
            >
              {month}
            </button>
          ))}
        </div>
      </div>

      {/* TABLO */}
      <div className="max-w-[100vw] mx-auto bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto touch-pan-x select-none">
          <table className="w-full border-collapse" style={{ minWidth: '1300px' }}>
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
    // Katlara göre özel renk ataması
    const floorStyles = {
      F: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      M: 'bg-blue-50 text-blue-700 border-blue-100',
      S: 'bg-amber-50 text-amber-700 border-amber-100'
    }[floor.toUpperCase()] || 'bg-slate-100 text-slate-500 border-slate-200';

    return (
      <Fragment key={floor}>
        {/* --- KAT AYIRICI SATIR --- */}
        <tr className={`${floorStyles} text-[10px] font-black uppercase tracking-[0.3em]`}>
          <td className={`sticky left-0 z-30 ${floorStyles} backdrop-blur-md px-4 py-3 border-y shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]`}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
              Floor {floor}
            </div>
          </td>
          <td colSpan={days.length} className="border-y opacity-50"></td>
        </tr>

        {/* --- ODALAR (O kat altındaki odalar) --- */}
        {rooms.filter(r => r.name?.[0].toUpperCase() === floor).map(room => (
          <tr key={room.id} className="border-b border-slate-50 group/row hover:bg-slate-50/50 transition-colors">
            <td className="sticky left-0 z-30 bg-white p-4 border-r border-slate-200 font-black text-slate-700 text-[11px] uppercase shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] group-hover/row:text-blue-600 transition-colors">
              {room.name}
            </td>
            {days.map(day => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const dayBookings = getBookingsForRoomAndDay(room.id, day);
              const bookedCount = dayBookings.length;
              
              return (
                <td key={day.toISOString()} 
                    onClick={() => bookedCount > 0 
                      ? setSelectedDetail({ room, day, bookings: dayBookings }) 
                      : (setNewBookingData({ roomId: room.id, date: day.toISOString().split('T')[0], title: '' }), setIsNewBookingModalOpen(true))
                    }
                    className={`p-0 border-r border-slate-100 text-center cursor-pointer h-14 relative transition-all group/cell ${getOccupancyColor(bookedCount, room.capacity, isWeekend)}`}
                >
                  <div className="flex flex-col items-center justify-center font-black text-xs">
                    {bookedCount > 0 ? (
                      <>
                        <span>{bookedCount}</span>
                        {bookedCount < room.capacity && <div className="w-1 h-1 bg-current rounded-full mt-1 opacity-40"></div>}
                      </>
                    ) : (
                      <span className="opacity-0 group-hover/cell:opacity-100 text-blue-500 text-xl font-light transition-opacity">+</span>
                    )}
                  </div>
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

      {/* MODALLAR */}


      {selectedDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedDetail.room.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedDetail.day.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} • {selectedDetail.bookings.length}/{selectedDetail.room.capacity} DOLU</p>
              </div>
              <button onClick={() => setSelectedDetail(null)} className="text-slate-300 hover:text-slate-900 text-3xl">×</button>
            </div>
            <div className="space-y-3">
                    {selectedDetail.bookings
          .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()) 
          .map(b => (
                <div key={b.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
                  <div className="font-black text-slate-800 uppercase text-sm">{b.title}</div>
                  <button onClick={() => {
                    setEditingBooking(b);
                    setEditForm({ title: b.title, start_date: new Date(b.start_time).toISOString().split('T')[0], end_date: new Date(b.end_time).toISOString().split('T')[0] });
                    setSelectedDetail(null);
                  }} className="bg-white px-4 py-2 rounded-xl font-black text-[10px] uppercase border border-slate-200 hover:bg-slate-900 hover:text-white transition-all">YÖNET</button>
                </div>
              ))}
              {selectedDetail.bookings.length < selectedDetail.room.capacity && (
                <button onClick={() => {
                  setNewBookingData({ roomId: selectedDetail.room.id, date: selectedDetail.day.toISOString().split('T')[0], title: '' });
                  setIsNewBookingModalOpen(true);
                  setSelectedDetail(null);
                }} className="w-full mt-4 p-4 bg-blue-50 text-blue-600 border-2 border-dashed border-blue-100 rounded-2xl font-black text-[11px] uppercase hover:bg-blue-600 hover:text-white transition-all">+ YENİ KİŞİ EKLE</button>
              )}
            </div>
          </div>
        </div>
      )}

      {(isNewBookingModalOpen || editingBooking) && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl animate-in fade-in zoom-in-95">
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
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Tarih</label>
                  <input type="date" value={editingBooking ? editForm.start_date : newBookingData.date} onChange={(e) => editingBooking ? setEditForm({...editForm, start_date: e.target.value}) : setNewBookingData({...newBookingData, date: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-center outline-none focus:ring-2 ring-blue-500/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 opacity-50 text-center block">Bitiş (Sabit)</label>
                  <input type="date" value={editingBooking ? editForm.start_date : newBookingData.date} disabled className="w-full bg-slate-50 p-4 rounded-2xl font-black text-center opacity-40 cursor-not-allowed" />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={editingBooking ? handleUpdate : handleCreate} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all">ONAYLA</button>
              <button onClick={() => { setIsNewBookingModalOpen(false); setEditingBooking(null); }} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black uppercase hover:bg-slate-200 transition-all">İPTAL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}