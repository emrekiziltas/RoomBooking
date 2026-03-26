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
  
  // Modal & Booking States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingPayload, setBookingPayload] = useState<any>(null);

  // TOAST TEMİZLEME
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ANA VERİ YÜKLEME FONKSİYONU (Modernize Edildi)
const initData = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const results = await Promise.allSettled([
      getFloors(),
      getAvailableRanges(startDate, days)
    ]);

    // Katları İşle
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

    // 2. ARALIKLARI İŞLE (Log çıktına göre burayı düzelttik)
    const rRes = results[1];
    if (rRes.status === 'fulfilled') {
      // API logunda verinin rRes.value.data içinde olduğu görülüyor
      const apiData = rRes.value?.data || []; 
      setRanges(apiData);
      console.log("Processed Ranges State:", apiData); 
    } else {
      throw new Error("PLANNING DATA UNREACHABLE");
    }

  } catch (e: any) {
    console.error('Fetch failed:', e);
    setError(e.message || "SYNC FAILED");
  } finally {
    setLoading(false);
  }
}, [startDate, days]);

  useEffect(() => {
    initData();
  }, [initData]);

  // VERİ GRUPLAMA (useMemo)
  const groupedRanges = useMemo(() => {
    const rawData = Array.isArray(ranges) ? ranges : [];
    if (rawData.length === 0) return {};

    const groups = rawData
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

    return groups;
  }, [ranges]);

  // İLK KATI OTOMATİK AÇMA
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
   
        start_time: `${bookingPayload.start} 08:30:00`,
        end_time: `${bookingPayload.end} 17:30:00`,
      });
      setIsModalOpen(false);
      setToast({ message: 'SEQUENCE COMMITTED ✓', type: 'success' });
      initData(); // Veriyi tazele
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
          <div className={`flex items-center gap-4 px-8 py-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 ${toast.type === 'success' ? 'bg-white border-brand-success' : 'bg-white border-brand-danger'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${toast.type === 'success' ? 'bg-brand-success text-white' : 'bg-brand-danger text-white'}`}>
              {toast.type === 'success' ? '✓' : '!'}
            </div>
            <p className="font-black text-brand-secondary text-[11px] uppercase tracking-tighter italic whitespace-nowrap">{toast.message}</p>
            <button onClick={() => setToast(null)} className="text-brand-muted hover:text-brand-secondary font-black text-[10px] uppercase ml-2 px-2 transition-colors">✕</button>
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
              className="px-6 py-2 bg-brand-primary text-white font-black uppercase text-xs tracking-tighter transition-all shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50"
            >
              {loading ? 'ANALYZING...' : 'EXECUTE'}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT SECTION */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 text-red-700 font-black text-sm uppercase italic">
            ⚠️ ERROR: {error}
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center font-black text-slate-400 text-xs tracking-[0.5em] animate-pulse uppercase">
            Scanning Infrastructure...
          </div>
        ) : Object.keys(groupedRanges).length === 0 ? (
          <div className="py-20 text-center border-4 border-dashed border-slate-200 rounded-xl">
            <p className="font-black text-slate-400 uppercase tracking-widest italic">No available sequences found for this criteria.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedRanges).sort().map((prefix) => {
              const floor = floorConfigs[prefix] || { label: `${prefix} BLOCK`, color: 'text-slate-500' };
              const isExpanded = expandedFloors[prefix];

              return (
                <div key={prefix}>
                  <button
                    onClick={() => setExpandedFloors(p => ({ ...p, [prefix]: !p[prefix] }))}
                    className="w-full flex items-center gap-4 mb-4 group"
                  >
                    <h2 className={`text-xs font-black ${floor.color} uppercase tracking-[0.2em]`}>{floor.label}</h2>
                    <div className="flex-1 h-px bg-slate-200 group-hover:bg-brand-primary transition-colors" />
                    <span className={`text-slate-400 text-xs transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {isExpanded && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                            className="relative bg-white border-2 border-slate-800 p-4 cursor-pointer group hover:-translate-y-1 hover:shadow-[6px_6px_0px_#4f46e5] transition-all shadow-[6px_6px_0px_#e2e8f0] overflow-hidden"
                          >
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                <h3 className={`font-black text-sm ${floor.color} uppercase tracking-tighter leading-none`}>{item.name}</h3>
                                <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Capacity: {item.capacity}</p>
                              </div>
                              <span className="text-brand-primary font-black text-lg opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-[9px] font-black text-slate-700 bg-slate-50 p-2 rounded-sm gap-1 border border-slate-100">
                                <span className="whitespace-nowrap">
                                  {new Date(range.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                                </span>
                                <span className="text-slate-300">—</span>
                                <span className="whitespace-nowrap">
                                  {new Date(range.end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex justify-center">
                                <span className="text-[7px] font-black bg-brand-primary/10 text-brand-primary px-2 py-1 rounded-full uppercase tracking-widest border border-brand-primary/20">
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