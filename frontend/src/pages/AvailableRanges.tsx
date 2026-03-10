import { useEffect, useState, useMemo } from 'react';
import { getAvailableRanges, getFloors } from '../api/rooms';
import { createBooking } from '../api/bookings';

export function AvailableRanges() {
  const [ranges, setRanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [days, setDays] = useState(2);
  const [floors, setFloors] = useState<Record<string, any>>({});
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingPayload, setBookingPayload] = useState<any>(null);

  // Toast mesajını temizlemek için timer (zaten vardı ama daha temiz hale getirdik)
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadFloors = async () => {
    try {
      const response = await getFloors();
      const apiFloors = response.data || response || [];
      const config: Record<string, any> = {};
      const colors = ['text-brand-primary', 'text-brand-success', 'text-brand-danger', 'text-brand-info'];
      apiFloors.forEach((f: any, i: number) => {
        config[f.key.toUpperCase()] = { label: f.label.toUpperCase(), color: colors[i % colors.length] };
      });
      setFloors(config);
    } catch (e) { console.error("Floors load failed"); }
  };

  const fetchRanges = async () => {
    setLoading(true);
    try {
      const result = await getAvailableRanges(startDate, days);
      setRanges(result.data || result || []);
    } catch (error) {
      setToast({ message: 'SYNC FAILED - DATABASE UNREACHABLE', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFloors();
    fetchRanges();
  }, []);

  const groupedRanges = useMemo(() => {
    const rawData = Array.isArray(ranges) ? ranges : [];
    if (rawData.length === 0) return {};

    return rawData
      .map((item: any) => ({
        ...item.room,
        filteredRanges: item.ranges || []
      }))
      .filter((item: any) => item.filteredRanges.length > 0)
      .reduce((acc: any, item: any) => {
        const prefix = (item.name || "?")[0].toUpperCase();
        if (!acc[prefix]) acc[prefix] = [];
        acc[prefix].push(item);
        return acc;
      }, {} as Record<string, any[]>);
  }, [ranges, startDate, days]);

  const handleBookingSubmit = async () => {
    if (!bookingPayload?.title) return;
    setSubmitting(true);
    try {
      await createBooking({
        room_id: bookingPayload.roomId,
        title: bookingPayload.title.toUpperCase(),
        color: 'var(--brand-primary)',
        start_time: `${bookingPayload.start} 08:30:00`,
        end_time: `${bookingPayload.end} 17:30:00`,
      });
      setIsModalOpen(false);
      setToast({ message: 'SEQUENCE COMMITTED ✓', type: 'success' });
      fetchRanges();
    } catch (error: any) {
      // Laravel'den gelen özel bir hata mesajı varsa onu göster
      const errorMsg = error.response?.data?.message || 'ACTION FAILED';
      setToast({ message: errorMsg.toUpperCase(), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface p-4 md:p-8 font-brand text-brand-secondary">
      
      {/* --- MODERN CENTER-TOP TOASTER --- */}
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[1500] animate-in fade-in slide-in-from-top-10 duration-500">
          <div className={`
            flex items-center gap-4 px-8 py-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2
            ${toast.type === 'success' ? 'bg-white border-brand-success' : 'bg-white border-brand-danger'}
          `}>
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center font-black text-sm
              ${toast.type === 'success' ? 'bg-brand-success text-white' : 'bg-brand-danger text-white'}
            `}>
              {toast.type === 'success' ? '✓' : '!'}
            </div>
            <p className="font-black text-brand-secondary text-[11px] uppercase tracking-tighter italic whitespace-nowrap">
              {toast.message}
            </p>
            <div className="w-[1px] h-4 bg-gray-200 mx-2" />
            <button 
                onClick={() => setToast(null)} 
                className="text-brand-muted hover:text-brand-secondary font-black text-[10px] uppercase tracking-widest px-2 transition-colors"
            >
                Dismiss
            </button>
          </div>
        </div>
      )}

      {/* SEARCH HEADER */}
      <div className="max-w-7xl mx-auto mb-10 bg-white p-8 rounded border border-brand-surface shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 bg-brand-secondary rounded flex items-center justify-center text-xl text-white">📅</div>
          <div>
            <h1 className="text-2xl font-black uppercase italic leading-none">Range <span className="text-brand-primary">Search</span></h1>
            <p className="text-brand-muted text-[9px] font-black uppercase tracking-[0.3em] mt-1">Infrastructure Analysis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-brand-muted ml-1">Initial Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 bg-brand-surface rounded font-black text-[11px] outline-none focus:ring-2 ring-brand-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-brand-muted ml-1">Cycle Days</label>
            <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full p-3 bg-brand-surface rounded font-black text-[11px] outline-none focus:ring-2 ring-brand-primary" />
          </div>
          <div className="flex items-end">
            <button onClick={fetchRanges} disabled={loading} className="w-full py-3 bg-brand-secondary text-white rounded font-black uppercase text-[11px] hover:bg-brand-primary transition-all">
              {loading ? 'ANALYZING...' : 'EXECUTE SEARCH'}
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS GRID */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="py-20 text-center font-black text-brand-muted text-[10px] tracking-[0.4em] uppercase">Scanning...</div>
        ) : (
          Object.keys(groupedRanges).sort().map((prefix) => {
            const floor = floors[prefix] || { label: `${prefix} BLOCK`, color: 'text-brand-muted' };
            return (
              <div key={prefix} className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className={`text-[10px] font-black ${floor.color} uppercase tracking-[0.2em]`}>{floor.label}</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedRanges[prefix].map((item: any) => {
                    const hasRange = item.filteredRanges && item.filteredRanges.length > 0;
                    return (
                      <div key={item.id} className={`bg-white p-6 rounded border border-brand-surface shadow-sm transition-all ${hasRange ? 'hover:border-brand-primary cursor-pointer hover:shadow-md' : 'opacity-60 cursor-not-allowed'}`}
                        onClick={() => {
                          if (!hasRange) return;
                          const range = item.filteredRanges[0];
                          setBookingPayload({ 
                            roomId: item.id, 
                            roomName: item.name, 
                            start: range.start, 
                            end: range.end, 
                            title: '' 
                          });
                          setIsModalOpen(true);
                        }}>
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className={`font-black text-xl ${floor.color} uppercase tracking-tighter`}>{item.name}</h3>
                            <p className="text-[9px] font-black text-brand-muted uppercase italic">Capacity: {item.capacity}</p>
                          </div>
                          {hasRange && <div className="bg-brand-surface px-3 py-1 rounded text-[9px] font-black text-brand-secondary group-hover:bg-brand-primary group-hover:text-white transition-colors">SELECT</div>}
                        </div>
                        
                        {hasRange ? (
                          <div className="bg-brand-surface rounded p-4 border border-brand-surface space-y-2">
                            <div className="flex justify-between text-[11px] font-black">
                              <span>{item.filteredRanges[0].start.split(' ')[0].split('-').reverse().join('/')}</span>
                              <span className="text-brand-muted">→</span>
                              <span>{item.filteredRanges[0].end.split(' ')[0].split('-').reverse().join('/')}</span>
                            </div>
                            <div className="pt-2 border-t border-white/50 flex justify-center">
                              <span className="text-[8px] font-black bg-brand-success text-white px-3 py-1 rounded uppercase">
                                {item.filteredRanges[0].days} DAYS CONTINUOUS
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[9px] font-black text-center text-brand-muted bg-brand-surface py-2 rounded uppercase italic">
                            No matching sequence
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* BOOKING MODAL */}
      {isModalOpen && bookingPayload && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
          <div className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white max-w-md w-full p-10 rounded relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-brand-secondary uppercase italic text-center mb-8 tracking-tighter">Sequence Booking</h2>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase text-brand-primary mb-2 block tracking-widest">Mission Title</label>
                <input autoFocus type="text" value={bookingPayload.title} onChange={(e) => setBookingPayload({ ...bookingPayload, title: e.target.value })} placeholder="E.G. PROJECT X" className="w-full bg-brand-surface border-0 rounded px-5 py-4 font-black text-[11px] outline-none ring-1 ring-brand-surface focus:ring-brand-primary uppercase transition-all" />
              </div>
              <div className="flex gap-3">
                <button disabled={submitting || !bookingPayload.title} onClick={handleBookingSubmit} className="flex-[2] bg-brand-secondary text-white py-4 rounded font-black uppercase text-[10px] hover:bg-brand-primary disabled:opacity-30 transition-all shadow-lg active:scale-95">
                  {submitting ? 'EXECUTING...' : 'CONFIRM SEQUENCE'}
                </button>
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-brand-surface text-brand-muted py-4 rounded font-black uppercase text-[10px] hover:bg-gray-200 transition-all">ABORT</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}