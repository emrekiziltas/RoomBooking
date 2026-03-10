import { useEffect, useState, useMemo } from 'react';
import type { Room } from '../types/index';
import { getAvailableRooms, getFloors } from '../api/rooms';
import { createBooking } from '../api/bookings';

type FloorConfig = {
  label: string;
  color: string;
  border: string;
  bg: string;
};

export function Available() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingModal, setBookingModal] = useState<{ room: Room } | null>(null);
  const [bookingForm, setBookingForm] = useState({ title: '', start_time: '', end_time: '' });
  const [saving, setSaving] = useState(false);
  const [floorConfigs, setFloorConfigs] = useState<Record<string, FloorConfig>>({});

const buildFloorConfigs = (apiFloors: any[]): Record<string, FloorConfig> => {
  const configs: Record<string, FloorConfig> = {};
  apiFloors.forEach((f: any) => {
    const key = f.key.toUpperCase();
    configs[key] = {
      label: f.label.toUpperCase(),
      color: f.bg_color_class || 'text-brand-muted',
      border: f.border_color_class || 'border-brand-muted',
      bg: f.active_bg_class || 'bg-brand-surface',
    };
  });
  return configs;
};
  const fetchRooms = async (date: string) => {
    setLoading(true);
    try {
      const rRes = await getAvailableRooms(date);
      const roomsData = Array.isArray(rRes) ? rRes : (rRes.data || []);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [fRes, rRes] = await Promise.all([
          getFloors(),
          getAvailableRooms(selectedDate)
        ]);

        const apiFloors = fRes.data ?? [];
        setFloorConfigs(buildFloorConfigs(apiFloors));

        const roomsData = Array.isArray(rRes) ? rRes : (rRes.data || []);
        setRooms(roomsData);
      } catch (e) {
        console.error('Init failed', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    fetchRooms(selectedDate);
  }, [selectedDate]);

  const openBookingModal = (room: Room) => {
    setBookingModal({ room });
    setBookingForm({
      title: '',
      start_time: `${selectedDate}T09:00`,
      end_time: `${selectedDate}T17:00`
    });
  };

  const handleCreateBooking = async () => {
    if (!bookingModal || !bookingForm.title.trim()) return;
    setSaving(true);
    try {
      await createBooking({
        room_id: bookingModal.room.id,
        title: bookingForm.title,
        start_time: bookingForm.start_time,
        end_time: bookingForm.end_time,
        color: 'var(--color-brand-primary)'
      });
      setBookingModal(null);
      fetchRooms(selectedDate);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  };

  const groupedRooms = useMemo(() => {
    const groups: Record<string, Room[]> = {};
    const safeRooms = Array.isArray(rooms) ? rooms : [];
    safeRooms.forEach((room) => {
      const prefix = room.name?.[0]?.toUpperCase() || 'F';
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(room);
    });
    return groups;
  }, [rooms]);

  const fallbackFloor: FloorConfig = {
    label: 'FLOOR',
    color: 'text-brand-muted',
    border: 'border-brand-muted',
    bg: 'bg-brand-surface',
  };

  return (
    <div className="min-h-screen bg-brand-surface px-4 pt-2 pb-12 font-brand">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-end gap-4 border-b-2 border-brand-surface pb-2">
        <div>
          <h1 className="text-2xl font-black text-brand-secondary uppercase tracking-tighter italic leading-none">
            Room <span className="text-brand-primary">Availability</span>
          </h1>
          <p className="text-brand-muted font-black uppercase text-[9px] tracking-[0.3em] mt-0.5">Real-time resource tracking</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <input
            type="date"
            className="flex-1 md:w-48 p-2 bg-white border-2 border-brand-surface rounded-ini text-[11px] font-black uppercase outline-none focus:border-brand-primary transition-all"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-4 py-2 bg-brand-secondary text-white rounded-ini hover:bg-brand-primary transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            Today
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="py-20 text-center font-black text-brand-muted text-[10px] tracking-[0.4em] animate-pulse uppercase">
            Scanning Infrastructure...
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-ini border-2 border-dashed border-brand-surface">
            <p className="text-brand-muted font-black text-[10px] uppercase tracking-widest">
              No resources available for this sequence.
            </p>
          </div>
        ) : (
          Object.keys(groupedRooms).sort().map((prefix) => {
            const floorRooms = groupedRooms[prefix] || [];
            if (floorRooms.length === 0) return null;
            const floor = floorConfigs[prefix] || { ...fallbackFloor, label: `${prefix} FLOOR` };

            return (
              <div key={prefix} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className={`text-[10px] font-black ${floor.color} uppercase tracking-[0.2em]`}>
                    {floor.label}
                  </h2>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {floorRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => openBookingModal(room)}
                      className="ini-card p-4 hover:border-brand-primary transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <h3 className={`font-black text-lg ${floor.color} uppercase tracking-tighter leading-none mb-2 group-hover:translate-x-1 transition-transform`}>
                        {room.name}
                      </h3>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-brand-secondary uppercase">
                            {room.available_capacity} Desks Free
                          </span>
                        </div>

                        {room.booked_slots > 0 && (
                          <div className="inline-block bg-brand-surface px-2 py-0.5 rounded-ini border border-brand-surface">
                            <span className="text-[8px] font-black text-brand-danger uppercase">
                              {room.occupancy_rate}% Occupied
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-brand-surface flex justify-between items-center">
                        <span className="text-[8px] font-black text-brand-muted uppercase tracking-widest">Quick Book</span>
                        <span className="text-xs group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* BOOKING MODAL */}
      {bookingModal && (() => {
        const prefix = bookingModal.room.name?.[0]?.toUpperCase() || 'F';
        const floor = floorConfigs[prefix] || fallbackFloor;
        return (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setBookingModal(null)}
            />
            <div className="ini-card max-w-md w-full p-8 relative z-10 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${floor.bg}`} />
                  <div>
                    <h3 className="text-xl font-black text-brand-secondary uppercase tracking-tighter italic">
                      Book {bookingModal.room.name}
                    </h3>
                    <p className="text-[9px] font-black text-brand-muted uppercase tracking-[0.2em]">
                      Term: {new Date(selectedDate).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
                <button onClick={() => setBookingModal(null)} className="text-brand-muted hover:text-brand-danger transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[9px] font-black text-brand-primary uppercase mb-2 block tracking-widest">Mission Title</label>
                  <input
                    autoFocus
                    type="text"
                    value={bookingForm.title}
                    onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBooking()}
                    placeholder="E.G. SPRINT PLANNING"
                    className="w-full px-4 py-3 bg-brand-surface border-0 rounded-ini text-[11px] font-black outline-none focus:ring-1 ring-brand-primary uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-brand-primary uppercase mb-2 block tracking-widest">Start</label>
                    <input
                      type="datetime-local"
                      value={bookingForm.start_time}
                      onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface border-0 rounded-ini text-[10px] font-black outline-none focus:ring-1 ring-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-brand-primary uppercase mb-2 block tracking-widest">End</label>
                    <input
                      type="datetime-local"
                      value={bookingForm.end_time}
                      onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface border-0 rounded-ini text-[10px] font-black outline-none focus:ring-1 ring-brand-primary"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateBooking}
                disabled={saving || !bookingForm.title.trim()}
                className="w-full mt-8 py-4 bg-brand-secondary text-white rounded-ini font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-brand-primary transition-all disabled:opacity-50"
              >
                {saving ? 'EXECUTING...' : 'CONFIRM RESERVATION'}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}