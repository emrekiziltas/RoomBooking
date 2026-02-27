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
      .filter(booking => new Date(booking.start_time) >= today)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    sorted.forEach(booking => {
      const dateStr = booking.start_time.slice(0, 10);
      const [year, month, day] = dateStr.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      const date = localDate.toLocaleDateString('tr-TR', { 
        day: '2-digit', month: 'long', weekday: 'long' 
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(booking);
    });
    return groups;
  }, [filteredBookings]);
  
  const toggleDay = (date: string) => setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
  const toggleRoom = (key: string) => setExpandedRooms(prev => ({ ...prev, [key]: !prev[key] }));

  function getRoomColor(roomName: string): string {
    const prefix = roomName?.[0]?.toUpperCase();
    if (prefix === 'F') return 'border-brand-primary'; 
    if (prefix === 'M') return 'border-brand-success'; 
    if (prefix === 'S') return 'border-brand-danger'; 
    return 'border-brand-muted';
  }

  // API Fonksiyonları (Mantık aynı kaldı, sadece UI tetikleyicileri güncellendi)
  async function handleCreate() {
    setError('');
    if (!form.room_id || !form.title) { setError('Lütfen alanları doldurun.'); return; }
    const startTime = form.start_slot === 'morning' ? `${form.start_date} 08:30:00` : `${form.start_date} 12:30:00`;
    const endTime = form.end_slot === 'morning' ? `${form.end_date} 12:30:00` : `${form.end_date} 17:30:00`;

    try {
      await createBooking({ room_id: Number(form.room_id), title: form.title, start_time: startTime, end_time: endTime, color: '#4f46e5' });
      setShowForm(false);
      setForm({ ...form, title: '', room_id: '' });
      const updatedData = await getBookings();
      setBookings(updatedData.data);
    } catch (err: any) { setError(err.response?.data?.message || 'Hata oluştu.'); }
  }

  async function handleUpdate() {
    if (!editingBooking) return;
    const startTime = editForm.start_slot === 'morning' ? `${editForm.start_date} 08:30:00` : `${editForm.start_date} 12:30:00`;
    const endTime = editForm.end_slot === 'morning' ? `${editForm.end_date} 12:30:00` : `${editForm.end_date} 17:30:00`;
    try {
      const res = await updateBooking(editingBooking.id, { title: editForm.title, start_time: startTime, end_time: endTime, color: '#4f46e5' });
      setBookings(bookings.map((b) => (b.id === editingBooking.id ? res.data : b)));
      setEditingBooking(null);
    } catch (err: any) { alert('Hata!'); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      await deleteBooking(id);
      setBookings(bookings.filter((b) => b.id !== id));
    } catch (err) { alert('Hata!'); }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-brand-secondary animate-pulse text-2xl uppercase tracking-widest font-brand">
      InI Preparing Plans...
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-surface px-4 pt-2 pb-12 font-brand transition-all">
      
      {/* HEADER - Calendar Stili */}
      <div className="max-w-7xl mx-auto mb-6 border-b-2 border-brand-surface pb-1">
        <div className="flex flex-col md:flex-row justify-between items-end gap-2">
          <div>
            <h1 className="text-2xl font-black text-brand-secondary uppercase tracking-tighter leading-none italic">
              Ops <span className="text-brand-primary">Planning</span>
            </h1>
            <p className="text-brand-muted text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">GROUP & RESOURCE SCHEDULING</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-6 py-2 rounded-ini font-black text-[10px] tracking-widest transition-all uppercase shadow-md active:scale-95 ${showForm ? 'bg-brand-muted text-white' : 'bg-brand-secondary text-white hover:bg-brand-primary'}`}
          >
            {showForm ? 'Cancel' : '+ New Entry'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-4 mb-8">
        {/* RESOURCE FILTER */}
        <div className="ini-card p-3 flex items-center gap-4">
          <span className="text-xs">🏢</span>
          <select 
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="flex-1 bg-transparent font-black text-brand-secondary outline-none cursor-pointer text-xs uppercase tracking-tight"
          >
            <option value="all">View All Resources</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id.toString()}>{room.name.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* CREATE FORM - Endüstriyel Panel */}
        {showForm && (
          <div className="ini-card p-6 border-t-4 border-brand-primary animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Resource</label>
                <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} className="w-full bg-brand-surface border-0 rounded-ini px-4 py-2.5 font-black text-xs outline-none focus:ring-1 ring-brand-primary">
                  <option value="">Select Resource...</option>
                  {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Group Title / Guest</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-brand-surface border-0 rounded-ini px-4 py-2.5 font-black text-xs outline-none focus:ring-1 ring-brand-primary uppercase" placeholder="NAME..." />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-brand-surface/50 p-4 rounded-ini border border-brand-surface">
                <span className="text-[8px] font-black text-brand-primary block mb-2 uppercase tracking-widest text-center">Arrival</span>
                <div className="flex gap-2">
                   <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value, end_date: e.target.value })} className="flex-[2] bg-white rounded-ini px-2 py-1.5 font-black text-[10px] shadow-sm border-0 outline-none" />
                   <select value={form.start_slot} onChange={(e) => setForm({ ...form, start_slot: e.target.value })} className="flex-1 bg-white rounded-ini px-2 py-1.5 font-black text-[10px] shadow-sm border-0 outline-none">
                     <option value="morning">08:30</option>
                     <option value="afternoon">12:30</option>
                   </select>
                </div>
              </div>
              <div className="bg-brand-surface/50 p-4 rounded-ini border border-brand-surface">
                <span className="text-[8px] font-black text-brand-danger block mb-2 uppercase tracking-widest text-center">Departure</span>
                <div className="flex gap-2">
                   <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="flex-[2] bg-white rounded-ini px-2 py-1.5 font-black text-[10px] shadow-sm border-0 outline-none" />
                   <select value={form.end_slot} onChange={(e) => setForm({ ...form, end_slot: e.target.value })} className="flex-1 bg-white rounded-ini px-2 py-1.5 font-black text-[10px] shadow-sm border-0 outline-none">
                     <option value="morning">12:30</option>
                     <option value="afternoon">17:30</option>
                   </select>
                </div>
              </div>
            </div>
            {error && <p className="mt-3 text-brand-danger text-[9px] font-black uppercase text-center italic">{error}</p>}
            <button onClick={handleCreate} className="w-full mt-4 bg-brand-secondary text-white py-3 rounded-ini font-black text-[11px] tracking-widest hover:bg-brand-primary transition-all shadow-md">COMMIT TO SCHEDULE</button>
          </div>
        )}
      </div>

      {/* SCHEDULE LIST */}
      <div className="max-w-7xl mx-auto pb-20 space-y-3">
        {Object.entries(groupedBookings).map(([date, dayBookings]) => {
          const isDayExpanded = !!expandedDays[date];
          const bookingsByRoom = dayBookings.reduce((acc, b) => {
            const r = b.room?.name || 'UNKNOWN';
            if (!acc[r]) acc[r] = [];
            acc[r].push(b);
            return acc;
          }, {} as Record<string, Booking[]>);

          return (
            <div key={date} className="ini-card overflow-hidden">
              <button onClick={() => toggleDay(date)} className="w-full flex items-center justify-between p-4 hover:bg-brand-surface/50 transition-all text-left">
                <div>
                  <span className="text-sm font-black text-brand-secondary uppercase tracking-tight italic leading-none">{date}</span>
                  <div className="text-[9px] font-black text-brand-muted uppercase tracking-widest mt-1">
                    {dayBookings.length} ACTIONS • {Object.keys(bookingsByRoom).length} SECTIONS
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-ini flex items-center justify-center border-2 border-brand-surface transition-all ${isDayExpanded ? 'rotate-180 bg-brand-secondary text-white' : 'text-brand-muted'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>

              <div className={`transition-all duration-500 ease-in-out ${isDayExpanded ? 'max-h-[5000px] opacity-100 p-4 pt-0' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="space-y-3 border-t border-brand-surface pt-4">
                  {Object.entries(bookingsByRoom).sort(([a], [b]) => a.localeCompare(b)).map(([roomName, roomBookings]) => {
                    const roomKey = `${date}-${roomName}`;
                    const isRoomExpanded = !!expandedRooms[roomKey];

                    return (
                      <div key={roomName} className={`border-l-4 ${getRoomColor(roomName)} bg-brand-surface/20 rounded-ini overflow-hidden`}>
                        <button onClick={() => toggleRoom(roomKey)} className="w-full flex items-center justify-between p-3 hover:bg-brand-surface/50 transition-colors">
                          <span className="text-[10px] font-black text-brand-secondary uppercase tracking-widest">{roomName}</span>
                          <span className="text-[9px] font-black text-brand-muted uppercase">{roomBookings.length} PLANNED</span>
                        </button>
                        
                        <div className={`${isRoomExpanded ? 'block' : 'hidden'} px-3 pb-3`}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {roomBookings.map((booking) => (
                              <div key={booking.id} className="bg-white p-3 rounded-ini border border-brand-surface group hover:border-brand-primary transition-all shadow-sm">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="min-w-0">
                                    <h4 className="font-black text-brand-secondary text-[11px] uppercase truncate tracking-tight">{booking.title}</h4>
                                    <span className="text-[9px] font-bold text-brand-muted block mt-0.5 italic">
                                      {new Date(booking.start_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <button onClick={() => {
                                      setEditingBooking(booking);
                                      setEditForm({
                                        title: booking.title,
                                        start_date: booking.start_time.slice(0, 10),
                                        start_slot: booking.start_time.includes('08:30') ? 'morning' : 'afternoon',
                                        end_date: booking.end_time.slice(0, 10),
                                        end_slot: booking.end_time.includes('12:30') ? 'morning' : 'afternoon'
                                      });
                                    }} className="p-1.5 bg-brand-surface text-brand-secondary rounded hover:bg-brand-primary hover:text-white transition-colors">✏️</button>
                                    <button onClick={() => handleDelete(booking.id)} className="p-1.5 bg-brand-surface text-brand-danger rounded hover:bg-brand-danger hover:text-white transition-colors">🗑️</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* UPDATE MODAL - Profesyonel Overlay */}
      {editingBooking && (
        <div className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="ini-card p-8 w-full max-w-xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black mb-6 text-brand-secondary uppercase tracking-tighter italic border-b-2 border-brand-surface pb-2">Modify Schedule</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Update Group Name</label>
                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full bg-brand-surface border-0 rounded-ini px-4 py-2.5 font-black text-xs outline-none focus:ring-1 ring-brand-primary uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 bg-brand-surface/30 p-4 rounded-ini">
                   <span className="text-[8px] font-black text-brand-primary block text-center uppercase">New Arrival</span>
                   <input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value, end_date: e.target.value })} className="w-full bg-white rounded-ini px-2 py-1.5 font-black text-[10px] shadow-sm border-0" />
                   <select value={editForm.start_slot} onChange={(e) => setEditForm({ ...editForm, start_slot: e.target.value })} className="w-full bg-white rounded-ini px-2 py-1.5 font-black text-[10px] shadow-sm border-0 outline-none">
                     <option value="morning">08:30</option>
                     <option value="afternoon">12:30</option>
                   </select>
                </div>
                <div className="space-y-2 bg-brand-surface/30 p-4 rounded-ini">
                   <span className="text-[8px] font-black text-brand-danger block text-center uppercase">New Departure</span>
                   <input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} className="w-full bg-white rounded-ini px-2 py-1.5 font-black text-[10px] shadow-sm border-0" />
                   <select value={editForm.end_slot} onChange={(e) => setEditForm({ ...editForm, end_slot: e.target.value })} className="w-full bg-white rounded-ini px-2 py-1.5 font-black text-[10px] shadow-sm border-0 outline-none">
                     <option value="morning">12:30</option>
                     <option value="afternoon">17:30</option>
                   </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleUpdate} className="flex-[2] bg-brand-secondary text-white py-3 rounded-ini font-black text-[11px] tracking-widest hover:bg-brand-primary transition-all">APPLY UPDATES</button>
              <button onClick={() => setEditingBooking(null)} className="flex-1 bg-brand-surface text-brand-muted py-3 rounded-ini font-black text-[11px] tracking-widest uppercase hover:bg-brand-muted hover:text-white transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}