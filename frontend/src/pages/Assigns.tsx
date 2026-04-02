import React, { useState, useEffect, useMemo } from 'react';
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
} from '@dnd-kit/core';

// --- STYLES ---
const styles = `
  @keyframes marchingAnts { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -40; } }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
`;

const roleOrder: Record<string, number> = { 'vip': 0, 'organiser': 1, 'co-organiser': 2, 'standard': 3 };

// --- YARDIMCI FONKSİYONLAR ---
const getTime = (dateStr: string) => {
  if (!dateStr) return '--:--';
  try {
    const parts = dateStr.split(' ');
    if (parts.length > 1) {
      return parts[1].substring(0, 5); 
    }
    const tParts = dateStr.split('T');
    if (tParts.length > 1) {
      return tParts[1].substring(0, 5);
    }
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) {
    return '--:--';
  }
};

const getDate = (d: string) => d ? new Date(d).toLocaleDateString([], { day: '2-digit', month: 'short' }).toUpperCase() : '-- ---';

// --- 1. BİLEŞEN: DRAGGABLE BOOKING ---
function DraggableBooking({ booking, isSelected, onSelect, isOverlay = false, updateDateTimeMutation }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ check_in_date: '', check_in_time: '', check_out_date: '', check_out_time: '' });

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `booking-${booking.id}`,
    data: booking,
    disabled: !isSelected || isEditing, // 🚀 Düzenleme yaparken kartın sürüklenmesini engelliyoruz
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isOverlay ? 9999 : 100,
  } : undefined;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null); // Seçili odayı temizle
    
    const inDate = (booking.check_in || booking.start_time).split(' ')[0].split('T')[0];
    const outDate = (booking.check_out || booking.end_time).split(' ')[0].split('T')[0];
    const inTime = getTime(booking.check_in || booking.start_time);
    const outTime = getTime(booking.check_out || booking.end_time);

    setEditForm({
      check_in_date: inDate,
      check_in_time: ['08:30', '12:30'].includes(inTime) ? inTime : '08:30',
      check_out_date: outDate,
      check_out_time: ['12:15', '17:00'].includes(outTime) ? outTime : '12:15'
    });
    setIsEditing(true);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const finalIn = `${editForm.check_in_date}T${editForm.check_in_time}:00Z`;
    const finalOut = `${editForm.check_out_date}T${editForm.check_out_time}:00Z`;
    
    updateDateTimeMutation.mutate({
      bookingId: booking.id,
      data: { check_in: finalIn, check_out: finalOut }
    }, {
      onSuccess: () => setIsEditing(false)
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isSelected && !isEditing ? listeners : {})} 
      {...(isSelected && !isEditing ? attributes : {})}
      onClick={() => !isOverlay && !isEditing && onSelect(booking)}
      className={`p-3 mb-2 rounded border-2 transition-all relative bg-white select-none touch-none group
        ${isSelected ? 'border-indigo-600 shadow-[4px_4px_0px_#000] scale-[1.02]' : 'border-slate-200 hover:border-indigo-300'}
        ${isDragging && !isOverlay ? 'opacity-0' : 'opacity-100'} 
        ${isOverlay ? 'rotate-2 shadow-2xl border-indigo-600' : ''}
      `}
    >
      {/* Üst Kısım: İsim ve VIP Durumu + Düzenleme Butonu */}
      <div className="flex items-start justify-between mb-2">
        <p className="font-black text-[11px] uppercase truncate text-slate-800 pointer-events-none">
          {booking.snapshot_is_vip && <span className="text-yellow-500 mr-1">⭐</span>}
          {booking.snapshot_guest_name || 'NO NAME'}
        </p>

        {!isOverlay && (
          <button
            onClick={isEditing ? (e) => { e.stopPropagation(); setIsEditing(false); } : handleEditClick}
            className="text-slate-400 hover:text-indigo-600 transition-colors p-1 text-xs"
          >
            {isEditing ? '❌' : '✏️'}
          </button>
        )}
      </div>

      {isEditing ? (
        // 🚀 KART İÇİ DÜZENLEME FORMU
        <div className="space-y-3 bg-slate-50 p-2 rounded-md border border-slate-200">
          {/* CHECK-IN */}
          <div>
            <label className="text-[8px] font-black uppercase text-slate-500">Check-In</label>
            <div className="flex gap-1 mt-0.5">
              <input 
                type="date" 
                value={editForm.check_in_date} 
                onChange={(e) => setEditForm(p => ({ ...p, check_in_date: e.target.value }))}
                className="border border-slate-300 rounded p-0.5 text-[10px] font-bold w-full focus:border-indigo-600 outline-none" 
              />
              <select 
                value={editForm.check_in_time} 
                onChange={(e) => setEditForm(p => ({ ...p, check_in_time: e.target.value }))}
                className="border border-slate-300 rounded p-0.5 text-[10px] font-bold w-20 focus:border-indigo-600 outline-none bg-white"
              >
                <option value="08:30">08:30</option>
                <option value="12:30">12:30</option>
              </select>
            </div>
          </div>

          {/* CHECK-OUT */}
          <div>
            <label className="text-[8px] font-black uppercase text-slate-500">Check-Out</label>
            <div className="flex gap-1 mt-0.5">
              <input 
                type="date" 
                value={editForm.check_out_date} 
                onChange={(e) => setEditForm(p => ({ ...p, check_out_date: e.target.value }))}
                className="border border-slate-300 rounded p-0.5 text-[10px] font-bold w-full focus:border-indigo-600 outline-none" 
              />
              <select 
                value={editForm.check_out_time} 
                onChange={(e) => setEditForm(p => ({ ...p, check_out_time: e.target.value }))}
                className="border border-slate-300 rounded p-0.5 text-[10px] font-bold w-20 focus:border-indigo-600 outline-none bg-white"
              >
                <option value="12:15">12:15</option>
                <option value="17:00">17:00</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={updateDateTimeMutation.isPending}
            className="w-full py-1 bg-indigo-600 text-white border border-black shadow-[2px_2px_0px_#000] font-black text-[9px] uppercase hover:shadow-none transition-all disabled:opacity-50"
          >
            {updateDateTimeMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      ) : (
        // NORMAL GÖRÜNÜM (ESKİ HALİ)
        <div className="flex items-center justify-between bg-slate-50 rounded-md p-2 border border-slate-100">
          <div className="flex flex-col items-start">
            <span className="text-[7px] font-black text-indigo-400 uppercase tracking-tighter">Check-In</span>
            <span className="text-[11px] font-black text-indigo-700 leading-tight">{getTime(booking.check_in || booking.start_time)}</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase leading-tight">{getDate(booking.check_in || booking.start_time)}</span>
          </div>
          <div className="flex flex-col items-center px-1">
             <span className="text-slate-300 text-[10px]">→</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Check-Out</span>
            <span className="text-[11px] font-black text-slate-700 leading-tight">{getTime(booking.check_out || booking.end_time)}</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase leading-tight">{getDate(booking.check_out || booking.end_time)}</span>
          </div>
        </div>
      )}

      <p className="text-[8px] mt-2 font-bold text-slate-400 uppercase truncate italic pointer-events-none tracking-tight">
        {booking.title || 'General Booking'}
      </p>
    </div>
  );
}

