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
  // ✅ 2 gün sonrasını default olarak ayarla
  const getDefaultDate = () => {
    const date = new Date();
    date.setDate(date.getDate() );
    return date.toISOString().split('T')[0]; // YYYY-MM-DD formatı
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
      console.error('Error fetching ranges:', error);
      setRanges([]);
      setToast({ message: 'Failed to fetch available rooms', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanges();
  }, []);

  // ESC tuşu ile modal'ı kapat
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isModalOpen]);

  const handleBookingSubmit = async () => {
    if (!bookingPayload || !bookingPayload.title) return;
    setSubmitting(true);

    const color = getRoomColor(bookingPayload.roomName);

    try {
      const payload = {
        room_id: Number(bookingPayload.roomId),
        title: bookingPayload.title.toUpperCase(),
        color: color,
        start_time: `${bookingPayload.start} 08:30:00`,
        end_time: `${bookingPayload.end} 17:30:00`,
      };

      await createBooking(payload);

      setIsModalOpen(false);
      setToast({ message: 'Booking created successfully! ✓', type: 'success' });
      setTimeout(() => setToast(null), 3000);
      fetchRanges();
    } catch (error: any) {
      const serverMessage = error.response?.data?.message || "Validation error.";
      console.error("Error details:", error.response?.data);
      setToast({ message: `Error: ${serverMessage}`, type: 'error' });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  function getRoomColor(roomName: string): string {
    const prefix = roomName?.[0]?.toUpperCase();
    if (prefix === 'F') return '#3B82F6';
    if (prefix === 'M') return '#10B981';
    if (prefix === 'S') return '#F97316';
    return '#6B7280';
  }

  const displayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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

  const FLOORS: Record<string, { label: string; color: string; bg: string; border: string }> = {
    F: { label: 'First Floor', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-500' },
    M: { label: 'Mezzanine Floor', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-500' },
    S: { label: 'Second Floor', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-500' },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-8 right-8 z-[1100] animate-in slide-in-from-top-4 duration-300 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white px-6 py-4 rounded-2xl shadow-2xl font-bold`}>
          {toast.message}
        </div>
      )}

      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
              📅
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Find Available Space</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Multi-day room availability search</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-4 border-0 rounded-xl bg-slate-50 font-bold focus:ring-2 ring-blue-500 outline-none transition-all hover:bg-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider">Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full p-4 border-0 rounded-xl bg-slate-50 font-bold focus:ring-2 ring-blue-500 outline-none transition-all hover:bg-slate-100"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchRanges}
                disabled={loading}
                className="w-full px-8 py-4 bg-slate-900 text-white rounded-xl font-black uppercase hover:bg-blue-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RESULTS */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-slate-600 font-black uppercase tracking-wider text-sm">Scanning Resources...</p>
          </div>
        ) : Object.keys(groupedRanges).length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="text-6xl mb-6">🔍</div>
            <p className="text-slate-300 font-black uppercase tracking-widest text-sm mb-2">No Available Rooms</p>
            <p className="text-slate-400 text-xs">Try different dates or fewer days</p>
          </div>
        ) : (
          Object.keys(FLOORS).map((prefix) => {
            const floorRanges = groupedRanges[prefix] || [];
            if (floorRanges.length === 0) return null;
            const floor = FLOORS[prefix];
            return (
              <div key={prefix} className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`h-3 w-3 rounded-full ${floor.color.replace('text-', 'bg-')}`}></div>
                  <h2 className={`text-sm font-black ${floor.color} uppercase tracking-wider`}>{floor.label}</h2>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {floorRanges.map((item) => (
                    <div
                      key={item.room.id}
                      onClick={() => {
                        const range = item.ranges[0];
                        setBookingPayload({
                          roomId: item.room.id,
                          roomName: item.room.name,
                          start: range.start,
                          end: range.end,
                          title: ''
                        });
                        setIsModalOpen(true);
                      }}
                      className={`${floor.bg} border-2 border-transparent hover:border-blue-400 rounded-[2rem] p-6 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer group`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className={`font-black text-2xl ${floor.color} uppercase tracking-tight`}>
                            {item.room.name}
                          </h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                            Capacity: {item.room.capacity} 👤
                          </p>
                        </div>
                        <div className="bg-white/90 px-3 py-1.5 rounded-xl text-xs font-black shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          BOOK →
                        </div>
                      </div>
                      {item.ranges.map((range, idx) => (
                        <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 text-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">From</span>
                              <span className="text-sm font-black text-slate-700">{displayDate(range.start)}</span>
                            </div>
                            <div className="px-3 text-slate-300 font-black">→</div>
                            <div className="flex-1 text-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Until</span>
                              <span className="text-sm font-black text-slate-700">{displayDate(range.end)}</span>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-200 flex justify-center">
                            <span className="text-[10px] font-black bg-emerald-500 text-white px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                              {range.days} Consecutive Days
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

      {/* BOOKING MODAL */}
      {isModalOpen && bookingPayload && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 text-2xl font-bold transition-colors"
              >
                ×
              </button>

              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner border-2 border-blue-200">
                  ⚡
                </div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Quick Booking</h2>
                <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm font-black text-slate-700 uppercase tracking-wide">{bookingPayload.roomName}</p>
                  <p className="text-xs text-blue-600 font-bold mt-2">
                    {displayDate(bookingPayload.start)} → {displayDate(bookingPayload.end)}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 ml-3 mb-2 tracking-wider">
                    Title / Purpose
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={bookingPayload.title}
                    onChange={(e) => setBookingPayload({ ...bookingPayload, title: e.target.value })}
                    placeholder="E.G. BOARD MEETING"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-lg outline-none focus:ring-4 ring-blue-500/20 focus:border-blue-500 uppercase transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    disabled={submitting || !bookingPayload.title}
                    onClick={handleBookingSubmit}
                    className="flex-[2] bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white py-5 rounded-2xl font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating...' : 'Confirm Booking'}
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black uppercase hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}