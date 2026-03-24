import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { Room } from '../types/index';
import { getAvailableRooms, getFloors } from '../api/rooms';
import { getBookings } from '../api/bookings';
import { FloorSection } from '../components/FloorSection';
import { PageHeader } from "../components/PageHeader";
import { NewBookingForm } from "../components/NewBookingForm";

type FloorConfig = {
  label: string;
  color: string;
};

export function Available() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [floorConfigs, setFloorConfigs] = useState<Record<string, FloorConfig>>({});
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [preSelectedRoomId, setPreSelectedRoomId] = useState<number | string | null>(null);
  const [guestRoles, setGuestRoles] = useState<any[]>([]);
  const formRef = useRef<HTMLDivElement>(null);

  const initData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Promise.allSettled: Biri hata verse de diğerleri yüklensin
      const results = await Promise.allSettled([
        getFloors(),
        getAvailableRooms(selectedDate),
        getBookings()
      ]);

      // 1. Katları İşle
      const fRes = results[0];
      if (fRes.status === 'fulfilled' && fRes.value?.data) {
        const configs: Record<string, FloorConfig> = {};
        fRes.value.data.forEach((f: any) => {
          configs[f.key.toUpperCase()] = {
            label: f.label.toUpperCase(),
            color: f.bg_color_class || 'text-brand-muted',
          };
        });
        setFloorConfigs(configs);
      }

      // 2. Odaları İşle
      const rRes = results[1];
      if (rRes.status === 'fulfilled') {
        const roomsData = Array.isArray(rRes.value) ? rRes.value : (rRes.value?.data || []);
        setRooms(roomsData);
        
        if (roomsData.length > 0 && Object.keys(expandedFloors).length === 0) {
          const firstPrefix = roomsData[0].name?.[0]?.toUpperCase() || 'F';
          setExpandedFloors({ [firstPrefix]: true });
        }
      } else {
        throw new Error("Odalar yüklenemedi. Sunucu hatası.");
      }

      // 3. Rolleri İşle
      const bRes = results[2];
      if (bRes.status === 'fulfilled' && bRes.value?.meta?.guest_roles) {
        setGuestRoles(bRes.value.meta.guest_roles);
      }

    } catch (e: any) {
      console.error('Veri çekme hatası:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, expandedFloors]);

  useEffect(() => { initData(); }, [selectedDate]); // Sadece tarih değişiminde tetiklenmesi yeterli

  const groupedRooms = useMemo(() => {
    const groups: Record<string, Room[]> = {};
    rooms.forEach((room) => {
      const freeDesks = room.available_capacity ?? 0;
      if (freeDesks > 0) {
        const prefix = room.name?.[0]?.toUpperCase() || 'F';
        if (!groups[prefix]) groups[prefix] = [];
        groups[prefix].push(room);
      }
    });
    return groups;
  }, [rooms]);

  const handleRoomClick = (room: Room) => {
    setPreSelectedRoomId(room.id);
    setIsAddingNew(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-brand-surface font-brand pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b-2 border-slate-200 pb-6">
          <PageHeader highlight="LIVE" title="AVAILABILITY" />
          
          <div className="flex gap-3 items-center">
             <input
              type="date"
              className="p-2 bg-white border-2 border-slate-800 shadow-[2px_2px_0px_#000] font-black uppercase text-xs outline-none cursor-pointer"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button 
              onClick={() => { setIsAddingNew(!isAddingNew); setPreSelectedRoomId(null); }}
              className={`px-6 py-2 font-black uppercase text-xs tracking-tighter transition-all shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${
                isAddingNew ? 'bg-red-500 text-white' : 'bg-brand-primary text-white'
              }`}
            >
              {isAddingNew ? '✕ Close' : '+ New Entry'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div ref={formRef}>
          {isAddingNew && (
            <div className="mb-12 p-1 bg-slate-800 shadow-[8px_8px_0px_#000]">
              <NewBookingForm 
                rooms={rooms}
                initialRoomId={preSelectedRoomId} 
                initialDate={selectedDate}
                guestRoles={guestRoles} 
                onSuccess={() => { setIsAddingNew(false); initData(); }}
                onCancel={() => setIsAddingNew(false)}
                showToast={(msg) => alert(msg)} 
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 text-red-700 font-black text-sm uppercase italic">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center font-black text-slate-400 text-xs tracking-[0.5em] animate-pulse uppercase">
            Fetching Real-Time Data...
          </div>
        ) : Object.keys(groupedRooms).length === 0 ? (
          <div className="py-20 text-center border-4 border-dashed border-slate-200 rounded-xl">
            <p className="font-black text-slate-400 uppercase tracking-widest">No rooms available for this date.</p>
          </div>
        ) : (
          <div className="space-y-6"> 
            {Object.keys(groupedRooms).sort().map((prefix) => {
              const floorRooms = groupedRooms[prefix] || [];
              const floor = floorConfigs[prefix] || { label: `${prefix} FLOOR`, color: 'text-slate-500' };

              return (
                <FloorSection
                  key={prefix}
                  label={floor.label}
                  color={floor.color}
                  isOpen={!!expandedFloors[prefix]}
                  onToggle={() => setExpandedFloors(p => ({ ...p, [prefix]: !p[prefix] }))}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {floorRooms.map((room) => {
                      const occupancyPercent = ((room.capacity - (room.available_capacity ?? 0)) / room.capacity) * 100;
                      
                      return (
                        <div
                          key={room.id}
                          onClick={() => handleRoomClick(room)}
                          className="relative bg-white border-2 border-slate-800 p-5 cursor-pointer group hover:-translate-y-1 hover:shadow-[6px_6px_0px_#4f46e5] transition-all shadow-[6px_6px_0px_#e2e8f0] overflow-hidden"
                        >
                          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-100">
                            <div 
                              className={`h-full transition-all duration-500 ${occupancyPercent > 80 ? 'bg-red-500' : 'bg-brand-primary'}`}
                              style={{ width: `${occupancyPercent}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-start mb-4">
                            <h3 className={`font-black text-xl italic tracking-tighter uppercase ${floor.color}`}>
                              {room.name}
                            </h3>
                            <span className="bg-slate-800 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                               {room.capacity} CAP
                            </span>
                          </div>

                          <div className="flex items-end justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Status</p>
                                <p className={`font-black text-sm uppercase ${room.available_capacity === 1 ? 'text-red-500' : 'text-slate-800'}`}>
                                    {room.available_capacity} Desks Free
                                </p>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-brand-primary font-black text-xl">→</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </FloorSection>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Available;