// --- 2. BİLEŞEN: DROPPABLE ROOM ---
function DroppableRoom({ room, isPending, floorColor }: any) {
  const { isOver, setNodeRef } = useDroppable({ id: `room-${room.id}`, data: room });
  return (
    <div ref={setNodeRef} className={`p-3 rounded border-2 transition-all relative min-h-[80px] flex flex-col justify-center ${isOver ? 'bg-indigo-50 border-indigo-600 scale-105 shadow-lg' : 'border-slate-200 bg-white'} ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
      <h3 className={`font-black text-sm text-center ${floorColor} uppercase`}>{room.name}</h3>
      <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-tighter">Cap: {room.capacity}</p>
    </div>
  );
}

// --- 3. BİLEŞEN: FLOOR GROUP ---
function FloorGroup({ label, color, children, isOpen, onToggle }: any) {
  return (
    <div className="mb-4">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-black shadow-[4px_4px_0px_#f1f5f9] hover:shadow-none transition-all">
        <span className={`font-black text-xs uppercase tracking-widest ${color}`}>{label}</span>
        <span className={`text-xs font-black transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {isOpen && <div className="pt-4 px-2">{children}</div>}
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // 1. DATA FETCH
  const { data: unassignedList = [], isLoading: listLoading } = useQuery({
    queryKey: ['unassignedBookings'],
    queryFn: async () => {
      const res = await axios.get('/bookings?status=pending');
      const allData = res.data?.data || res.data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return allData.filter((b: any) => {
        const isNoRoom = !b.room_id;
        const isPending = String(b.status || "").toLowerCase() === 'pending';
        const bDate = new Date(b.check_in || b.start_time);
        return (isNoRoom || isPending) && bDate >= today;
      }).sort((a: any, b: any) => {
        if (a.snapshot_is_vip !== b.snapshot_is_vip) return a.snapshot_is_vip ? -1 : 1;
        return (roleOrder[a.snapshot_guest_role] ?? 99) - (roleOrder[b.snapshot_guest_role] ?? 99);
      });
    },
  });

  // 2. ASSIGN MUTATION
  const assignMutation = useMutation({
    mutationFn: async (payload: any) => axios.patch(`/bookings/${payload.bookingId}`, payload.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['unassignedBookings'] });
      setSelectedBooking(null);
      setAvailableRooms([]);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Hata oluştu")
  });

  // 3. EDIT DATE/TIME MUTATION (Prop olarak karta gönderiyoruz)
  const updateDateTimeMutation = useMutation({
    mutationFn: async (payload: any) => axios.patch(`/bookings/${payload.bookingId}`, payload.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['unassignedBookings'] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Tarih güncellenirken hata oluştu")
  });

  // 4. SEARCH ROOMS
  const searchRooms = async (booking: any) => {
    if (!booking) return;
    setSelectedBooking(booking);
    setIsSearching(true);
    try {
      const start = booking.check_in || booking.start_time;
      const end = booking.check_out || booking.end_time;
      const diff = Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
      const res = await axios.get(`/rooms/available-ranges`, {
        params: { start_date: start.split(' ')[0].split('T')[0], days: diff }
      });
      const mapped = (res.data?.data || []).map((item: any) => ({ ...item.room }));
      setAvailableRooms(mapped);
      if (mapped.length > 0) {
        setExpandedFloors({ [String(mapped[0].name)[0].toUpperCase()]: true });
      }
    } catch (err) { console.error(err); } finally { setIsSearching(false); }
  };

  // 5. HANDLE DRAG END
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveBooking(null);
    if (!over) return;

    const bookingData = active.data.current;
    const roomData = over.data.current;

    if (bookingData && roomData) {
      const formatDate = (d: string) => new Date(d).toISOString().split('T')[0];
      assignMutation.mutate({
        bookingId: bookingData.id,
        data: {
          room_id: roomData.id,
          check_in: formatDate(bookingData.check_in || bookingData.start_time),
          check_out: formatDate(bookingData.check_out || bookingData.end_time),
          status: 'confirmed'
        }
      });
    }
  };

  useEffect(() => {
    getFloors().then((res: any) => {
      const apiData = res.data || res || [];
      const configs: Record<string, { label: string; color: string }> = {};
      apiData.forEach((f: any) => {
        if (f.key) {
          configs[f.key.toUpperCase()] = {
            label: f.label?.toUpperCase() || `${f.key} FLOOR`,
            color: f.bg_color_class || 'text-slate-600',
          };
        }
      });
      setFloorConfigs(configs);
    });
  }, []);

  const groupedRooms = useMemo(() => {
    const groups: Record<string, any[]> = {};
    availableRooms.forEach(r => {
      const p = r.name?.[0]?.toUpperCase() || 'F';
      if (!groups[p]) groups[p] = [];
      groups[p].push(r);
    });
    return groups;
  }, [availableRooms]);

  return (
    <>
      <style>{styles}</style>
      <DndContext sensors={sensors} onDragStart={(e) => setActiveBooking(e.active.current?.data?.current || e.active.data.current)} onDragEnd={handleDragEnd}>
        <div className="flex h-[calc(100vh-64px)] mt-16 bg-slate-50 font-sans overflow-hidden">
          
          {/* SOL PANEL */}
          <div className="w-72 border-r-2 border-black bg-white flex flex-col p-4 shadow-xl z-20">
            <h2 className="font-black uppercase italic tracking-tighter text-xl mb-4 border-b-4 border-indigo-600 pb-2">Pending</h2>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              {listLoading ? <div className="text-center py-10 animate-pulse font-black text-xs uppercase">Syncing...</div> :
                unassignedList.map((b: any) => (
                  <DraggableBooking 
                    key={b.id} 
                    booking={b} 
                    isSelected={selectedBooking?.id === b.id} 
                    onSelect={searchRooms} 
                    updateDateTimeMutation={updateDateTimeMutation}
                  />
                ))
              }
            </div>
          </div>

          {/* SAĞ PANEL */}
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50 custom-scrollbar z-10">
            {selectedBooking ? (
              <div className="max-w-7xl mx-auto">
                <div className="mb-10 border-l-[10px] border-indigo-600 pl-6">
                  <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-800">{selectedBooking.snapshot_guest_name || 'GUEST'}</h2>
                  <p className="text-indigo-600 font-black uppercase text-[10px] tracking-widest mt-1">
                    {selectedBooking.snapshot_is_vip && '⭐ VIP - '} DRAG TO ASSIGN ROOM
                  </p>
                </div>

                {isSearching ? (
                  <div className="py-20 text-center font-black text-slate-300 uppercase animate-pulse italic">Scanning Floors...</div>
                ) : (
                  <div className="space-y-4 pb-20">
                    {Object.keys(groupedRooms).sort().map(prefix => (
                      <FloorGroup
                        key={prefix}
                        label={floorConfigs[prefix]?.label || `${prefix} FLOOR`}
                        color={floorConfigs[prefix]?.color || 'text-slate-600'}
                        isOpen={!!expandedFloors[prefix]}
                        onToggle={() => setExpandedFloors(p => ({ ...p, [prefix]: !p[prefix] }))}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {groupedRooms[prefix].map((room: any) => (
                            <DroppableRoom key={room.id} room={room} isPending={assignMutation.isPending} floorColor={floorConfigs[prefix]?.color} />
                          ))}
                        </div>
                      </FloorGroup>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-10 select-none grayscale">
                <span className="text-[150px]">🛎️</span>
                <p className="font-black uppercase italic text-6xl tracking-tighter">Select Guest</p>
              </div>
            )}
          </div>
        </div>

        {/* DRAG OVERLAY */}
        <DragOverlay adjustScale={true}>
          {activeBooking ? (
            <div className="w-64">
              <DraggableBooking booking={activeBooking} isSelected={true} isOverlay={true} onSelect={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}