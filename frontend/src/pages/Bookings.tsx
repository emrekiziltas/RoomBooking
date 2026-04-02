import { useEffect, useState, useMemo } from 'react';
import { getBookings, deleteBooking, updateBooking } from '../api/bookings';
import { getRooms, getFloors } from '../api/rooms';
import type { Booking, Room } from '../types/index';
import { PageHeader } from '../components/PageHeader';
import { NewBookingForm } from '../components/NewBookingForm'; 
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { EditBookingModal } from '../components/EditBookingModal';

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
const [meta, setMeta] = useState<{ guest_roles: any[] }>({ guest_roles: [] });

const fetchData = async () => {
  try {
    setLoading(true);
    const [bRes, rRes, fRes] = await Promise.all([
      getBookings(),
      getRooms(),
      getFloors()
    ]);

    // 1. Verileri Ayıkla
    const apiBookings = bRes?.data || bRes || [];
    const apiRooms = rRes?.data || rRes || [];
    const apiFloors = fRes?.data || fRes || [];
    
    // 2. META VERİSİNİ SET ET (Hata buradaydı, bRes kullanmalıydık)
    if (bRes?.meta?.guest_roles) {
      setMeta({ guest_roles: bRes.meta.guest_roles });
    }

    // 3. Oda konfigürasyonlarını hazırla
    const finalRoomConfig: Record<string, any> = {};
    apiRooms.forEach((room: any) => {
      const prefix = room.key?.toUpperCase() || (room.name ? room.name[0].toUpperCase() : 'R');
      const floor = apiFloors.find((f: any) => f.key?.toUpperCase() === prefix);
      const rawClass = floor?.bg_color_class || '';
      const finalBorderClass = rawClass ? rawClass.replace('text-', 'border-') : 'border-slate-400';
      
      finalRoomConfig[room.id] = { 
        label: room.name?.toUpperCase(), 
        color: finalBorderClass 
      };
    });

    setBookings(apiBookings);
    setRooms(apiRooms);
    setRoomConfigs(finalRoomConfig);
  } catch (err) {
    console.error("Fetch Error:", err);
    setToast({ msg: "DATA LOAD FAILED!", type: 'error' });
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

const groupedBookings = useMemo(() => {
  if (!bookings || bookings.length === 0) return {};

  // Bugünün başlangıcını al (00:00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Oda Filtrelemesi
  const filteredByRoom = selectedRoomId === 'all'
    ? bookings
    : bookings.filter(b => String(b.room_id || b.room?.id) === selectedRoomId);

  const groups: Record<string, Booking[]> = {};
  
  filteredByRoom.forEach(booking => {
    const startRaw = booking.start_time || (booking as any).check_in;
    const endRaw = booking.end_time || (booking as any).check_out;

    if (!startRaw) return;

    const start = new Date(startRaw);
    const end = new Date(endRaw || startRaw);
    
    if (isNaN(start.getTime())) return;

    let current = new Date(start);
    current.setHours(0, 0, 0, 0);
    
    const endLimit = new Date(end);
    endLimit.setHours(0, 0, 0, 0);

    // Günleri gezerken SADECE bugün veya sonrası ise gruba ekle
    while (current <= endLimit) {
      if (current >= today) {
        
        // 🚀 ÇÖZÜM BURASI: toISOString() yerine yerel tarihi çekiyoruz
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateId = `${year}-${month}-${day}`;
        
        if (!groups[dateId]) groups[dateId] = [];
        
        if (!groups[dateId].find(b => b.id === booking.id)) {
          groups[dateId].push(booking);
        }
      }
      current.setDate(current.getDate() + 1);
    }
  });

  // 2. Tarihe göre sıralama
  const sortedGroups: Record<string, Booking[]> = {};
  Object.keys(groups).sort().forEach(key => {
    const d = new Date(key);
    const label = d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric', weekday: 'long'
    });
    sortedGroups[label] = groups[key];
  });

  return sortedGroups;
}, [bookings, selectedRoomId]);

  const handleUpdate = async (id: number, updatedData: any) => {
    try {
      const res = await updateBooking(id, updatedData);
      if (res) {
        setEditingBooking(null);
        await fetchData(); 
        setToast({ msg: "UPDATE SUCCESSFUL ✓", type: 'success' });
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || "UPDATE FAILED";
      setToast({ msg: serverMsg.toUpperCase(), type: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
      setDeleteConfirmBooking(null);
      setToast({ msg: "ENTRY REMOVED ✓", type: 'success' });
    } catch (err) {
      setToast({ msg: "DELETE FAILED", type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface font-brand">
      {/* TOAST */}
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-top-10 duration-500 max-w-[90vw]">
          <div className={`flex items-center gap-4 px-8 py-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 bg-white ${toast.type === 'error' ? 'border-brand-danger' : 'border-brand-primary'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${toast.type === 'error' ? 'bg-brand-danger text-white' : 'bg-brand-primary text-white'}`}>
              {toast.type === 'error' ? '!' : '✓'}
            </div>
            <p className="font-black text-brand-secondary text-sm uppercase italic leading-tight">{toast.msg}</p>
            <button onClick={() => setToast(null)} className="ml-4 text-brand-muted hover:text-brand-secondary font-black text-[10px]">CLOSE</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="max-w-full mx-auto px-8 pt-4">
        <PageHeader
          highlight="DAILY"
          title="Bookings"
          action={
            <button
              onClick={() => setShowForm(!showForm)}
              className={`px-6 py-2 rounded-ini font-black text-[10px] tracking-widest uppercase transition-all shadow-sm active:scale-95 ${
                showForm ? 'bg-red-500 text-white' : 'bg-brand-secondary text-white hover:bg-brand-primary'
              }`}
            >
              {showForm ? '✕ Close' : '+ New Entry'}
            </button>
          }
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 space-y-4 mb-8 mt-6">
        {showForm && (
  <div className="animate-in zoom-in-95 duration-200">
    <NewBookingForm 
      rooms={rooms}
      guestRoles={meta.guest_roles} // <-- BURAYI EKLEDİK
      onSuccess={() => { setShowForm(false); fetchData(); }}
      onCancel={() => setShowForm(false)}
      showToast={(msg, type) => setToast({ msg, type: type as any })}
    />
  </div>
)}
        <div className="ini-card p-3 flex items-center gap-4 border-2 border-slate-800 shadow-[4px_4px_0px_#000] bg-white">
          <span className="text-xs">🏢</span>
          <select 
            value={selectedRoomId} 
            onChange={(e) => setSelectedRoomId(e.target.value)} 
            className="flex-1 bg-transparent font-black text-brand-secondary outline-none text-xs uppercase cursor-pointer"
          >
            <option value="all">View All Resources</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id.toString()}>{room.name.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LIST */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="h-[40vh] flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            <span className="font-black uppercase text-[9px] tracking-widest animate-pulse text-slate-400">Loading Records...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedBookings).length === 0 ? (
                <div className="p-20 text-center font-black text-slate-300 uppercase italic tracking-widest">No Records Found</div>
            ) : Object.entries(groupedBookings).map(([date, dayBookings]) => {
              const isDayExpanded = !!expandedDays[date];
              const bookingsByRoom = dayBookings.reduce((acc, b) => {
                const r = b.room?.name || 'UNKNOWN';
                if (!acc[r]) acc[r] = [];
                acc[r].push(b);
                return acc;
              }, {} as Record<string, Booking[]>);

              return (
                <div key={date} className="border-2 border-slate-800 shadow-[4px_4px_0px_#000] bg-white mb-4 overflow-hidden rounded">
                  <button onClick={() => setExpandedDays(p => ({ ...p, [date]: !p[date] }))} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all">
                    <span className="text-sm font-black text-brand-secondary uppercase italic">{date}</span>
                    <div className={`w-6 h-6 rounded flex items-center justify-center border-2 border-slate-800 transition-all ${isDayExpanded ? 'rotate-180 bg-slate-800 text-white' : ''}`}>▼</div>
                  </button>

                  <div className={`${isDayExpanded ? 'block' : 'hidden'} p-4 pt-0 space-y-3 border-t-2 border-slate-100`}>
                    {Object.entries(bookingsByRoom).sort().map(([roomName, roomBookings]) => {
                      const roomKey = `${date}-${roomName}`;
                      const roomId = roomBookings[0]?.room?.id || roomBookings[0]?.room_id;
                      const config = roomConfigs[roomId] || { label: roomName, color: 'border-slate-300' };

                      return (
                        <div key={roomName} className={`border-l-4 ${config.color} bg-slate-50 rounded overflow-hidden mt-3`}>
                          <button onClick={() => setExpandedRooms(p => ({ ...p, [roomKey]: !p[roomKey] }))} className="w-full flex items-center justify-between p-3 hover:bg-slate-100">
                            <span className="text-[10px] font-black uppercase tracking-widest">{config.label}</span>
                            <span className="text-[9px] font-black text-slate-400">{roomBookings.length} ENTRIES</span>
                          </button>

                          <div className={`${expandedRooms[roomKey] ? 'grid' : 'hidden'} px-3 pb-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2`}>
                            {roomBookings.map((b) => (
                              <div key={b.id} className="bg-white p-3 rounded border-2 border-slate-200 flex justify-between items-start group hover:border-slate-800 transition-all">
                         <div className="min-w-0 flex-1">
  <h4 className="font-black text-brand-secondary text-[11px] uppercase truncate italic leading-tight">
    {b.title}
  </h4>
  {/* Misafir İsmi Satırı */}
<div className="text-[10px] font-bold text-blue-600 uppercase tracking-tight mb-1 flex items-center gap-1">
  👤 {b.snapshot_guest_name || (b as any).guest_name || 'GUEST NAME N/A'}
  
  {/* VIP YILDIZI BURADA */}
  {b.snapshot_is_vip && (
    <span 
      className="inline-flex items-center justify-center w-4 h-4 bg-yellow-400 text-white rounded-full text-[8px] shadow-sm animate-pulse" 
      title="VIP GUEST"
    >
      ⭐
    </span>
  )}
</div>
  <div className="flex items-center gap-2">
    <span className="text-[9px] font-bold text-slate-400 italic">
      {new Date(b.start_time || (b as any).check_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
    </span>
  </div>
</div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setEditingBooking(b)} className="hover:scale-125 transition-transform">✏️</button>
                                  <button onClick={() => setDeleteConfirmBooking(b)} className="hover:scale-125 transition-transform">🗑️</button>
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
  onClose={() => setEditingBooking(null)}
  onSave={handleUpdate}
  onDelete={() => setDeleteConfirmBooking(editingBooking)}
  guestRoles={meta.guest_roles} // <-- YORUMU KALDIRDIK VE EKLEDİK
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