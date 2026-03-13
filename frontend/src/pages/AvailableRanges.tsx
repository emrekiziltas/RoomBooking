import { useEffect, useState, useMemo } from 'react';
import { getAvailableRanges, getFloors } from '../api/rooms';
import { createBooking } from '../api/bookings';
import { PageHeader } from "../components/PageHeader";
import { BookingModal } from "../components/BookingModal";

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

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadFloors = async () => {
    try {
      const response = await getFloors();
      const apiFloors = response.data ?? [];
      const config: Record<string, any> = {};
      apiFloors.forEach((f: any) => {
        config[f.key.toUpperCase()] = {
          label: f.label.toUpperCase(),
          color: f.bg_color_class || 'text-brand-muted',
          bg: f.active_bg_class || 'bg-brand-surface'
        };
      });
      setFloors(config);
    } catch (e) { 
      console.error("Floors load failed"); 
    }
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
      fetchRanges();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'ACTION FAILED';
      setToast({ message: errorMsg.toUpperCase(), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface font-brand">
      
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

      {/* HEADER SECTION - Diğer sayfalarla tam uyumlu */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-brand-surface pb-4">
          <div className="flex-1 w-full">
            <PageHeader highlight="RANGE" title="PLANNING" />
          </div>

          <div className="flex flex-wrap items-end gap-2 pb-[2px] mt-4 md:mt-0">
            <div className="flex bg-white p-1 rounded-ini border border-brand-surface shadow-sm gap-2">
              <div className="flex flex-col px-2">
                <span className="text-[7px] font-black text-brand-muted uppercase">Start Date</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="bg-transparent font-black text-[10px] outline-none uppercase" 
                />
              </div>
              <div className="w-[1px] h-6 bg-brand-surface my-auto" />
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
              onClick={fetchRanges} 
              disabled={loading} 
              className="px-6 py-3 bg-brand-secondary text-white rounded-ini font-black uppercase text-[10px] tracking-widest hover:bg-brand-primary transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? 'ANALYZING...' : 'EXECUTE'}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT SECTION - mt-8 ile ferahlatıldı */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        {loading ? (
          <div className="py-20 text-center font-black text-brand-muted text-[10px] tracking-[0.4em] uppercase animate-pulse">Scanning Infrastructure...</div>
        ) : (
          <div className="pb-20">
            {Object.keys(groupedRanges).sort().map((prefix) => {
              const floor = floors[prefix] || { label: `${prefix} BLOCK`, color: 'text-brand-muted' };
              const isExpanded = expandedFloors[prefix];

              return (
                <div key={prefix} className="mb-6">
                  <button
                    onClick={() => setExpandedFloors(p => ({ ...p, [prefix]: !p[prefix] }))}
                    className="w-full flex items-center gap-4 mb-4 group"
                  >
                    <h2 className={`text-[10px] font-black ${floor.color} uppercase tracking-[0.2em]`}>{floor.label}</h2>
                    <div className="flex-1 h-px bg-brand-surface group-hover:bg-brand-primary transition-colors" />
                    <span className={`text-brand-muted text-[10px] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {isExpanded && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
                            className={`ini-card p-4 transition-all group ${hasRange ? 'cursor-pointer hover:border-brand-primary bg-white' : 'opacity-40 cursor-not-allowed bg-brand-surface'}`}
                          >
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                <h3 className={`font-black text-sm ${floor.color} uppercase tracking-tighter leading-none`}>{item.name}</h3>
                                <p className="text-[8px] font-black text-brand-muted uppercase mt-1">Cap: {item.capacity}</p>
                              </div>
                              {hasRange && (
                                <div className="text-[14px] text-brand-muted group-hover:text-brand-primary transition-colors">→</div>
                              )}
                            </div>
                            
                            {hasRange ? (
                              <div className="space-y-3">
                     {/* Eski halini silip bunu yapıştırabilirsin */}
<div className="flex justify-between items-center text-[9px] font-black text-brand-secondary bg-brand-surface p-2 rounded-sm gap-1">
  <span className="whitespace-nowrap">
    {new Date(item.filteredRanges[0].start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
  </span>
  <span className="text-brand-muted opacity-30">—</span>
  <span className="whitespace-nowrap">
    {new Date(item.filteredRanges[0].end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
  </span>
</div>
                                <div className="flex justify-center">
                                  <span className="text-[7px] font-black bg-brand-primary/10 text-brand-primary px-2 py-1 rounded-full uppercase tracking-widest">
                                    {item.filteredRanges[0].days} DAYS SEQ
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[8px] font-black text-center text-brand-muted py-2 uppercase italic tracking-widest">Unavailable</div>
                            )}
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

      {/* MODAL SECTION */}
        <BookingModal 
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onConfirm={handleBookingSubmit}
  title={bookingPayload?.title || ''}
  setTitle={(val: string) => setBookingPayload({ ...bookingPayload, title: val })}
  roomName={bookingPayload?.roomName || ''}
  floorConfig={floors[(bookingPayload?.roomName || "?")[0].toUpperCase()] || { bg: 'bg-brand-surface' }}
  start={bookingPayload?.start}
  end={bookingPayload?.end}
  submitting={submitting}
/>
    </div>
  );
}