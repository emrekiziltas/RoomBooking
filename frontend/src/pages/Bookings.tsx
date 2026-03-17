import { useEffect, useState, useMemo } from 'react';
import { getBookings, deleteBooking, updateBooking } from '../api/bookings';
import { getRooms, getFloors } from '../api/rooms';
import type { Booking, Room } from '../types/index';
import { PageHeader } from '../components/PageHeader';
import { NewBookingForm } from '../components/NewBookingForm'; 
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { EditBookingModal } from '../components/EditBookingModal';

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
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});
const [deleteConfirmBooking, setDeleteConfirmBooking] = useState<Booking | null>(null);

  const [editForm, setEditForm] = useState({
    room_id: '',
    title: '',
    start_date: '',
    start_slot: 'morning',
    end_date: '',
    end_slot: 'afternoon',
  });

  // Veri çekme fonksiyonu (Sayfa yüklendiğinde ve yeni kayıt eklendiğinde çağrılır)
  const fetchData = async () => {
    try {
      const [bRes, rRes, fRes] = await Promise.all([
        getBookings(),
        getRooms(),
        getFloors()
      ]);
      const apiBookings = bRes.data || [];
      const apiRooms = rRes.data || [];
      const apiFloors = fRes.data ?? [];
      const finalRoomConfig: Record<string, any> = {};

      apiRooms.forEach((room: any) => {
        const prefix = room.key?.toUpperCase() || room.name[0].toUpperCase();
        const floor = apiFloors.find((f: any) => f.key.toUpperCase() === prefix);
        const rawClass = floor?.bg_color_class || '';
        const finalBorderClass = rawClass ? rawClass.replace('text-', 'border-') : 'border-brand-muted';
        const roomNameUpper = room.name.toUpperCase();
        const config = { label: roomNameUpper, color: finalBorderClass };
        finalRoomConfig[room.id] = config;
        finalRoomConfig[roomNameUpper] = config;
      });

      setBookings(apiBookings);
      setRooms(apiRooms);
      setRoomConfigs(finalRoomConfig);
    } catch (err) {
      setToast({ msg: "DATA LOAD FAILED!", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Gruplama Mantığı
  const groupedBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = selectedRoomId === 'all'
      ? bookings
      : bookings.filter(b => String(b.room_id || b.room?.id) === selectedRoomId);

    const groups: Record<string, Booking[]> = {};
    filtered.forEach(booking => {
      let current = new Date(booking.start_time);
      const end = new Date(booking.end_time);
      current.setHours(0, 0, 0, 0);
      const endLimit = new Date(end);
      endLimit.setHours(0, 0, 0, 0);

      while (current <= endLimit) {
        if (current >= today) {
          const dateId = current.toISOString().split('T')[0];
          if (!groups[dateId]) groups[dateId] = [];
          if (!groups[dateId].find(b => b.id === booking.id)) {
            groups[dateId].push(booking);
          }
        }
        current.setDate(current.getDate() + 1);
      }
    });

    const sortedGroups: Record<string, Booking[]> = {};
    Object.keys(groups).sort().forEach(key => {
      const [y, m, d] = key.split('-').map(Number);
      const label = new Date(y, m - 1, d).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric', weekday: 'long'
      });
      sortedGroups[label] = groups[key];
    });
    return sortedGroups;
  }, [bookings, selectedRoomId]);

// Eski handleUpdate'i bununla değiştir
const handleUpdate = async (id: number, updatedData: any) => {
  try {
    // Artık editForm'dan değil, parametre olarak gelen updatedData'dan alıyoruz
    const res = await updateBooking(id, updatedData);
    
    setBookings(bookings.map(b => b.id === id ? res.data : b));
    setEditingBooking(null);
    setToast({ msg: "UPDATE SUCCESSFUL ✓", type: 'success' });
  } catch (err: any) {
    setToast({ msg: err.response?.data?.message || "UPDATE FAILED", type: 'error' });
  }
};

