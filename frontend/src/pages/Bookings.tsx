import { useEffect, useState, useMemo } from 'react';
import { getBookings, createBooking, deleteBooking, updateBooking } from '../api/bookings';
import { getRooms, getFloors } from '../api/rooms';
import type { Booking, Room } from '../types/index';

const SLOTS = {
  morning: { start: '08:30:00', end: '12:30:00', label: '08:30' },
  afternoon: { start: '12:30:00', end: '17:30:00', label: '12:30' }
};

export function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomConfigs, setRoomConfigs] = useState<Record<string, { label: string, color: string }>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');

  // --- CUSTOM TOAST STATE ---
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    room_id: '',
    title: '',
    start_date: new Date().toISOString().split('T')[0],
    start_slot: 'morning',
    end_date: new Date().toISOString().split('T')[0],
    end_slot: 'afternoon',
  });

  const [editForm, setEditForm] = useState({ ...form });

  // Auto-hide Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bRes, rRes, fRes] = await Promise.all([
          getBookings(),
          getRooms(),
          getFloors()
        ]);

        const apiBookings = bRes.data || [];
        const apiRooms = rRes.data || [];
        const apiFloors = Array.isArray(fRes.data) ? fRes.data : Array.isArray(fRes) ? fRes : [];

        const finalRoomConfig: Record<string, any> = {};

        apiRooms.forEach((room: any) => {
          const floor = apiFloors.find((f: any) => f.id === room.floor_id);
          const borderClass = floor?.border_color_class || '';
          const color = borderClass || 'border-brand-muted';
          const roomNameUpper = room.name.toUpperCase();
          finalRoomConfig[roomNameUpper] = { label: roomNameUpper, color };
        });

        setBookings(apiBookings);
        setRooms(apiRooms);
        setRoomConfigs(finalRoomConfig);
      } catch (err) {
        setToast({ msg: "Veri yükleme hatası!", type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const groupedBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = selectedRoomId === 'all' ? bookings : bookings.filter(b => String(b.room_id || b.room?.id) === selectedRoomId);
    const groups: Record<string, Booking[]> = {};

    [...filtered]
      .filter(b => new Date(b.start_time) >= today)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .forEach(booking => {
        const dateStr = booking.start_time.slice(0, 10);
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateLabel = new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', weekday: 'long' });
        if (!groups[dateLabel]) groups[dateLabel] = [];
        groups[dateLabel].push(booking);
      });
    return groups;
  }, [bookings, selectedRoomId]);

  const handleCreate = async () => {
    if (!form.room_id || !form.title) { 
      setToast({ msg: "Lütfen alanları doldurun.", type: 'error' });
      return; 
    }
    const startTime = `${form.start_date} ${SLOTS[form.start_slot as keyof typeof SLOTS].start}`;
    const endTime = `${form.end_date} ${SLOTS[form.end_slot as keyof typeof SLOTS].end}`;
    try {
      await createBooking({ ...form, room_id: Number(form.room_id), start_time: startTime, end_time: endTime, color: '#4f46e5' });
      setShowForm(false);
      setForm({ ...form, title: '' });
      const updated = await getBookings();
      setBookings(updated.data);
      setToast({ msg: "Kayıt başarıyla oluşturuldu.", type: 'success' });
    } catch (err: any) { 
      setToast({ msg: err.response?.data?.message || "Hata oluştu.", type: 'error' });
    }
  };

  const handleUpdate = async () => {
    if (!editingBooking) return;
    const startTime = `${editForm.start_date} ${SLOTS[editForm.start_slot as keyof typeof SLOTS].start}`;
    const endTime = `${editForm.end_date} ${SLOTS[editForm.end_slot as keyof typeof SLOTS].end}`;
    try {
      const res = await updateBooking(editingBooking.id, {
        ...editForm,
        room_id: Number(editForm.room_id) || editingBooking.room?.id || editingBooking.room_id,
        title: editForm.title,
        start_time: startTime,
        end_time: endTime,
      });
      setBookings(bookings.map(b => b.id === editingBooking.id ? res.data : b));
      setEditingBooking(null);
      setToast({ msg: "Güncelleme başarılı.", type: 'success' });
    } catch (err: any) {
      setToast({ msg: err.response?.data?.message || "Güncellenemedi.", type: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Emin misiniz?')) return;
    try {
      await deleteBooking(id);
      setBookings(bookings.filter(b => b.id !== id));
      setToast({ msg: "Kayıt silindi.", type: 'success' });
    } catch (err) { 
      setToast({ msg: "Silme hatası.", type: 'error' });
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-brand-secondary animate-pulse text-2xl tracking-widest italic uppercase">Preparing...</div>;

  return (
    <div className="min-h-screen bg-brand-surface px-4 pt-2 pb-12 font-brand">
      
      {/* TOASTER UI */}
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

      <div className="max-w-7xl mx-auto mb-6 border-b-2 border-brand-surface pb-1 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-brand-secondary uppercase italic">Ops <span className="text-brand-primary">Planning</span></h1>
          <p className="text-brand-muted text-[9px] font-black uppercase tracking-[0.2em]">Resource Control</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className={`px-6 py-2 rounded-ini font-black text-[10px] tracking-widest uppercase transition-all shadow-sm ${showForm ? 'bg-brand-muted text-white' : 'bg-brand-secondary text-white hover:bg-brand-primary'}`}>
          {showForm ? 'Cancel' : '+ New Entry'}
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-4 mb-8">
        <div className="ini-card p-3 flex items-center gap-4">
          <span className="text-xs">🏢</span>
          <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} className="flex-1 bg-transparent font-black text-brand-secondary outline-none text-xs uppercase cursor-pointer">
            <option value="all">View All Resources</option>
            {rooms.map(room => <option key={room.id} value={room.id.toString()}>{room.name.toUpperCase()}</option>)}
          </select>
        </div>

        {showForm && (
          <div className="ini-card p-6 border-t-4 border-brand-primary animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} className="w-full bg-brand-surface rounded-ini px-4 py-2.5 font-black text-xs outline-none">
                <option value="">Select Resource...</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-brand-surface rounded-ini px-4 py-2.5 font-black text-xs outline-none uppercase" placeholder="NAME..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-brand-surface/50 p-4 rounded-ini flex gap-2">
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="flex-[2] rounded-ini px-2 py-1.5 font-black text-[10px]" />
                <select value={form.start_slot} onChange={(e) => setForm({ ...form, start_slot: e.target.value })} className="flex-1 rounded-ini px-2 py-1.5 font-black text-[10px]">
                  <option value="morning">08:30</option>
                  <option value="afternoon">12:30</option>
                </select>
              </div>
              <div className="bg-brand-surface/50 p-4 rounded-ini flex gap-2">
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="flex-[2] rounded-ini px-2 py-1.5 font-black text-[10px]" />
                <select value={form.end_slot} onChange={(e) => setForm({ ...form, end_slot: e.target.value })} className="flex-1 rounded-ini px-2 py-1.5 font-black text-[10px]">
                  <option value="morning">12:30</option>
                  <option value="afternoon">17:30</option>
                </select>
              </div>
            </div>
            <button onClick={handleCreate} className="w-full mt-4 bg-brand-secondary text-white py-3 rounded-ini font-black text-[11px] tracking-widest hover:bg-brand-primary">COMMIT TO SCHEDULE</button>
          </div>
        )}
      </div>

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
              <button onClick={() => setExpandedDays(p => ({ ...p, [date]: !p[date] }))} className="w-full flex items-center justify-between p-4 hover:bg-brand-surface/50 transition-all">
                <span className="text-sm font-black text-brand-secondary uppercase italic leading-none">{date}</span>
                <div className={`w-8 h-8 rounded-ini flex items-center justify-center border-2 transition-all ${isDayExpanded ? 'rotate-180 bg-brand-secondary text-white' : 'text-brand-muted'}`}>▼</div>
              </button>

              <div className={`${isDayExpanded ? 'block' : 'hidden'} p-4 pt-0 space-y-3 border-t border-brand-surface`}>
                {Object.entries(bookingsByRoom).sort(([a], [b]) => a.localeCompare(b, 'tr', { numeric: true })).map(([roomName, roomBookings]) => {
                  const roomKey = `${date}-${roomName}`;
                  const config = roomConfigs[roomName.toUpperCase()] || { label: roomName, color: 'border-brand-muted' };

                  return (
                    <div key={roomName} className={`border-l-4 ${config.color} bg-brand-surface/20 rounded-ini overflow-hidden mt-3`}>
                      <button onClick={() => setExpandedRooms(p => ({ ...p, [roomKey]: !p[roomKey] }))} className="w-full flex items-center justify-between p-3 hover:bg-brand-surface/50">
                        <span className="text-[10px] font-black text-brand-secondary uppercase tracking-widest">{config.label}</span>
                        <span className="text-[9px] font-black text-brand-muted uppercase">{roomBookings.length} PLANNED</span>
                      </button>

                      <div className={`${expandedRooms[roomKey] ? 'grid' : 'hidden'} px-3 pb-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2`}>
                        {roomBookings.map((b) => (
                          <div key={b.id} className="bg-white p-3 rounded-ini border border-brand-surface flex justify-between items-start group hover:border-brand-primary transition-all shadow-sm">
                            <div className="min-w-0">
                              <h4 className="font-black text-brand-secondary text-[11px] uppercase truncate">{b.title}</h4>
                              <span className="text-[9px] font-bold text-brand-muted italic">
                                {new Date(b.start_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingBooking(b); setEditForm({ title: b.title,room_id: String(b.room?.id || b.room_id || ''), start_date: b.start_time.slice(0, 10), end_date: b.end_time.slice(0, 10), start_slot: b.start_time.includes('08:30') ? 'morning' : 'afternoon', end_slot: b.end_time.includes('12:30') ? 'morning' : 'afternoon' }); }} className="p-1 text-[10px] hover:scale-110">✏️</button>
                              <button onClick={() => handleDelete(b.id)} className="p-1 text-[10px] hover:scale-110">🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* UPDATE MODAL */}
      {editingBooking && (
        <div className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="ini-card p-8 w-full max-w-xl animate-in zoom-in-95">
            <h2 className="text-xl font-black mb-6 text-brand-secondary uppercase italic border-b-2 border-brand-surface pb-2">Modify Schedule</h2>
            <div className="space-y-4">
              <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full bg-brand-surface rounded-ini px-4 py-2.5 font-black text-xs outline-none uppercase" />
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-surface/50 p-4 rounded-ini space-y-2">
                  <span className="text-[8px] font-black text-brand-primary block text-center uppercase tracking-[0.2em]">Arrival</span>
                  <input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} className="w-full rounded-ini px-2 py-1.5 font-black text-[10px]" />
                  <select value={editForm.start_slot} onChange={(e) => setEditForm({ ...editForm, start_slot: e.target.value })} className="w-full rounded-ini px-2 py-1.5 font-black text-[10px]">
                    <option value="morning">08:30</option>
                    <option value="afternoon">12:30</option>
                  </select>
                </div>
                <div className="bg-brand-surface/50 p-4 rounded-ini space-y-2">
                  <span className="text-[8px] font-black text-brand-danger block text-center uppercase tracking-[0.2em]">Departure</span>
                  <input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} className="w-full rounded-ini px-2 py-1.5 font-black text-[10px]" />
                  <select value={editForm.end_slot} onChange={(e) => setEditForm({ ...editForm, end_slot: e.target.value })} className="w-full rounded-ini px-2 py-1.5 font-black text-[10px]">
                    <option value="morning">12:30</option>
                    <option value="afternoon">17:30</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleUpdate} className="flex-[2] bg-brand-secondary text-white py-3 rounded-ini font-black text-[11px] tracking-widest hover:bg-brand-primary shadow-md uppercase">Apply Updates</button>
              <button onClick={() => setEditingBooking(null)} className="flex-1 bg-brand-surface text-brand-muted py-3 rounded-ini font-black text-[11px] tracking-widest uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}