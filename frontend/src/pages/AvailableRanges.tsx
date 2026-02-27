import { useEffect, useState, useMemo } from 'react';
import { getAvailableRanges } from '../api/rooms';
import { createBooking } from '../api/bookings';

interface RoomRange {
  room: {
    id: number;
    name: string;
    capacity: number;
    features?: { blackboard?: boolean };
  };
  ranges: Array<{
    start: string;
    end: string;
    days: number;
  }>;
}

export function AvailableRanges() {
  const getDefaultDate = () => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  };

  const [ranges, setRanges] = useState<RoomRange[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(getDefaultDate());
  const [days, setDays] = useState(2);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingPayload, setBookingPayload] = useState<{
    roomId: number;
    roomName: string;
    start: string;
    end: string;
    title: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRanges = async () => {
    setLoading(true);
    try {
      const response = await getAvailableRanges(startDate, days);
      setRanges(response.data || []);
    } catch (error) {
      setToast({ message: 'Failed to fetch available rooms', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanges();
  }, []);

  const handleBookingSubmit = async () => {
    if (!bookingPayload || !bookingPayload.title) return;
    setSubmitting(true);

    const prefix = bookingPayload.roomName?.[0]?.toUpperCase();
    const colorMap: Record<string, string> = { 'F': 'var(--brand-primary)', 'M': 'var(--brand-success)', 'S': 'var(--brand-danger)' };
    const color = colorMap[prefix] || 'var(--brand-secondary)';

    try {
      await createBooking({
        room_id: Number(bookingPayload.roomId),
        title: bookingPayload.title.toUpperCase(),
        color: color,
        start_time: `${bookingPayload.start} 08:30:00`,
        end_time: `${bookingPayload.end} 17:30:00`,
      });

      setIsModalOpen(false);
      setToast({ message: 'Booking created successfully! ✓', type: 'success' });
      setTimeout(() => setToast(null), 3000);
      fetchRanges();
    } catch (error: any) {
      setToast({ message: `Error: ${error.response?.data?.message || "Validation error."}`, type: 'error' });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const groupedRanges = useMemo(() => {
    const filteredData = ranges
      .map((item) => ({
        ...item,
        ranges: item.ranges.filter((range) => range.start === startDate),
      }))
      .filter((item) => item.ranges.length > 0);

    return filteredData.reduce((acc, item) => {
      const prefix = item.room.name[0].toUpperCase();
      if (!acc[prefix]) acc[prefix] = [];
      acc[prefix].push(item);
      return acc;
    }, {} as Record<string, RoomRange[]>);
  }, [ranges, startDate]);

  const FLOORS: Record<string, { label: string; color: string; border: string }> = {
    F: { label: 'FIRST FLOOR', color: 'text-brand-primary', border: 'border-brand-primary' },
    M: { label: 'MEZZANINE', color: 'text-brand-success', border: 'border-brand-success' },
    S: { label: 'SECOND FLOOR', color: 'text-brand-danger', border: 'border-brand-danger' },
  };

  return (
    <div className="min-h-screen bg-brand-surface p-4 md:p-8 font-brand">
      {/* Toast - Standardized */}
      {toast && (
        <div className={`fixed top-8 right-8 z-[1100] px-6 py-4 rounded-ini shadow-2xl font-black text-[11px] uppercase tracking-widest animate-in slide-in-from-right-5 ${
          toast.type === 'success' ? 'bg-brand-success text-white' : 'bg-brand-danger text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* HEADER & FILTER */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="bg-white rounded-ini border-2 border-brand-surface p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-12 w-12 bg-brand-secondary rounded-ini flex items-center justify-center text-white text-xl">
              📅
            </div>
            <div>
              <h1 className="text-2xl font-black text-brand-secondary uppercase tracking-tighter italic leading-none">
                Range <span className="text-brand-primary">Search</span>
              </h1>
              <p className="text-brand-muted text-[9px] font-black uppercase tracking-[0.3em] mt-1">Multi-day sequence analysis</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-brand-muted ml-1 tracking-widest">Initial Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 bg-brand-surface border-0 rounded-ini font-black text-[11px] uppercase outline-none focus:ring-2 ring-brand-primary transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-brand-muted ml-1 tracking-widest">Cycle Duration</label>
              <input type="number" min="1" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full p-3 bg-brand-surface border-0 rounded-ini font-black text-[11px] uppercase outline-none focus:ring-2 ring-brand-primary" />
            </div>
            <div className="flex items-end">
              <button onClick={fetchRanges} disabled={loading} className="w-full py-3 bg-brand-secondary text-white rounded-ini font-black uppercase text-[11px] tracking-widest hover:bg-brand-primary transition-all active:scale-95 disabled:opacity-50">
                {loading ? 'ANALYZING...' : 'EXECUTE SEARCH'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RESULTS GRID */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="py-20 text-center font-black text-brand-muted text-[10px] tracking-[0.4em] animate-pulse uppercase">Scanning Infrastructure...</div>
        ) : Object.keys(groupedRanges).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-ini border-2 border-dashed border-brand-surface">
            <p className="text-brand-muted font-black text-[10px] uppercase tracking-widest text-sm">Zero matching resources found.</p>
          </div>
        ) : (
          Object.keys(FLOORS).map((prefix) => {
            const floorRanges = groupedRanges[prefix] || [];
            if (floorRanges.length === 0) return null;
            const floor = FLOORS[prefix];
            return (
              <div key={prefix} className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className={`text-[10px] font-black ${floor.color} uppercase tracking-[0.2em]`}>{floor.label}</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {floorRanges.map((item) => (
                    <div
                      key={item.room.id}
                      onClick={() => {
                        const range = item.ranges[0];
                        setBookingPayload({ roomId: item.room.id, roomName: item.room.name, start: range.start, end: range.end, title: '' });
                        setIsModalOpen(true);
                      }}
                      className="ini-card p-6 hover:border-brand-primary transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className={`font-black text-xl ${floor.color} uppercase tracking-tighter leading-none`}>{item.room.name}</h3>
                          <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest mt-1 italic">Cap: {item.room.capacity} units</p>
                        </div>
                        <div className="bg-brand-surface px-3 py-1 rounded-ini text-[9px] font-black text-brand-secondary uppercase border border-brand-surface group-hover:bg-brand-primary group-hover:text-white transition-colors">
                          SELECT
                        </div>
                      </div>

                      {item.ranges.map((range, idx) => (
                        <div key={idx} className="bg-brand-surface rounded-ini p-4 border border-brand-surface space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-center flex-1">
                              <span className="text-[8px] font-black text-brand-muted uppercase block">Start</span>
                              <span className="text-[11px] font-black text-brand-secondary">{new Date(range.start).toLocaleDateString('en-GB')}</span>
                            </div>
                            <div className="text-brand-muted font-black px-2">→</div>
                            <div className="text-center flex-1">
                              <span className="text-[8px] font-black text-brand-muted uppercase block">End</span>
                              <span className="text-[11px] font-black text-brand-secondary">{new Date(range.end).toLocaleDateString('en-GB')}</span>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-white/50 flex justify-center">
                            <span className="text-[9px] font-black bg-brand-success text-white px-3 py-1 rounded-ini uppercase tracking-widest shadow-sm">
                              {range.days} DAYS CONTINUOUS
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && bookingPayload && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
          <div className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-sm animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="ini-card max-w-md w-full p-10 relative z-10 animate-in zoom-in-95">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-brand-secondary uppercase tracking-tighter italic">Sequence Booking</h2>
              <div className="mt-6 p-4 bg-brand-surface rounded-ini border border-brand-surface">
                <p className="text-[10px] font-black text-brand-secondary uppercase tracking-widest">{bookingPayload.roomName}</p>
                <p className="text-[9px] text-brand-primary font-black mt-1 uppercase tracking-widest">
                  {new Date(bookingPayload.start).toLocaleDateString('en-GB')} » {new Date(bookingPayload.end).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase text-brand-primary ml-1 mb-2 block tracking-widest">Mission Title</label>
                <input
                  autoFocus
                  type="text"
                  value={bookingPayload.title}
                  onChange={(e) => setBookingPayload({ ...bookingPayload, title: e.target.value })}
                  placeholder="E.G. DEVELOPMENT CYCLE"
                  className="w-full bg-brand-surface border-0 rounded-ini px-5 py-4 font-black text-[11px] outline-none focus:ring-1 ring-brand-primary uppercase"
                />
              </div>

              <div className="flex gap-3">
                <button
                  disabled={submitting || !bookingPayload.title}
                  onClick={handleBookingSubmit}
                  className="flex-[2] bg-brand-secondary text-white py-4 rounded-ini font-black uppercase text-[10px] tracking-widest hover:bg-brand-primary transition-all disabled:opacity-30"
                >
                  {submitting ? 'EXECUTING...' : 'CONFIRM SEQUENCE'}
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-brand-surface text-brand-muted py-4 rounded-ini font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all"
                >
                  ABORT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}