const handleDelete = async (id: number) => {
  try {
    await deleteBooking(id);
    setBookings(bookings.filter(b => b.id !== id));
    setToast({ msg: "ENTRY REMOVED ✓", type: 'success' });
    setDeleteConfirmBooking(null); // State'i burada sıfırlıyoruz
  } catch (err) {
    setToast({ msg: "DELETE FAILED", type: 'error' });
  }
};

  return (
    <div className="min-h-screen bg-brand-surface font-brand">
      {/* 1. TOASTER UI */}
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-top-10 duration-500">
          <div className={`flex items-center gap-4 px-8 py-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 ${toast.type === 'error' ? 'bg-white border-brand-danger' : 'bg-white border-brand-primary'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${toast.type === 'error' ? 'bg-brand-danger text-white' : 'bg-brand-primary text-white'}`}>
              {toast.type === 'error' ? '!' : '✓'}
            </div>
            <p className="font-black text-brand-secondary text-sm uppercase tracking-tight italic whitespace-nowrap">{toast.msg}</p>
            <div className="w-[2px] h-4 bg-brand-surface mx-2" />
            <button onClick={() => setToast(null)} className="text-brand-muted hover:text-brand-secondary font-black text-sm px-2">CLOSE</button>
          </div>
        </div>
      )}

      {/* 2. HEADER */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <PageHeader
          highlight="DAILY"
          title="BOOKINGS"
          action={
            <button
              onClick={() => setShowForm(!showForm)}
              className={`px-6 py-2 rounded-ini font-black text-[10px] tracking-widest uppercase transition-all shadow-sm active:scale-95 ${
                showForm 
                  ? 'bg-brand-muted text-white' 
                  : 'bg-brand-secondary text-white hover:bg-brand-primary'
              }`}
            >
              {showForm ? 'Cancel' : '+ New Entry'}
            </button>
          }
        />
      </div>

      {/* 3. NEW ENTRY FORM (COMPONENT OLARAK ÇAĞRILIYOR) */}
      <div className="max-w-7xl mx-auto px-4 space-y-4 mb-8 mt-6">
        {showForm && (
          <NewBookingForm 
            rooms={rooms}
            onSuccess={() => {
              setShowForm(false);
              fetchData();
            }}
            onCancel={() => setShowForm(false)}
            showToast={(msg, type) => setToast({ msg, type })}
          />
        )}

        {/* Filtreleme */}
        <div className="ini-card p-3 flex items-center gap-4">
          <span className="text-xs">🏢</span>
          <select 
            value={selectedRoomId} 
            onChange={(e) => setSelectedRoomId(e.target.value)} 
            className="flex-1 bg-transparent font-black text-brand-secondary outline-none text-xs uppercase cursor-pointer"
          >
            <option value="all">View All Resources</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id.toString()}>
                {room.name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. LISTING SECTION */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="h-[40vh] flex flex-col items-center justify-center gap-4 text-brand-secondary/30">
            <div className="w-8 h-8 border-4 border-brand-surface border-t-brand-secondary rounded-full animate-spin" />
            <span className="font-black uppercase text-[9px] tracking-[0.4em] animate-pulse">Scanning Logs...</span>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in duration-500">
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
                    <div className={`w-8 h-8 rounded-ini flex items-center justify-center border-2 transition-all ${isDayExpanded ? 'rotate-180 bg-brand-secondary text-white border-transparent' : 'text-brand-muted'}`}>▼</div>
                  </button>

                  <div className={`${isDayExpanded ? 'block' : 'hidden'} p-4 pt-0 space-y-3 border-t border-brand-surface`}>
                    {Object.entries(bookingsByRoom).sort(([a], [b]) => a.localeCompare(b, 'tr', { numeric: true })).map(([roomName, roomBookings]) => {
                      const roomKey = `${date}-${roomName}`;
                      const firstBooking = roomBookings[0];
                      const roomId = firstBooking?.room?.id || firstBooking?.room_id;
                      const config = roomConfigs[roomId] || roomConfigs[roomName.toUpperCase()] || { label: roomName, color: 'border-brand-muted' };

                      return (
                        <div key={roomName} className={`border-l-4 ${config.color} bg-brand-surface/20 rounded-ini overflow-hidden mt-3`}>
                          <button onClick={() => setExpandedRooms(p => ({ ...p, [roomKey]: !p[roomKey] }))} className="w-full flex items-center justify-between p-3 hover:bg-brand-surface/50">
                            <span className="text-[10px] font-black text-brand-secondary uppercase tracking-widest">{config.label}</span>
                            <span className="text-[9px] font-black text-brand-muted uppercase">{roomBookings.length} PLANNED</span>
                          </button>

                          <div className={`${expandedRooms[roomKey] ? 'grid' : 'hidden'} px-3 pb-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 animate-in slide-in-from-top-2`}>
                            {roomBookings.map((b) => (
                              <div key={b.id} className="bg-white p-3 rounded-ini border border-brand-surface flex justify-between items-start group hover:border-brand-primary transition-all shadow-sm">
                                <div className="min-w-0">
                                  <h4 className="font-black text-brand-secondary text-[11px] uppercase truncate">{b.title}</h4>
                                  <span className="text-[9px] font-bold text-brand-muted italic">
                                    {new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { 
                                    setEditingBooking(b); 
                                    setEditForm({ 
                                      title: b.title, 
                                      room_id: String(b.room?.id || b.room_id || ''), 
                                      start_date: b.start_time.slice(0, 10), 
                                      end_date: b.end_time.slice(0, 10), 
                                      start_slot: b.start_time.includes('08:30') ? 'morning' : 'afternoon', 
                                      end_slot: b.end_time.includes('12:30') ? 'morning' : 'afternoon' 
                                    }); 
                                  }} className="p-1 text-[10px] hover:scale-110">✏️</button>


<button 
  onClick={() => setDeleteConfirmBooking(b)} 
  className="p-1 text-[10px] hover:scale-110 relative z-10"
>
  🗑️
</button>

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
        )}
      </div>


<EditBookingModal 
  isOpen={!!editingBooking}
  booking={editingBooking}
  rooms={rooms} 
  onClose={() => setEditingBooking(null)}
  onSave={handleUpdate}
  showSlots={true} 
/>

<ConfirmDeleteModal 
  isOpen={!!deleteConfirmBooking}
  data={deleteConfirmBooking}
  onConfirm={handleDelete}
  onCancel={() => setDeleteConfirmBooking(null)}
/>

    </div>
  );
}
export default Bookings;