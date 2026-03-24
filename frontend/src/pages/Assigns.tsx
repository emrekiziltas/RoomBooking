import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../api/axios';
import { getFloors } from '../api/rooms';

import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';

// --- STYLES (Aynı Kaldı) ---
const styles = `
  @keyframes marchingAnts { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -40; } }
  .marching-ants-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
  .marching-ants-svg rect { fill: none; stroke: var(--color-brand-primary, #6366f1); stroke-width: 2.5; stroke-dasharray: 10 6; animation: marchingAnts 0.6s linear infinite; }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
`;

// --- BİLEŞEN: SÜRÜKLENEBİLİR KART ---
function DraggableBooking({ booking, isSelected, onUpdate, onSelect, isOverlay = false }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState({
    title: booking.title,
    snapshot_guest_name: booking.snapshot_guest_name || '',
    check_in: (booking.check_in || booking.start_time).split('T')[0],
    check_out: (booking.check_out || booking.end_time).split('T')[0],
  });

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `booking-${booking.id}`,
    data: booking,
    disabled: isEditing || !isSelected,
  });

const handleSave = async (e: React.MouseEvent) => {
  e.stopPropagation();
  await onUpdate(booking.id, {
    snapshot_guest_name: tempData.snapshot_guest_name,
    check_in: tempData.check_in,
    check_out: tempData.check_out,
    // room_id YOK — conflict kontrolü tetiklenmesin
  });
  setIsEditing(false);
};

  const style = !isOverlay && transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-booking-id={booking.id}
      onClick={() => !isEditing && !isOverlay && onSelect(booking)}
      className={`p-3 mb-3 transition-all bg-white relative overflow-hidden
        ${isSelected && !isEditing
          ? 'border-2 border-transparent shadow-[0_0_0_2px_#6366f1,6px_6px_0px_#000] bg-brand-primary/5 scale-[1.02]'
          : 'border-2 border-brand-secondary shadow-[4px_4px_0px_#000]'
        }
        ${isEditing ? '!border-brand-primary z-10 !scale-100' : ''}
        ${isDragging && !isOverlay ? 'opacity-30' : ''}
        ${isOverlay ? 'rotate-0 scale-105 shadow-[12px_12px_0px_#000] pointer-events-none' : ''}`}
    >
      {isSelected && !isEditing && (
        <svg className="marching-ants-svg" aria-hidden="true">
          <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" />
        </svg>
      )}

      {isEditing ? (
        <div className="space-y-2">
          <input
            className="w-full text-[11px] font-black uppercase border-b-2 border-brand-primary outline-none py-1 bg-transparent"
            value={tempData.snapshot_guest_name}
            placeholder="GUEST NAME"
            onChange={(e) => setTempData({ ...tempData, snapshot_guest_name: e.target.value.toUpperCase() })}
          />
          <div className="grid grid-cols-2 gap-1">
            <input type="date" className="text-[9px] font-black border p-1" value={tempData.check_in} onChange={(e) => setTempData({ ...tempData, check_in: e.target.value })} />
            <input type="date" className="text-[9px] font-black border p-1" value={tempData.check_out} onChange={(e) => setTempData({ ...tempData, check_out: e.target.value })} />
          </div>
          <div className="flex gap-1 pt-1">
            <button onClick={handleSave} className="flex-1 bg-brand-secondary text-white text-[8px] font-black py-2 hover:bg-brand-primary uppercase">Save</button>
            <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className="flex-1 bg-slate-100 text-brand-muted text-[8px] font-black py-2 uppercase">Cancel</button>
          </div>
        </div>
      ) : (
        <div {...(isEditing || !isSelected ? {} : listeners)} {...(isEditing || !isSelected ? {} : attributes)} className={`${isSelected ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}>
          <div className="flex justify-between items-start">
            <div className="min-w-0">
               <p className="font-black text-[10px] text-brand-primary uppercase leading-tight truncate">
                {booking.snapshot_is_vip && '⭐ '}{booking.snapshot_guest_name || 'NO NAME'}
              </p>
              <p className="text-[9px] font-bold text-brand-muted uppercase truncate opacity-70">{booking.title}</p>
            </div>
            {!isOverlay && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="absolute top-2 right-2 text-[10px] p-1 bg-slate-50 border border-slate-200 hover:bg-brand-primary hover:text-white transition-colors"
              >✏️</button>
            )}
          </div>

          {!isSelected && (
            <p className="text-[8px] text-brand-muted font-bold uppercase mt-1 italic">Tıkla → Odaları Gör</p>
          )}

          <div className="flex justify-between mt-4 text-[9px] font-black text-brand-muted italic uppercase tracking-tighter">
            <span>📅 {new Date(booking.check_in || booking.start_time).toLocaleDateString('tr-TR')}</span>
            <span>{new Date(booking.check_out || booking.end_time).toLocaleDateString('tr-TR')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- ANA SAYFA ---
export default function AssignPage() {
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({});
  const [floorConfigs, setFloorConfigs] = useState<Record<string, { label: string; color: string }>>({});

  const roomCardRef = React.useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // 1. Atanmamış kayıtlar (/assigns endpoint'i backend'de room_id IS NULL olanları döner)

const { data: unassignedList = [], isLoading: listLoading } = useQuery({
  queryKey: ['unassignedBookings'],
  queryFn: async () => {
   
    
    try {
      const res = await axios.get('/bookings');
      const allData = res.data?.data || res.data || [];
      
      // Bugünün başlangıç saatini alalım (00:00:00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const filtered = allData.filter((booking: any) => {
        // 1. ODA KONTROLÜ: Odası yok mu?
        const isNoRoom = !booking.room_id || booking.room_id === null;
        
        // 2. DURUM KONTROLÜ: Status 'pending' mi?
        const currentStatus = String(booking.status || "").toLowerCase();
        const isPending = currentStatus === 'pending';
        
        // 3. TARİH KONTROLÜ: Gelecek veya bugün mü?
        // (check_in sütununa göre bakıyoruz)
        const bookingDate = new Date(booking.check_in || booking.start_time);
        const isFutureOrToday = bookingDate >= today;

        // Üç şart da sağlanmalı: (Odasız VEYA Pending) VE (Gelecek/Bugün)
        return (isNoRoom || isPending) && isFutureOrToday;
      });
      const roleOrder: Record<string, number> = {
  'vip': 0,
  'organiser': 1,
  'co-organiser': 2,
  'standard': 3,
};filtered.sort((a: any, b: any) => {
  // Önce VIP kontrolü
  const aIsVip = a.snapshot_is_vip ? 0 : 1;
  const bIsVip = b.snapshot_is_vip ? 0 : 1;
  if (aIsVip !== bIsVip) return aIsVip - bIsVip;

  // Sonra role göre sırala
  const aRole = String(a.snapshot_guest_role || a.role?.label || '').toLowerCase();
  const bRole = String(b.snapshot_guest_role || b.role?.label || '').toLowerCase();
  const aOrder = roleOrder[aRole] ?? 99;
  const bOrder = roleOrder[bRole] ?? 99;

  return aOrder - bOrder;
});

  
      return filtered;
    } catch (error) {
      console.error("Fetch Error:", error);
      throw error;
    }
  },
});

  // 2. Kat konfigürasyonları
useEffect(() => {
  let isMounted = true;

  getFloors().then((res: any) => {
    console.log("FLOORS API:", res); // ← EKLE
    if (!isMounted) return; // Bileşen kapandıysa state güncelleme

    const apiFloors = res.data || res || [];
    const configs: Record<string, { label: string; color: string }> = {};
    
    apiFloors.forEach((f: any) => {
      const key = f.key?.toUpperCase();
      if (key) {
        configs[key] = {
          label: f.label?.toUpperCase() || `${key} FLOOR`,
          color: f.bg_color_class || 'text-brand-muted',
        };
      }
    });

    // SADECE data gerçekten değiştiyse state güncelle (Sonsuz döngü koruması)
    setFloorConfigs(prev => {
      if (JSON.stringify(prev) === JSON.stringify(configs)) return prev;
      return configs;
    });
  }).catch(err => console.error("Floor loading error", err));

  return () => { isMounted = false; };
}, []);

  // 3. Müsait odaları ara (Update Edilmiş Mantık)
const searchRooms = async (booking: any) => {
  setIsSearching(true);
  setSelectedBooking(booking);
  setAvailableRooms([]);

  try {
    const startStr = (booking.check_in || booking.start_time).split('T')[0];
    const endStr = (booking.check_out || booking.end_time).split('T')[0];

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const response = await axios.get('/rooms/available-ranges', {
      params: { start_date: startStr, days: diffDays },
    });

    const rawData = response.data?.data || [];
    const filtered = rawData.map((item: any) => ({
      ...item.room,
      isAvailable: true
    }));

    setAvailableRooms(filtered);

    // ✅ İlk katı aç, diğerlerini kapat
    const prefixes = [...new Set(filtered.map((room: any) => room.name?.[0]?.toUpperCase() || 'F'))].sort() as string[];
    const newExpanded: Record<string, boolean> = {};
    prefixes.forEach((prefix, index) => {
      newExpanded[prefix] = index === 0;
    });
    setExpandedFloors(newExpanded);

  } catch (e) {
    console.error('Room analysis failed', e);
  } finally {
    setIsSearching(false);
  }
};
  // 4. Güncelleme (VIP ve isim alanları eklendi)

const updateMutation = useMutation({
  mutationFn: (vars: any) => {
    const { id, room_id, ...cleanData } = vars;
    return axios.patch(`/bookings/${id}`, cleanData);
  },
  onError: (error: any) => {
    console.error("UPDATE ERROR:", error.response?.data);
  },
  onSuccess: (res) => {
    queryClient.invalidateQueries({ queryKey: ['unassignedBookings'] });
    const updatedData = res.data?.data || res.data;
    if (updatedData) searchRooms(updatedData);
  },
});

  // 5. Atama (Drag & Drop) - TAMİR EDİLDİ
  const assignMutation = useMutation({
    mutationFn: async ({ 
      bookingId, 
      roomId, 
      checkIn, 
      checkOut 
    }: { 
      bookingId: number; 
      roomId: number; 
      checkIn: string; 
      checkOut: string; 
    }) => {
      const payload = {
        room_id: roomId,
        check_in: checkIn,
        check_out: checkOut,
        status: 'confirmed'
      };


      return axios.patch(`/bookings/${bookingId}`, payload);
    },
    onSuccess: () => {
      // Başarılı olunca listeyi yenile
      queryClient.invalidateQueries({ queryKey: ['unassignedBookings'] });
      setSelectedBooking(null); // Atanan kaydı ekrandan temizle
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || "Oda atanamadı.";
      alert("Hata: " + msg);
    }
  });
  // 5. Atama (Drag & Drop)

  // Odaları kata göre grupla
  const groupedRooms = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    availableRooms.forEach((room) => {
      const prefix = room.name?.[0]?.toUpperCase() || 'F';
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(room);
    });
    return groups;
  }, [availableRooms]);

  const getFloorColor = (prefix: string) => floorConfigs[prefix]?.color || 'text-brand-muted';
  const getFloorLabel = (prefix: string) => floorConfigs[prefix]?.label || `${prefix} FLOOR`;

const handleDragStart = (event: any) => {
  setActiveBooking(event.active.data.current);

  // Mevcut müsait odaların prefix'lerini (katlarını) al
  const prefixes = Object.keys(groupedRooms).sort();

  if (prefixes.length > 0) {
    const newExpanded: Record<string, boolean> = {};
    prefixes.forEach((prefix, index) => {
      // Sadece listenin en başındaki katı true, diğerlerini false yap
      newExpanded[prefix] = index === 0;
    });
    setExpandedFloors(newExpanded);
  }
};
const handleDragEnd = (event: any) => {
  const { active, over } = event;
  if (!over) {
    setActiveBooking(null);
    return;
  }

  const bookingId = parseInt(String(active.id).replace('booking-', ''));
  const roomId = parseInt(String(over.id).replace('room-', ''));
  const bookingData = active.data.current;

  if (!isNaN(bookingId) && !isNaN(roomId) && bookingData) {
    // 1. ADIM: Tarihleri JS Date objesine çevirip, yerel saate göre formatla
    const dIn = new Date(bookingData.check_in || bookingData.start_time);
    const dOut = new Date(bookingData.check_out || bookingData.end_time);

    // 2. ADIM: YYYY-MM-DD formatına manuel çevir (Timezone kaymasını önler)
    const formatDate = (date: Date) => {
      const offset = date.getTimezoneOffset();
      const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
      return adjustedDate.toISOString().split('T')[0];
    };

    const cleanCheckIn = formatDate(dIn);
    const cleanCheckOut = formatDate(dOut);

    assignMutation.mutate({ 
      bookingId, 
      roomId, 
      checkIn: cleanCheckIn, 
      checkOut: cleanCheckOut 
    });
  }
  setActiveBooking(null);
};

  // Auto-select ilk kart
// 312. satır civarındaki sorunlu yer
useEffect(() => {
  if (unassignedList.length > 0 && !selectedBooking && !isSearching) {
    // Sadece başlangıçta bir kez çalışması için kontrolü sıkılaştır
    searchRooms(unassignedList[0]);
  }
}, [unassignedList.length]); // unassignedList yerine .length kullanmak referans döngüsünü kırar.
  return (
    <>
      <style>{styles}</style>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-[calc(100vh-64px)] mt-16 bg-brand-surface text-brand-secondary font-brand overflow-hidden">
          
          {/* SOL PANEL (Pending) */}
          <div className="w-64 border-r-4 border-brand-secondary bg-white flex flex-col p-4 relative" style={{ zIndex: 20 }}>
            <div className="flex justify-between items-center border-b-4 border-brand-primary pb-2 mb-6 flex-shrink-0">
              <h2 className="font-black uppercase italic tracking-tighter text-xl">Pending</h2>
              <span className="bg-brand-secondary text-white text-[10px] px-2 py-0.5 font-bold">{unassignedList?.length || 0}</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
              {listLoading ? (
                <div className="py-10 text-center animate-pulse font-black text-[10px] uppercase">Syncing...</div>
              ) : (
                unassignedList.map((b: any) => (
                  <DraggableBooking
                    key={b.id}
                    booking={b}
                    isSelected={selectedBooking?.id === b.id}
                    onSelect={searchRooms}
                    onUpdate={(id: number, data: any) => updateMutation.mutate({ id, ...data })}
                  />
                ))
              )}
            </div>
          </div>

          {/* SAĞ PANEL (Rooms) */}
          <div className="flex-1 p-8 overflow-y-auto bg-[#F8FAFC] custom-scrollbar" style={{ zIndex: 10 }}>
            {selectedBooking ? (
              <div className="max-w-8xl mx-auto">
                <div className="mb-12 border-l-[12px] border-brand-primary pl-8">
                  <h2 className="text-6xl font-black uppercase italic leading-none mb-3 tracking-tighter text-brand-secondary">
                    {selectedBooking.snapshot_guest_name || selectedBooking.title}
                  </h2>
                  <p className="text-brand-primary font-black uppercase text-[10px] italic tracking-widest">
                    {selectedBooking.snapshot_is_vip ? '⭐ VIP GUEST - ' : ''} SELECT A ROOM BELOW
                  </p>
                </div>

                {isSearching ? (
                  <div className="py-32 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent mb-4" />
                    <p className="font-black text-brand-muted text-[11px] uppercase">Analyzing Availability...</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-20">
                    {Object.keys(groupedRooms).sort().map((prefix) => (
                      <FloorGroup
                        key={prefix}
                        label={getFloorLabel(prefix)}
                        color={getFloorColor(prefix)}
                        isOpen={!!expandedFloors[prefix]}
                        onToggle={() => setExpandedFloors(p => ({ ...p, [prefix]: !p[prefix] }))}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {groupedRooms[prefix].map((room: any, idx: number) => (
                            <div key={room.id} ref={idx === 0 ? roomCardRef : undefined}>
                               <DroppableRoom 
                                 room={room} 
                                 isPending={assignMutation.isPending} 
                                 floorColor={getFloorColor(prefix)} 
                               />
                            </div>
                          ))}
                        </div>
                      </FloorGroup>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-[0.03] select-none pointer-events-none">
                <span className="text-[250px] leading-none">🛎️</span>
                <p className="font-black uppercase italic text-7xl tracking-tighter">Ready for Duty</p>
              </div>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
          {activeBooking ? (
            <div style={{ width: roomCardRef.current?.getBoundingClientRect().width || '200px' }}>
              <DraggableBooking booking={activeBooking} isSelected={true} isOverlay={true} onSelect={() => {}} onUpdate={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

// --- DroppableRoom ve FloorGroup bileşenleri aynı kalabilir ---
function FloorGroup({ label, color, children, isOpen, onToggle }: any) {
  return (
    <div className="mb-4">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-2 bg-white border-2 border-brand-secondary">
        <span className={`font-black text-sm uppercase tracking-widest ${color}`}>{label}</span>
        <span className={`text-xs font-black transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
      </button>
      {isOpen && <div className="pt-3">{children}</div>}
    </div>
  );
}

function DroppableRoom({ room, isPending, floorColor }: any) {
  const { isOver, setNodeRef } = useDroppable({ id: `room-${room.id}` });
  return (
    <div ref={setNodeRef} className={`ini-card p-4 transition-all relative ${isOver ? 'bg-brand-primary/5 border-brand-primary' : 'border-brand-secondary'} ${isPending ? 'opacity-50' : ''}`}>
      <h3 className={`font-black text-lg ${floorColor} uppercase`}>{room.name}</h3>
      <p className="text-[10px] font-black uppercase">{room.capacity} Capacity</p>
      {isOver && <div className="absolute inset-0 flex items-center justify-center bg-brand-primary/10 font-black text-brand-primary text-[10px]">DROP!</div>}
    </div>
  );
}