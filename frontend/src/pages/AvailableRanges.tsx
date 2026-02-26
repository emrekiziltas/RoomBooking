import { useEffect, useState, useMemo } from 'react';
import { getAvailableRanges } from '../api/rooms';
import { createBooking } from '../api/bookings'; // Doğru API dosyasından import

// --- TYPES ---
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
  // --- STATES ---
  const [ranges, setRanges] = useState<RoomRange[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [days, setDays] = useState(5);

  // Modal & Booking States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingPayload, setBookingPayload] = useState<{
    roomId: number;
    roomName: string;
    start: string;
    end: string;
    title: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // --- API CALLS ---
  const fetchRanges = async () => {
    setLoading(true);
    try {
      const response = await getAvailableRanges(startDate, days);
      setRanges(response.data || []);
    } catch (error) {
      console.error('Error fetching ranges:', error);
      setRanges([]);
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

  const color = getRoomColor(bookingPayload.roomName); 

  try {
    // Bookings.tsx ile birebir aynı format:
    const payload = {
      room_id: Number(bookingPayload.roomId), // ID'nin number olduğundan emin oluyoruz
      title: bookingPayload.title.toUpperCase(), // Genelde büyük harf istenir
      color: color,
      start_time: `${bookingPayload.start} 08:30:00`, 
      end_time: `${bookingPayload.end} 17:30:00`, // Bookings.tsx'deki bitiş saati genelde 17:30'dur
    };

    console.log("Gönderilen Payload:", payload); // Network sekmesinden de bakabilirsin

    await createBooking(payload);
    
    setIsModalOpen(false);
    alert("Rezervasyon Başarılı!");
    fetchRanges(); 
  } catch (error: any) {
    // Backend'den gelen asıl hata mesajını görmek için:
    const serverMessage = error.response?.data?.message || "Doğrulama hatası.";
    console.error("Detaylı Hata:", error.response?.data);
    alert(`Hata: ${serverMessage}`);
  } finally {
    setSubmitting(false);
  }
};

  // --- HELPERS ---
  function getRoomColor(roomName: string): string {
    const prefix = roomName?.[0]?.toUpperCase();
    if (prefix === 'F') return '#3B82F6'; 
    if (prefix === 'M') return '#10B981'; 
    if (prefix === 'S') return '#F97316'; 
    return '#6B7280';
  }

  const displayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // --- LOGIC & FILTERING ---
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
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans transition-all">
      {/* SEARCH CARD */}
      <div className="max-w-6xl mx-auto mb-8 bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100">
        <h1 className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-tighter">Find Available Space</h1>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-2 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-4 border-0 rounded-2xl bg-slate-50 font-bold focus:ring-2 ring-blue-500 outline-none transition-all" />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-2 mb-1">Duration (Days)</label>
            <input type="number" min="1" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full p-4 border-0 rounded-2xl bg-slate-50 font-bold focus:ring-2 ring-blue-500 outline-none" />
          </div>
          <button onClick={fetchRanges} className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase hover:bg-blue-600 transition-all shadow-lg active:scale-95">Search</button>
        </div>
      </div>

      {/* RESULTS GRID */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 italic font-bold text-slate-400 animate-pulse uppercase tracking-widest">Scanning Resources...</div>
        ) : Object.keys(groupedRanges).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No rooms found for these criteria</p>
          </div>
        ) : (
          Object.keys(FLOORS).map((prefix) => {
            const floorRanges = groupedRanges[prefix] || [];
            if (floorRanges.length === 0) return null;
            const floor = FLOORS[prefix];
            return (
              <div key={prefix} className="mb-12">
                <div className="flex items-center gap-4 mb-8">
                  <h2 className={`text-sm font-black ${floor.color} uppercase tracking-[0.2em]`}>{floor.label}</h2>
                  <div className={`flex-1 h-px ${floor.bg} border-b border-dashed border-current opacity-20`} />
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
                      className={`${floor.bg} border border-transparent hover:border-white rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden`}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className={`font-black text-2xl ${floor.color} uppercase tracking-tighter`}>{item.room.name}</h3>
                          <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">Capacity: {item.room.capacity} Pax</p>
                        </div>
                        <div className="bg-white/80 p-2 rounded-xl text-xs shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors italic">BOOK →</div>
                      </div>
                      {item.ranges.map((range, idx) => (
                        <div key={idx} className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/50 space-y-3">
                          <div className="flex items-center justify-between text-center">
                            <div className="flex-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase block">From</span>
                              <span className="text-sm font-black text-slate-700 tracking-tight">{displayDate(range.start)}</span>
                            </div>
                            <div className="px-2 text-slate-300">/</div>
                            <div className="flex-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase block">Until</span>
                              <span className="text-sm font-black text-slate-700 tracking-tight">{displayDate(range.end)}</span>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex justify-center">
                            <span className="text-[10px] font-black bg-emerald-500 text-white px-4 py-1 rounded-full uppercase tracking-tighter shadow-md">{range.days} Consecutive Days</span>
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

      {/* QUICK BOOK MODAL */}
      {isModalOpen && bookingPayload && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl relative animate-in zoom-in-90 duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 font-bold text-xl">✕</button>
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">⚡</div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Fast Booking</h2>
              <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{bookingPayload.roomName}</p>
                <p className="text-[10px] text-blue-600 font-black mt-1">{displayDate(bookingPayload.start)} — {displayDate(bookingPayload.end)}</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 ml-3 mb-2">Assign Title / Purpose</label>
                <input autoFocus type="text" value={bookingPayload.title} onChange={(e) => setBookingPayload({...bookingPayload, title: e.target.value})} placeholder="E.G. BOARD MEETING" className="w-full bg-slate-100 border-0 rounded-[1.5rem] px-6 py-5 font-black text-lg outline-none focus:ring-4 ring-blue-500/10 uppercase transition-all" />
              </div>
              <div className="flex gap-3 pt-4">
                <button disabled={submitting || !bookingPayload.title} onClick={handleBookingSubmit} className="flex-[2] bg-blue-600 disabled:bg-slate-200 text-white py-5 rounded-2xl font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95">{submitting ? 'Creating...' : 'Confirm Now'}</button>
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-50 text-slate-400 py-5 rounded-2xl font-black uppercase hover:bg-slate-100 transition-all">Back</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}