import { useEffect, useState, useMemo, useCallback } from 'react';
import { getAvailableRanges, getFloors } from '../api/rooms';
import { createBooking } from '../api/bookings';
import { PageHeader } from "../components/PageHeader";
import { BookingModal } from "../components/BookingModal";

type FloorConfig = {
  label: string;
  color: string;
  bg: string;
};

export function AvailableRanges() {
  const [ranges, setRanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });
  const [days, setDays] = useState(2);
  const [floorConfigs, setFloorConfigs] = useState<Record<string, FloorConfig>>({});
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingPayload, setBookingPayload] = useState<any>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const initData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        getFloors(),
        getAvailableRanges(startDate, days)
      ]);

      // 1. Kat Ayarlarını Yükle
      const fRes = results[0];
      if (fRes.status === 'fulfilled' && fRes.value?.data) {
        const config: Record<string, FloorConfig> = {};
        fRes.value.data.forEach((f: any) => {
          config[f.key.toUpperCase()] = {
            label: f.label.toUpperCase(),
            color: f.bg_color_class || 'text-brand-muted',
            bg: f.active_bg_class || 'bg-brand-surface'
          };
        });
        setFloorConfigs(config);
      }

      // 2. Odaları ve Aralıkları İşle
      const rRes = results[1];
      if (rRes.status === 'fulfilled') {
        const apiData = rRes.value?.data || rRes.value || [];
        setRanges(apiData);
      } else {
        throw new Error("PLANNING DATA UNREACHABLE");
      }
    } catch (e: any) {
      setError(e.message || "SYNC FAILED");
    } finally {
      setLoading(false);
    }
  }, [startDate, days]);

  useEffect(() => {
    initData();
  }, [initData]);

  // VERİ GRUPLAMA VE SIRALAMA (F2, F6 sorununu burada çözüyoruz)
  const groupedRanges = useMemo(() => {
    if (!Array.isArray(ranges) || ranges.length === 0) return {};

    const groups: Record<string, any[]> = {};

    ranges.forEach((item: any) => {
      const roomInfo = item.room;
      const roomRanges = item.ranges || [];

      // Sadece ismi olan ve en az 1 müsait aralığı olan odaları al
      if (roomInfo && roomInfo.name && roomRanges.length > 0) {
        const cleanName = roomInfo.name.trim();
        const prefix = cleanName[0].toUpperCase();
        
        if (!groups[prefix]) groups[prefix] = [];
        
        groups[prefix].push({
          ...roomInfo,
          name: cleanName,
          filteredRanges: roomRanges
        });
      }
    });

    // Grupları kendi içinde isme göre sırala (F1, F2, F3... şeklinde)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    });

    return groups;
  }, [ranges]);

  useEffect(() => {
    const keys = Object.keys(groupedRanges).sort();
    if (keys.length > 0 && Object.keys(expandedFloors).length === 0) {
      setExpandedFloors({ [keys[0]]: true });
    }
  }, [groupedRanges]);

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
      initData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'ACTION FAILED';
      setToast({ message: errorMsg.toUpperCase(), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface font-brand pb-20">
      
      {/* TOASTER */}
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[1500] animate-in fade-in slide-in-from-top-10 duration-500">
          <div className={`flex items-center gap-4 px-8 py-4 rounded-full shadow-2xl border-2 bg-white ${toast.type === 'success' ? 'border-brand-success' : 'border-brand-danger'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${toast.type === 'success' ? 'bg-brand-success text-white' : 'bg-brand-danger text-white'}`}>
              {toast.type === 'success' ? '✓' : '!'}
            </div>
            <p className="font-black text-brand-secondary text-[11px] uppercase tracking-tighter italic">{toast.message}</p>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex flex-col md:flex-row justify-between items-end border-b-2 border-slate-200 pb-6 gap-4">
          <PageHeader highlight="RANGE" title="PLANNING" />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-white border-2 border-slate-800 shadow-[2px_2px_0px_#000] p-1 gap-2">
              <div className="flex flex-col px-2">
                <span className="text-[7px] font-black text-brand-muted uppercase">Start Date</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="bg-transparent font-black text-[10px] outline-none uppercase cursor-pointer" 
                />
              </div>
              <div className="w-px h-6 bg-slate-200 my-auto" />
              <div className="flex flex-col px-2">
                <span className="text-[7px] font-black text-brand-muted uppercase">Cycle</span>
                <input 
                  type="number" 
                  value={days} 
                  onChange={(e) => setDays(Number(e.target.value))} 
                  className="bg-transparent font-black text-[10px] outline-none w-8 text-center" 
                />
              </div>
            </div>

            <button 
              onClick={initData} 
              disabled={loading} 
              className="px-6 py-2 bg-brand-primary text-white font-black uppercase text-xs tracking-tighter shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 transition-all"
            >
              {loading ? 'ANALYZING...' : 'EXECUTE'}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT SECTION */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        {loading ? (
          <div className="py-24 text-center font-black text-slate-400 text-xs tracking-[0.5em] animate-pulse uppercase italic">
            Scanning Infrastructure...
          </div>
        ) : (
          <div className="space-y-10">
            {Object.keys(groupedRanges).sort().map((prefix) => {
              const floor = floorConfigs[prefix] || { label: `${prefix} BLOCK`, color: 'text-slate-500', bg: 'bg-slate-200' };
              const isExpanded = expandedFloors[prefix];

              return (
                <div key={prefix}>
                  <button
                    onClick={() => setExpandedFloors(p => ({ ...p, [prefix]: !p[prefix] }))}
                    className="w-full flex items-center gap-4 mb-6 group"
                  >
                    <h2 className={`text-xs font-black ${floor.color} uppercase tracking-[0.2em]`}>{floor.label}</h2>
                    <div className="flex-1 h-px bg-slate-200 group-hover:bg-brand-primary transition-colors" />
                    <span className={`text-slate-400 text-[10px] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {isExpanded && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                      {groupedRanges[prefix].map((item: any) => {
                        const range = item.filteredRanges[0];
                        return (
                          <div 
                            key={item.id} 
                            onClick={() => {
                              setBookingPayload({ 
                                roomId: item.id, 
                                roomName: item.name, 
                                start: range.start, 
                                end: range.end, 
                                title: '' 
                              });
                              setIsModalOpen(true);
                            }}
                            className="relative bg-white border-2 border-slate-800 p-4 cursor-pointer group hover:-translate-y-1 hover:shadow-[6px_6px_0px_#4f46e5] transition-all shadow-[6px_6px_0px_#e2e8f0]"
                          >
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                <h3 className={`font-black text-sm ${floor.color} uppercase tracking-tighter leading-none`}>{item.name}</h3>
                                {/* KAPASİTE GÖSTERGESİ */}
                                <div className="flex items-center gap-1.5 mt-2">
                                  <div className="flex gap-[2px]">
                                    {[...Array(Math.min(item.capacity, 4))].map((_, i) => (
                                      <div key={i} className={`w-1 h-1.5 rounded-full ${floor.color.replace('text-', 'bg-')} opacity-40`} />
                                    ))}
                                  </div>
                                  <p className="text-[7px] font-black text-slate-400 uppercase">Cap: {item.capacity}</p>
                                </div>
                              </div>
                              <span className="text-brand-primary font-black text-sm opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">→</span>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-[9px] font-black text-slate-700 bg-slate-50 p-2 border border-slate-100">
                                <span className="whitespace-nowrap">{range.start.split('-').slice(1).reverse().join('/')}</span>
                                <span className="text-slate-300">—</span>
                                <span className="whitespace-nowrap">{range.end.split('-').slice(1).reverse().join('/')}</span>
                              </div>
                              <div className="flex justify-center">
                                <span className="text-[7px] font-black bg-brand-primary/5 text-brand-primary px-2 py-0.5 rounded-full uppercase tracking-tighter border border-brand-primary/10">
                                  {range.days} DAYS SEQ
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BookingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleBookingSubmit}
        title={bookingPayload?.title || ''}
        setTitle={(val: string) => setBookingPayload({ ...bookingPayload, title: val })}
        roomName={bookingPayload?.roomName || ''}
        floorConfig={floorConfigs[(bookingPayload?.roomName || "?")[0].toUpperCase()] || { bg: 'bg-brand-surface' }}
        start={bookingPayload?.start}
        end={bookingPayload?.end}
        submitting={submitting}
      />
    </div>
  );
}

export default AvailableRanges;