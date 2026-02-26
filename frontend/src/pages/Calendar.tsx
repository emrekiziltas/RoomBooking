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
  // 1. Durum: ODA TAM DOLU (Kırmızı)
  if (bookedCount >= capacity) {
    return 'bg-red-600 text-white border-red-700 shadow-inner'; 
  }

  // 2. Durum: ODA KISMİ DOLU / YER VAR (Sarı)
  if (bookedCount > 0) {
    // text-slate-900 yaptık çünkü sarı üzerinde beyaz okunmaz
    return 'bg-yellow-400 text-slate-900 border-yellow-500 shadow-md'; 
  }

  // 3. Durum: ODA TAMAMEN BOŞ
  if (isWeekend) {
    return 'bg-slate-300 hover:bg-slate-400 border-slate-400 text-slate-600'; // Koyu gri hafta sonu
  }
  return 'bg-white hover:bg-slate-50 border-slate-100 text-slate-400'; // Tertemiz iş günü
}

export function Calendar() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const daysToShow = 20; // Sabit bir görünüm (örneğin 20 gün) daha dengeli durur

  const [selectedDetail, setSelectedDetail] = useState<{room: Room, day: Date, bookings: Booking[]} | null>(null);
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const [newBookingData, setNewBookingData] = useState({ roomId: 0, date: '', title: '' });
  const [editForm, setEditForm] = useState({ title: '', start_date: '', end_date: '' });

  const days = getDaysForPeriod(startDate, daysToShow);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fetchData = async () => {
    try {
      const [r, b] = await Promise.all([getRooms(), getBookings()]);
      setRooms(r.data);
      setBookings(b.data);
      setLoading(false);
    } catch (err) {
      console.error("Veri çekme hatası:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- NAVİGASYON ---
  const moveNext = () => {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + 7); // 1 hafta ileri git
    setStartDate(newDate);
  };

  const movePrev = () => {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() - 7); // 1 hafta geri git
    setStartDate(newDate);
  };

  // --- CRUD İŞLEMLERİ ---
  const handleCreate = async () => {
    try {
      await createBooking({
        room_id: newBookingData.roomId,
        title: newBookingData.title || "Yeni Rezervasyon",
        start_time: `${newBookingData.date}T09:00:00`,
        end_time: `${newBookingData.date}T17:00:00`,
      });
      setIsNewBookingModalOpen(false);
      fetchData();
    } catch (err) { alert("Hata!"); }
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
      fetchData();
    } catch (err) { alert("Hata!"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Silmek istediğinize emin misiniz?")) return;
    try {
      await deleteBooking(id);
      setEditingBooking(null);
      fetchData();
    } catch (err) { alert("Hata!"); }
  };

  function getBookingsForRoomAndDay(roomId: number, day: Date) {
    const dayTimestamp = new Date(day).setHours(0,0,0,0);
    return bookings.filter((b) => {
      const bRoomId = b.room?.id || (b as any).room_id;
      if (Number(bRoomId) !== Number(roomId)) return false;
      const start = new Date(b.start_time).setHours(0,0,0,0);
      const end = new Date(b.end_time).setHours(0,0,0,0);
      return dayTimestamp >= start && dayTimestamp <= end;
    });
  }

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 animate-pulse">Calendar</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      
      {/* HEADER (15/30 Kaldırıldı, Oklar ve Bugün öne çıktı) */}
      <div className="max-w-[98vw] mx-auto mb-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
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
          <button onClick={movePrev} className="p-3 hover:bg-white hover:text-blue-600 rounded-xl transition-all font-bold">◀</button>
          <button onClick={() => setStartDate(new Date())} className="px-6 py-2 bg-white text-slate-900 rounded-xl font-black text-[11px] uppercase shadow-sm border">BUGÜN</button>
          <button onClick={moveNext} className="p-3 hover:bg-white hover:text-blue-600 rounded-xl transition-all font-bold">▶</button>
        </div>
      </div>

      {/* TABLE */}
      <div className="max-w-[98vw] mx-auto bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="sticky left-0 z-30 bg-slate-50 p-6 min-w-[180px] border-r border-slate-100 text-left font-black uppercase text-slate-400 text-[10px]">Kaynaklar</th>
                {days.map(day => (
                  <th key={day.toISOString()} className={`p-4 border-r border-slate-100 min-w-[70px] ${day.getTime() === today.getTime() ? 'bg-blue-50/50' : ''}`}>
                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">{day.toLocaleDateString('tr-TR', {weekday: 'short'})}</div>
                    <div className={`text-xl font-black ${day.getTime() === today.getTime() ? 'text-blue-600' : 'text-slate-800'}`}>{day.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
           <tbody>
  {['F', 'M', 'S'].map(floorPrefix => (
    <Fragment key={floorPrefix}>
      <tr className="bg-slate-50/30 text-[10px] font-black uppercase text-slate-400 tracking-widest">
        <td colSpan={days.length + 1} className="px-8 py-3 border-y border-slate-100">KAT {floorPrefix}</td>
      </tr>
      {rooms.filter(r => r.name?.[0].toUpperCase() === floorPrefix).map(room => (
        <tr key={room.id} className="border-b border-slate-50 group">
          <td className="sticky left-0 z-20 bg-white p-6 border-r border-slate-100 font-black text-slate-800 text-sm uppercase">{room.name}</td>
          {days.map(day => {
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const dayBookings = getBookingsForRoomAndDay(room.id, day);
            const bookedCount = dayBookings.length;
            
            return (
              <td key={day.toISOString()} 
                  onClick={() => bookedCount > 0 ? setSelectedDetail({ room, day, bookings: dayBookings }) : (setNewBookingData({ roomId: room.id, date: day.toISOString().split('T')[0], title: '' }), setIsNewBookingModalOpen(true))}
                  className={`p-1 border-r border-slate-50 text-center cursor-pointer h-20 group/cell relative transition-all ${getOccupancyColor(bookedCount, room.capacity, isWeekend)}`}
              >
                <div className="flex flex-col items-center justify-center">
                  {bookedCount > 0 ? (
                    <>
                      <span className="text-sm font-black leading-none">{bookedCount}</span>
                      {bookedCount < room.capacity && (
                        <span className="text-[8px] font-bold uppercase mt-1 opacity-50 whitespace-nowrap">
                          {room.capacity - bookedCount} Boş
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="opacity-0 group-hover/cell:opacity-100 text-blue-500 font-black text-2xl transition-all">+</span>
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

      {/* MODALLAR (Öncekiyle aynı, DB bağlantıları hazır) */}
      {/* ... Detay ve Create/Edit Modalları ... */}
    {/* DETAY MODALI (Güncellenmiş) */}
{selectedDetail && (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedDetail.room.name}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Kapasite: {selectedDetail.room.capacity} / Dolu: {selectedDetail.bookings.length}</p>
        </div>
        <button onClick={() => setSelectedDetail(null)} className="text-slate-400 text-3xl">×</button>
      </div>

      <div className="space-y-3">
        {/* Mevcut Kayıtlar */}
        {selectedDetail.bookings.map(b => (
          <div key={b.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border">
            <div className="font-black text-slate-800 uppercase text-sm">{b.title}</div>
            <button onClick={() => {
              setEditingBooking(b);
              setEditForm({ title: b.title, start_date: new Date(b.start_time).toISOString().split('T')[0], end_date: new Date(b.end_time).toISOString().split('T')[0] });
              setSelectedDetail(null);
            }} className="bg-white px-4 py-2 rounded-lg font-black text-[10px] uppercase border hover:bg-slate-900 hover:text-white transition-all">YÖNET</button>
          </div>
        ))}

        {/* --- YENİ KAYIT BUTONU (Eğer Kapasite Varsa) --- */}
        {selectedDetail.bookings.length < selectedDetail.room.capacity && (
          <button 
            onClick={() => {
              setNewBookingData({ 
                roomId: selectedDetail.room.id, 
                date: selectedDetail.day.toISOString().split('T')[0], 
                title: '' 
              });
              setIsNewBookingModalOpen(true);
              setSelectedDetail(null); // Detay modalını kapat
            }}
            className="w-full mt-4 p-4 bg-blue-50 text-blue-600 border-2 border-dashed border-blue-200 rounded-2xl font-black text-xs uppercase hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span> YENİ KİŞİ EKLE
          </button>
        )}
      </div>
    </div>
  </div>
)}

      {(isNewBookingModalOpen || editingBooking) && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{editingBooking ? 'GÜNCELLE' : 'YENİ KAYIT'}</h2>
              {editingBooking && <button onClick={() => handleDelete(editingBooking.id)} className="text-red-500 font-black text-[10px] uppercase hover:underline">SİL</button>}
            </div>
            <div className="space-y-6">
              <input type="text" value={editingBooking ? editForm.title : newBookingData.title} onChange={(e) => editingBooking ? setEditForm({...editForm, title: e.target.value}) : setNewBookingData({...newBookingData, title: e.target.value})} className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 font-black text-lg outline-none uppercase" placeholder="BAŞLIK..." />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={editingBooking ? editForm.start_date : newBookingData.date} onChange={(e) => editingBooking ? setEditForm({...editForm, start_date: e.target.value}) : setNewBookingData({...newBookingData, date: e.target.value})} className="bg-slate-50 p-4 rounded-2xl font-black text-center" />
                <input type="date" value={editingBooking ? editForm.end_date : newBookingData.date} disabled className="bg-slate-50 p-4 rounded-2xl font-black text-center opacity-50 cursor-not-allowed" />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={editingBooking ? handleUpdate : handleCreate} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase shadow-lg">ONAYLA</button>
              <button onClick={() => { setIsNewBookingModalOpen(false); setEditingBooking(null); }} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase">İPTAL</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}