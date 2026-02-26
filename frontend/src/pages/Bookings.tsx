import { useEffect, useState, useMemo } from 'react';
import { getBookings, createBooking, deleteBooking, updateBooking } from '../api/bookings';
import { getRooms } from '../api/rooms';
import type { Booking, Room } from '../types/index';

export function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');

  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});

  const [editForm, setEditForm] = useState({ 
    title: '', 
    start_date: '',
    start_slot: 'morning',
    end_date: '',
    end_slot: 'afternoon',
  });

  const [form, setForm] = useState({
    room_id: '',
    title: '',
    start_date: new Date().toISOString().split('T')[0],
    start_slot: 'morning',
    end_date: new Date().toISOString().split('T')[0],
    end_slot: 'afternoon',
  });

  useEffect(() => {
    Promise.all([getBookings(), getRooms()]).then(([b, r]) => {
      setBookings(b.data || []);
      setRooms(r.data || []);
      setLoading(false);
    });
  }, []);

  const filteredBookings = useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) return [];
    if (selectedRoomId === 'all') return bookings;
    return bookings.filter(b => {
      const bId = b.room_id || b.room?.id;
      return bId != null && String(bId) === String(selectedRoomId);
    });
  }, [bookings, selectedRoomId]);

  const groupedBookings = useMemo(() => {
  const groups: { [key: string]: Booking[] } = {};
    const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = [...filteredBookings]
    .filter(booking => {
      // Sadece bugün ve sonrasını al
      const bookingDate = new Date(booking.start_time);
      return bookingDate >= today;
    })
    .sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

  sorted.forEach(booking => {
    const dateStr = booking.start_time.slice(0, 10);
    const [year, month, day] = dateStr.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    
    const date = localDate.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'long', 
      weekday: 'long',
      timeZone: 'Europe/London'
    });
    
    if (!groups[date]) groups[date] = [];
    groups[date].push(booking);
  });
  
  return groups;
}, [filteredBookings]);
  
  const toggleDay = (date: string) => {
    setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const toggleRoom = (dateRoomKey: string) => {
    setExpandedRooms(prev => ({ ...prev, [dateRoomKey]: !prev[dateRoomKey] }));
  };

  function getRoomColor(roomName: string): string {
    const prefix = roomName?.[0]?.toUpperCase();
    if (prefix === 'F') return '#3B82F6'; 
    if (prefix === 'M') return '#10B981'; 
    if (prefix === 'S') return '#F97316'; 
    return '#6B7280';
  }

  async function handleCreate() {
    setError('');
    if (!form.room_id || !form.title) {
        setError('Lütfen tüm alanları doldurun.');
        return;
    }

    const selectedRoom = rooms.find((r) => String(r.id) === String(form.room_id)); 
    const color = getRoomColor(selectedRoom?.name ?? '');
    const startTime = form.start_slot === 'morning' ? `${form.start_date} 08:30:00` : `${form.start_date} 12:30:00`;
    const endTime = form.end_slot === 'morning' ? `${form.end_date} 12:30:00` : `${form.end_date} 17:30:00`;

    try {
      const res = await createBooking({
        room_id: Number(form.room_id),
        title: form.title,
        color: color,
        start_time: startTime,
        end_time: endTime,
      });

      setShowForm(false);
      setForm({ ...form, title: '', room_id: '' });
            const updatedData = await getBookings(); 
       setBookings(updatedData.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Bir hata oluştu.');
    }
  }

  async function handleUpdate() {
    if (!editingBooking) return;
    const color = getRoomColor(editingBooking.room?.name ?? '');
    const startTime = editForm.start_slot === 'morning' ? `${editForm.start_date} 08:30:00` : `${editForm.start_date} 12:30:00`;
    const endTime = editForm.end_slot === 'morning' ? `${editForm.end_date} 12:30:00` : `${editForm.end_date} 17:30:00`;

    try {
      const res = await updateBooking(editingBooking.id, {
        title: editForm.title,
        color: color,
        start_time: startTime,
        end_time: endTime,
      });
      setBookings(bookings.map((b) => (b.id === editingBooking.id ? res.data : b)));
      setEditingBooking(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Güncelleme başarısız!');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bu rezervasyonu silmek istediğinize emin misiniz?')) return;
    try {
      await deleteBooking(id);
      setBookings(bookings.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Silme başarısız!');
    }
  }

  if (loading) return <div className="p-8 text-center font-black text-blue-600 animate-pulse uppercase tracking-widest">Veriler Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      {/* HEADER */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Planlama</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Grup ve Oda Yönetimi</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-8 py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95 ${showForm ? 'bg-gray-200 text-gray-600' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'}`}
        >
          {showForm ? 'VAZGEÇ' : '+ YENİ KAYIT'}
        </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-4 mb-10">
        {/* ODA FİLTRESİ */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-2xl text-xl">🏢</div>
          <select 
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="flex-1 bg-transparent font-black text-gray-700 outline-none cursor-pointer text-lg"
          >
            <option value="all">TÜM ODALARI GÖSTER</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id.toString()}>{room.name.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* YENİ KAYIT FORMU */}
        {showForm && (
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 border-2 border-blue-100 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Toplantı Salonu</label>
                <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} className="w-full bg-gray-50 border-0 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 ring-blue-500/20">
                  <option value="">Oda Seçin...</option>
                  {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Kişi / Başlık</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-gray-50 border-0 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 ring-blue-500/20" placeholder="İsim Giriniz..." />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-blue-50/50 p-6 rounded-[1.5rem] border border-blue-50">
                <span className="text-[10px] font-black text-blue-600 block mb-3 uppercase tracking-widest">Başlangıç</span>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value, end_date: e.target.value })} className="w-full bg-white rounded-xl p-3 mb-3 font-bold shadow-sm border-0" />
                <select value={form.start_slot} onChange={(e) => setForm({ ...form, start_slot: e.target.value })} className="w-full bg-white rounded-xl p-3 font-bold shadow-sm border-0 outline-none">
                  <option value="morning">Sabah (08:30)</option>
                  <option value="afternoon">Öğlen (12:30)</option>
                </select>
              </div>
              <div className="bg-orange-50/50 p-6 rounded-[1.5rem] border border-orange-50">
                <span className="text-[10px] font-black text-orange-600 block mb-3 uppercase tracking-widest">Bitiş</span>
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full bg-white rounded-xl p-3 mb-3 font-bold shadow-sm border-0" />
                <select value={form.end_slot} onChange={(e) => setForm({ ...form, end_slot: e.target.value })} className="w-full bg-white rounded-xl p-3 font-bold shadow-sm border-0 outline-none">
                  <option value="morning">Öğlen (12:30)</option>
                  <option value="afternoon">Akşam (17:30)</option>
                </select>
              </div>
            </div>
            {error && <p className="mt-4 text-red-500 text-xs font-black uppercase italic">{error}</p>}
            <button onClick={handleCreate} className="w-full mt-6 bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all">SİSTEME KAYDET</button>
          </div>
        )}
      </div>

      {/* REZERVASYON LİSTESİ */}
      <div className="max-w-6xl mx-auto pb-20 space-y-4">
        {Object.keys(groupedBookings).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
            <p className="text-gray-300 font-black uppercase tracking-widest text-sm">Görüntülenecek rezervasyon bulunamadı</p>
          </div>
        ) : (
          Object.entries(groupedBookings).map(([date, dayBookings]) => {
            const isDayExpanded = !!expandedDays[date];

            const bookingsByRoom = dayBookings.reduce((acc, booking) => {
              const roomName = booking.room?.name || 'Bilinmeyen Oda';
              if (!acc[roomName]) acc[roomName] = [];
              acc[roomName].push(booking);
              return acc;
            }, {} as Record<string, Booking[]>);

            return (
              <div key={date} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden transition-all duration-300">
                <button 
                  onClick={() => toggleDay(date)}
                  className="w-full flex items-center justify-between p-6 md:p-8 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-gray-900 leading-tight uppercase tracking-tighter">{date}</span>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">
                      {dayBookings.length} REZERVASYON • {Object.keys(bookingsByRoom).length} ODA
                    </span>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-100 transition-all duration-500 ${isDayExpanded ? 'rotate-180 bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isDayExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-6 md:px-8 pb-6 space-y-3 border-t border-gray-50 mt-2 pt-4">
                    {Object.entries(bookingsByRoom).sort(([roomNameA], [roomNameB]) => roomNameA.localeCompare(roomNameB, 'en-GB')) 
                    .map(([roomName, roomBookings]) => {
                      const roomKey = `${date}-${roomName}`;
                      const isRoomExpanded = !!expandedRooms[roomKey];

                      return (
                        <div key={roomName} className="bg-gray-50/50 rounded-2xl overflow-hidden border border-gray-100">
                          <button
                            onClick={() => toggleRoom(roomKey)}
                            className="w-full flex items-center justify-between p-5 hover:bg-gray-100/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getRoomColor(roomName) }}></div>
                              <span className="text-sm font-black text-gray-700 uppercase tracking-tight">{roomName}</span>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                {roomBookings.length} rezervasyon
                              </span>
                            </div>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${isRoomExpanded ? 'rotate-180 bg-white text-gray-700' : 'text-gray-400'}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>
                 
                          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isRoomExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="px-5 pb-5">
                              <div   className="grid gap-3"   style={{        gridTemplateColumns: roomBookings.length <= 2      ? 'repeat(auto-fill, minmax(220px, 320px))'       : 'repeat(auto-fit, minmax(220px, 1fr))'   }}>
                                {roomBookings.map((booking) => (
                                  <div key={booking.id} className="flex flex-col p-4 bg-white rounded-2xl border border-gray-100 group hover:shadow-xl hover:border-blue-200 transition-all duration-300 min-h-[120px] justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center font-black text-xs text-blue-600 shrink-0 shadow-sm">
                                        {booking.title.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <h3 className="font-black text-gray-800 text-[13px] uppercase tracking-tight leading-tight truncate">
                                          {booking.title}
                                        </h3>
                                        <span className="text-[10px] font-bold text-gray-400 mt-0.5">
                                          🕒 {new Date(booking.start_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                      <button 
                                        onClick={() => {
                                          setEditingBooking(booking); 
                                          setEditForm({ 
                                            title: booking.title, 
                                            start_date: booking.start_time.slice(0, 10), 
                                            start_slot: booking.start_time.includes('08:30') ? 'morning' : 'afternoon', 
                                            end_date: booking.end_time.slice(0, 10), 
                                            end_slot: booking.end_time.includes('12:30') ? 'morning' : 'afternoon' 
                                          });
                                        }}
                                        className="flex-1 bg-blue-50 text-blue-600 py-2.5 rounded-xl text-[9px] font-black hover:bg-blue-600 hover:text-white transition-all uppercase"
                                      >
                                        DÜZENLE
                                      </button>
                                      <button 
                                        onClick={() => handleDelete(booking.id)}
                                        className="flex-1 bg-red-50 text-red-500 py-2.5 rounded-xl text-[9px] font-black hover:bg-red-500 hover:text-white transition-all uppercase"
                                      >
                                        SİL
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* GÜNCELLEME MODALI */}
      {editingBooking && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-black mb-8 text-gray-900 uppercase tracking-tighter">KAYDI GÜNCELLE</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">İsim / Başlık</label>
                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full bg-gray-50 border-0 rounded-2xl px-5 py-4 font-bold outline-none ring-2 ring-transparent focus:ring-blue-500/20 transition-all" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50">
                  <label className="text-[10px] font-black text-blue-500 uppercase ml-2 mb-4 block tracking-widest">GİRİŞ / BAŞLANGIÇ</label>
                  <div className="space-y-3">
                    <input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value, end_date: e.target.value })} className="w-full bg-white rounded-xl p-4 font-bold border-0 outline-none shadow-sm text-sm" />
                    <select value={editForm.start_slot} onChange={(e) => setEditForm({ ...editForm, start_slot: e.target.value })} className="w-full bg-white rounded-xl p-4 font-bold text-sm border-0 outline-none shadow-sm cursor-pointer hover:bg-blue-100 transition-colors">
                      <option value="morning">Sabah (08:30)</option>
                      <option value="afternoon">Öğlen (12:30)</option>
                    </select>
                  </div>
                </div>
                <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100/50">
                  <label className="text-[10px] font-black text-orange-500 uppercase ml-2 mb-4 block tracking-widest">ÇIKIŞ / BİTİŞ</label>
                  <div className="space-y-3">
                    <input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} className="w-full bg-white rounded-xl p-4 font-bold border-0 outline-none shadow-sm text-sm" />
                    <select value={editForm.end_slot} onChange={(e) => setEditForm({ ...editForm, end_slot: e.target.value })} className="w-full bg-white rounded-xl p-4 font-bold text-sm border-0 outline-none shadow-sm cursor-pointer hover:bg-orange-100 transition-colors">
                      <option value="morning">Öğlen (12:30)</option>
                      <option value="afternoon">Akşam (17:30)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <button onClick={handleUpdate} className="flex-[2] bg-blue-600 text-white py-5 rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98] text-base">GÜNCELLEMEYİ ONAYLA</button>
              <button onClick={() => setEditingBooking(null)} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase text-base">İPTAL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}