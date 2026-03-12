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
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({});

  // TOAST OTOMATİK KAPATMA
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // KAT BİLGİLERİNİ ÇEK (LookupValues - Colors vs.)
  const loadFloors = async () => {
    try {
      const response = await getFloors();
      const apiFloors = response.data ?? [];
      const config: Record<string, any> = {};
      apiFloors.forEach((f: any) => {
        config[f.key.toUpperCase()] = {
          label: f.label.toUpperCase(),
          color: f.bg_color_class || 'text-brand-muted'
        };
      });
      setFloors(config);
    } catch (e) { 
      console.error("Floors load failed"); 
    }
  };

  // UYGUN ARALIKLARI ÇEK
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

  // SAYFA İLK AÇILDIĞINDA ÇALIŞTIR
  useEffect(() => {
    loadFloors();
    fetchRanges();
  }, []);

  // VERİYİ KATLARA GÖRE GRUPLA (Ana Mantık Korundu)
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
  }, [ranges]);

  // İLK KATI OTOMATİK AÇ (Sonsuz döngü engellendi)
  useEffect(() => {
    const keys = Object.keys(groupedRanges).sort();
    if (keys.length > 0 && Object.keys(expandedFloors).length === 0) {
      setExpandedFloors({ [keys[0]]: true });
    }
  }, [groupedRanges]);

  // REZERVASYON KAYDETME
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
      fetchRanges(); // Listeyi güncelle
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'ACTION FAILED';
      setToast({ message: errorMsg.toUpperCase(), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface p-4 md:p-8 font-brand text-brand-secondary">
      
      {/* TOASTER */}
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[1500] animate-in fade-in slide-in-from-top-10 duration-500">
          <div className={`flex items-center gap-4 px-8 py-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 ${toast.type === 'success' ? 'bg-white border-brand-success' : 'bg-white border-brand-danger'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${toast.type === 'success' ? 'bg-brand-success text-white' : 'bg-brand-danger text-white'}`}>
              {toast.type === 'success' ? '✓' : '!'}
            </div>
            <p className="font-black text-brand-secondary text-[11px] uppercase tracking-tighter italic whitespace-nowrap">{toast.message}</p>
            <div className="w-[1px] h-4 bg-gray-200 mx-2" />
            <button onClick={() => setToast(null)} className="text-brand-muted hover:text-brand-secondary font-black text-[10px] uppercase tracking-widest px-2 transition-colors">Dismiss</button>
          </div>
        </div>
      )}

      {/* SEARCH HEADER */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-brand-surface pb-6">
          <div className="flex-shrink-0">
            <h1 className="text-3xl font-black text-brand-secondary uppercase italic leading-none">
              Range <span className="text-brand-primary">Planning</span>
            </h1>
            <p className="text-brand-muted text-[10px] font-black uppercase tracking-[0.3em] mt-1">Resource Control & Dynamic Scheduling</p>
          </div>

          <div className="flex flex-wrap md:flex-nowrap items-end gap-3 bg-white p-2 rounded-ini shadow-sm border border-brand-surface">
            <div className="flex-1 min-w-[140px] space-y-1">
              <label className="text-[8px] font-black uppercase text-brand-muted ml-2 tracking-tighter">Initial Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-brand-surface rounded-ini font-black text-[11px] outline-none focus:ring-2 ring-brand-primary transition-all" />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-[8px] font-black uppercase text-brand-muted ml-2 tracking-tighter">Cycle Days</label>
              <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full px-3 py-2 bg-brand-surface rounded-ini font-black text-[11px] outline-none focus:ring-2 ring-brand-primary transition-all text-center" />
            </div>
            <div className="flex-shrink-0">
              <button onClick={fetchRanges} disabled={loading} className="px-6 py-2.5 bg-brand-secondary text-white rounded-ini font-black uppercase text-[10px] tracking-widest hover:bg-brand-primary transition-all shadow-md active:scale-95 disabled:opacity-50">
                {loading ? 'ANALYZING...' : 'EXECUTE SEARCH'}
              </button>
            </div>
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
            const isExpanded = expandedFloors[prefix];

            return (
              <div key={prefix} className="mb-8">
                <button
                  onClick={() => setExpandedFloors(p => ({ ...p, [prefix]: !p[prefix] }))}
                  className="w-full flex items-center gap-4 mb-4 group"
                >
                  <h2 className={`text-[10px] font-black ${floor.color} uppercase tracking-[0.2em]`}>{floor.label}</h2>
                  <div className="flex-1 h-px bg-gray-200 group-hover:bg-brand-primary transition-colors" />
                  <span className={`text-brand-muted text-[10px] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {isExpanded && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    {groupedRanges[prefix].map((item: any) => {
                      const hasRange = item.filteredRanges && item.filteredRanges.length > 0;
                      return (
                        <div 
                          key={item.id} 
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
                          }}
                          className={`bg-white p-3 rounded-ini border border-brand-surface shadow-sm transition-all group ${hasRange ? 'hover:border-brand-primary cursor-pointer hover:shadow-md' : 'opacity-60 cursor-not-allowed'}`}
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h3 className={`font-black text-base ${floor.color} uppercase tracking-tighter`}>{item.name}</h3>
                              <p className="text-[9px] font-black text-brand-muted uppercase italic">Cap: {item.capacity}</p>
                            </div>
                            {hasRange && <div className="bg-brand-surface px-2 py-0.5 rounded text-[8px] font-black text-brand-secondary group-hover:bg-brand-primary group-hover:text-white transition-colors uppercase">Select</div>}
                          </div>
                          
                          {hasRange ? (
                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-black">
                                <span>{item.filteredRanges[0].start.split(' ')[0].split('-').reverse().join('/')}</span>
                                <span className="text-brand-muted">→</span>
                                <span>{item.filteredRanges[0].end.split(' ')[0].split('-').reverse().join('/')}</span>
                              </div>
                              <div className="pt-2 border-t border-brand-surface flex justify-center">
                                <span className="text-[8px] font-black bg-brand-success text-white px-2 py-1 rounded-sm uppercase">
                                  {item.filteredRanges[0].days} Days Seq
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[8px] font-black text-center text-brand-muted bg-brand-surface py-2 rounded uppercase italic">No Match</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && bookingPayload && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
          <div className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white max-w-md w-full p-10 rounded-ini relative z-10 shadow-2xl">
            <h2 className="text-2xl font-black text-brand-secondary uppercase italic text-center mb-8 tracking-tighter">Sequence Booking</h2>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase text-brand-primary mb-2 block tracking-widest">Mission Title</label>
                <input autoFocus type="text" value={bookingPayload.title} onChange={(e) => setBookingPayload({ ...bookingPayload, title: e.target.value })} placeholder="E.G. PROJECT X" className="w-full bg-brand-surface border-0 rounded px-5 py-4 font-black text-[11px] outline-none focus:ring-1 ring-brand-primary uppercase" />
              </div>
              <div className="flex gap-3">
                <button disabled={submitting || !bookingPayload.title} onClick={handleBookingSubmit} className="flex-[2] bg-brand-secondary text-white py-4 rounded font-black uppercase text-[10px] hover:bg-brand-primary disabled:opacity-30 transition-all shadow-lg">
                  {submitting ? 'EXECUTING...' : 'CONFIRM SEQUENCE'}
                </button>
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-brand-surface text-brand-muted py-4 rounded font-black uppercase text-[10px] hover:bg-gray-200">Abort</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}