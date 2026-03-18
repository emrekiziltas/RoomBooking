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

// --- STYLES ---
const styles = `
  @keyframes marchingAnts {
    0%   { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: -40; }
  }
  .marching-ants-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
  }
  .marching-ants-svg rect {
    fill: none;
    stroke: var(--color-brand-primary, #6366f1);
    stroke-width: 2.5;
    stroke-dasharray: 10 6;
    animation: marchingAnts 0.6s linear infinite;
  }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
`;

// --- BİLEŞEN: SÜRÜKLENEBİLİR KART ---
function DraggableBooking({ booking, isSelected, onUpdate, onSelect, isOverlay = false }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState({
    title: booking.title,
    start_time: booking.start_time.split('T')[0].split(' ')[0],
    end_time: booking.end_time.split('T')[0].split(' ')[0],
  });

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `booking-${booking.id}`,
    data: booking,
    disabled: isEditing || !isSelected,
  });

  const dragListeners = isEditing || !isSelected ? {} : listeners;
  const dragAttributes = isEditing || !isSelected ? {} : attributes;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const payload = {
      ...tempData,
      start_time: `${tempData.start_time} 08:30:00`,
      end_time: `${tempData.end_time} 17:30:00`,
    };
    await onUpdate(booking.id, payload);
    setIsEditing(false);
  };

  // Overlay modunda transform dnd-kit tarafından yönetilir
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
            value={tempData.title}
            onChange={(e) => setTempData({ ...tempData, title: e.target.value.toUpperCase() })}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-1">
            <input type="date" className="text-[9px] font-black border p-1" value={tempData.start_time} onChange={(e) => setTempData({ ...tempData, start_time: e.target.value })} />
            <input type="date" className="text-[9px] font-black border p-1" value={tempData.end_time} onChange={(e) => setTempData({ ...tempData, end_time: e.target.value })} />
          </div>
          <div className="flex gap-1 pt-1">
            <button onClick={handleSave} className="flex-1 bg-brand-secondary text-white text-[8px] font-black py-2 hover:bg-brand-primary uppercase">Save</button>
            <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className="flex-1 bg-slate-100 text-brand-muted text-[8px] font-black py-2 uppercase">Cancel</button>
          </div>
        </div>
      ) : (
        <div {...dragListeners} {...dragAttributes} className={`${isSelected ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}>
          <div className="flex justify-between items-start">
            <p className="font-black text-xs uppercase leading-tight pr-8">{booking.title}</p>
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
            <span>📅 {new Date(booking.start_time).toLocaleDateString('tr-TR')}</span>
            <span>{new Date(booking.end_time).toLocaleDateString('tr-TR')}</span>
          </div>

          {isSelected && !isOverlay && (
            <p className="text-[8px] text-brand-primary font-black uppercase mt-2 italic animate-pulse">↕ Sürükle → Odaya Bırak</p>
          )}
        </div>
      )}
    </div>
  );
}

// --- BİLEŞEN: KAT GRUBU ---
function FloorGroup({ label, color, children, isOpen, onToggle }: {
  label: string; color: string; children: React.ReactNode;
  isOpen: boolean; onToggle: () => void;
}) {
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 bg-white border-2 border-brand-secondary hover:border-brand-primary transition-colors"
      >
        <span className={`font-black text-sm uppercase tracking-widest ${color}`}>{label}</span>
        <span className={`text-xs font-black transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} text-brand-muted`}>›</span>
      </button>
      {isOpen && <div className="pt-3">{children}</div>}
    </div>
  );
}

// --- BİLEŞEN: HEDEF ODA ---
function DroppableRoom({ room, isPending, floorColor }: any) {
  const { isOver, setNodeRef } = useDroppable({ id: `room-${room.id}` });

  return (
    <div
      ref={setNodeRef}
      className={`ini-card p-4 transition-all relative overflow-hidden cursor-default group
        ${isOver ? '!border-brand-primary bg-brand-primary/5 scale-[1.02] shadow-none' : 'border-brand-secondary'}
        ${isPending ? 'opacity-60' : ''}`}
    >
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-primary/10 z-10 pointer-events-none">
          <span className="text-brand-primary font-black text-[10px] uppercase tracking-widest animate-pulse">Bırak!</span>
        </div>
      )}
      <h3 className={`font-black text-lg ${floorColor} uppercase tracking-tighter leading-none mb-2`}>{room.name}</h3>
      <div className="space-y-1">
        <span className="text-[10px] font-black text-brand-secondary uppercase">{room.capacity} Desks</span>
      </div>
      <div className="mt-4 pt-3 border-t border-brand-surface flex justify-between items-center text-brand-muted group-hover:text-brand-primary transition-colors">
        <span className="text-[8px] font-black uppercase tracking-widest">Drop Here</span>
        <span className="text-xs">↓</span>
      </div>
      {isPending && <div className="absolute top-2 right-2 animate-spin text-xs">⌛</div>}
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

  const leftPanelRef = React.useRef<HTMLDivElement>(null);
  const roomCardRef = React.useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // 1. Atanmamış kayıtlar
  const { data: unassignedList = [], isLoading: listLoading } = useQuery({
    queryKey: ['unassignedBookings'],
    queryFn: () => axios.get('/assigns').then((res) => res.data),
  });

  // 2. Kat konfigürasyonlarını DB'den çek
  useEffect(() => {
    getFloors().then((res: any) => {
      const apiFloors = res.data || res || [];
      const configs: Record<string, { label: string; color: string }> = {};
      apiFloors.forEach((f: any) => {
        const key = f.key?.toUpperCase();
        if (key) configs[key] = {
          label: f.label?.toUpperCase() || `${key} FLOOR`,
          color: f.bg_color_class || 'text-brand-muted',
        };
      });
      setFloorConfigs(configs);
    }).catch(() => {});
  }, []);

  // 3. Müsait odaları ara
  const searchRooms = async (booking: any) => {
    setIsSearching(true);
    setSelectedBooking(booking);
    try {
      const start = booking.start_time.split('T')[0].split(' ')[0];
      const end = booking.end_time.split('T')[0].split(' ')[0];
      const diffDays = Math.max(1, Math.ceil(
        Math.abs(new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
      ));
      const response = await axios.get('/rooms/available-ranges', {
        params: { start_date: start, days: diffDays },
      });
      const rawData = response.data?.data || response.data || [];
      const filtered = Array.isArray(rawData)
        ? rawData.map((item: any) => ({ ...item.room, isAvailable: item.ranges?.length > 0 }))
                 .filter((r: any) => r.isAvailable && r.name !== 'Unassigned')
        : [];
      setAvailableRooms(filtered);
    } catch (e) {
      console.error('Room analysis failed', e);
    } finally {
      setIsSearching(false);
    }
  };

  // 4. Güncelleme (inline edit)
  const updateMutation = useMutation({
    mutationFn: (vars: any) => axios.patch(`/bookings/${vars.id}`, vars),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['unassignedBookings'] });
      const updatedData = res.data?.data || res.data;
      if (updatedData) searchRooms(updatedData);
    },
    onError: (err: any) => console.log('Validasyon Hatası:', err.response?.data?.errors),
  });

  // 5. Atama (drag & drop)
  const assignMutation = useMutation({
    mutationFn: ({ booking, roomId }: { booking: any; roomId: number }) =>
      axios.patch(`/bookings/${booking.id}`, {
        room_id: roomId,
        title: booking.title,
        start_time: booking.start_time,
        end_time: booking.end_time,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unassignedBookings'] });
      setSelectedBooking(null);
      setAvailableRooms([]);
    },
  });

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

  // Odalar yüklenince ilk floor'u aç
  useEffect(() => {
    const keys = Object.keys(groupedRooms).sort();
    if (keys.length > 0) {
      setExpandedFloors(prev => {
        const hasAnyOpen = keys.some(k => prev[k]);
        return hasAnyOpen ? prev : { [keys[0]]: true };
      });
    }
  }, [groupedRooms]);

  // Auto-select: liste yüklenince ilk kartı seç, boşalınca sağı temizle
  useEffect(() => {
    if (unassignedList.length === 0) {
      setSelectedBooking(null);
      setAvailableRooms([]);
    } else if (!selectedBooking) {
      searchRooms(unassignedList[0]);
    }
  }, [unassignedList]);

  // DND handlers
  const handleDragStart = (event: any) => {
    setActiveBooking(event.active.data.current);
    // Drag başlayınca tüm floor'ları aç — kapalı drop zone'a bırakma sorununu önler
    const allOpen: Record<string, boolean> = {};
    Object.keys(groupedRooms).forEach(k => { allOpen[k] = true; });
    setExpandedFloors(allOpen);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveBooking(null);
    if (!over || !active) return;
    const booking = active.data.current;
    const roomId = Number(over.id.toString().replace('room-', ''));
    if (booking && roomId) {
      assignMutation.mutate({ booking, roomId });
    }
  };

  return (
    <>
      <style>{styles}</style>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-[calc(100vh-64px)] mt-16 bg-brand-surface text-brand-secondary font-brand overflow-hidden">

          {/* SOL: BEKLEYEN LİSTESİ */}
          <div ref={leftPanelRef} className="w-1/4 border-r-4 border-brand-secondary bg-white flex flex-col p-4 relative" style={{ zIndex: 20 }}>
            <div className="flex justify-between items-center border-b-4 border-brand-primary pb-2 mb-6 flex-shrink-0">
              <h2 className="font-black uppercase italic tracking-tighter text-xl">Pending</h2>
              <span className="bg-brand-secondary text-white text-[10px] px-2 py-0.5 font-bold tabular-nums">
                {unassignedList?.length || 0}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-clip custom-scrollbar space-y-1 pr-1">
              {listLoading ? (
                <div className="py-10 text-center animate-pulse font-black text-[10px] uppercase">Syncing...</div>
              ) : unassignedList.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-black text-slate-300 uppercase italic text-sm">All Clear!</p>
                  <p className="text-[9px] text-slate-300 font-bold uppercase mt-1">No pending bookings</p>
                </div>
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

          {/* SAĞ: ODA ANALİZİ */}
          <div className="flex-1 p-8 overflow-y-auto bg-[#F8FAFC] custom-scrollbar" style={{ zIndex: 10 }}>
            {selectedBooking ? (
              <div className="max-w-6xl mx-auto">
                <div className="mb-12 border-l-[12px] border-brand-primary pl-8">
                  <h2 className="text-6xl font-black uppercase italic leading-none mb-3 tracking-tighter text-brand-secondary">
                    {selectedBooking.title}
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white border-2 border-brand-secondary px-3 py-1 shadow-[4px_4px_0px_#000]">
                      <span className="text-[11px] font-black uppercase">
                        {new Date(selectedBooking.start_time).toLocaleDateString('tr-TR')} ➔ {new Date(selectedBooking.end_time).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <p className="text-brand-primary font-black uppercase text-[10px] italic tracking-widest animate-pulse">
                      Sürükle → Odaya Bırak
                    </p>
                  </div>
                </div>

                {isSearching ? (
                  <div className="py-32 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent mb-4" />
                    <p className="font-black text-brand-muted text-[11px] tracking-[0.4em] uppercase">Calculating Optimal Slots...</p>
                  </div>
                ) : availableRooms.length === 0 ? (
                  <div className="py-24 border-4 border-dashed border-slate-200 bg-slate-50 text-center rounded-xl">
                    <p className="font-black text-slate-400 uppercase italic text-lg mb-2 tracking-tight">Full House! No Vacancy</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Try adjusting dates in the left panel</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-20">
                    {Object.keys(groupedRooms).sort().map((prefix) => {
                      const floorRooms = groupedRooms[prefix] || [];
                      if (floorRooms.length === 0) return null;
                      const floorLabel = getFloorLabel(prefix);
                      const floorColor = getFloorColor(prefix);
                      return (
                        <FloorGroup
                          key={prefix}
                          label={floorLabel}
                          color={floorColor}
                          isOpen={!!expandedFloors[prefix]}
                          onToggle={() => setExpandedFloors(p => ({ ...p, [prefix]: !p[prefix] }))}
                        >
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {floorRooms.map((room: any, index: number) => (
                              <div key={room.id} ref={index === 0 ? roomCardRef : undefined}>
                                <DroppableRoom
                                  room={room}
                                  isPending={assignMutation.isPending}
                                  floorColor={floorColor}
                                />
                              </div>
                            ))}
                          </div>
                        </FloorGroup>
                      );
                    })}
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

        {/* DragOverlay — room kartıyla aynı boyutta */}
        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
          }}
        >
          {activeBooking ? (() => {
            const rect = roomCardRef.current?.getBoundingClientRect();
            return (
              <div style={{
                width: rect ? `${rect.width}px` : '200px',
                height: rect ? `${rect.height}px` : 'auto',
                overflow: 'hidden',
              }}>
                <DraggableBooking
                  booking={activeBooking}
                  isSelected={true}
                  isOverlay={true}
                  onSelect={() => {}}
                  onUpdate={() => {}}
                />
              </div>
            );
          })() : null}
        </DragOverlay>

      </DndContext>
    </>
  );
}
