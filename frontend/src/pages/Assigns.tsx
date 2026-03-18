import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../api/axios';
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

// Seçili kart için marching ants (hareketli kesikli border) animasyonu
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
`;

// --- BİLEŞEN: SÜRÜKLENEBİLİR VE SATIR İÇİ DÜZENLENEBİLİR KART ---
function DraggableBooking({ booking, isSelected, onUpdate, onSelect }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState({
    title: booking.title,
    start_time: booking.start_time.split('T')[0].split(' ')[0],
    end_time: booking.end_time.split('T')[0].split(' ')[0],
  });

  // FIX 1: Sadece seçili ve düzenleme modunda değilse sürükleme aktif
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `booking-${booking.id}`,
    data: booking,
    disabled: isEditing || !isSelected,
  });

  // FIX 2: disabled olduğunda boş obje ver — "unused variable" TS hatasını önler
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

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
        opacity: isDragging ? 0.6 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !isEditing && onSelect(booking)}
      className={`p-3 mb-3 transition-all bg-white relative overflow-hidden
        ${isSelected && !isEditing
          ? 'border-2 border-transparent shadow-[0_0_0_2px_#6366f1,6px_6px_0px_#000] bg-brand-primary/5 scale-[1.02]'
          : 'border-2 border-brand-secondary shadow-[4px_4px_0px_#000]'
        }
        ${isEditing ? '!border-brand-primary z-10 !scale-100' : ''}
        ${isDragging ? 'rotate-1 scale-105' : ''}`}
    >
      {/* Marching ants SVG border — sadece seçiliyse ve düzenleme yoksa */}
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
            onChange={(e) =>
              setTempData({ ...tempData, title: e.target.value.toUpperCase() })
            }
            autoFocus
          />
          <div className="grid grid-cols-2 gap-1">
            <input
              type="date"
              className="text-[9px] font-black border p-1"
              value={tempData.start_time}
              onChange={(e) =>
                setTempData({ ...tempData, start_time: e.target.value })
              }
            />
            <input
              type="date"
              className="text-[9px] font-black border p-1"
              value={tempData.end_time}
              onChange={(e) =>
                setTempData({ ...tempData, end_time: e.target.value })
              }
            />
          </div>
          <div className="flex gap-1 pt-1">
            <button
              onClick={handleSave}
              className="flex-1 bg-brand-secondary text-white text-[8px] font-black py-2 hover:bg-brand-primary uppercase"
            >
              Save
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(false);
              }}
              className="flex-1 bg-slate-100 text-brand-muted text-[8px] font-black py-2 uppercase"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // FIX 3: dragListeners ve dragAttributes kullan — seçili değilse boş gelir
        <div
          {...dragListeners}
          {...dragAttributes}
          className={`${isSelected ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
        >
          <div className="flex justify-between items-start">
            <p className="font-black text-xs uppercase leading-tight pr-8">
              {booking.title}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="absolute top-2 right-2 text-[10px] p-1 bg-slate-50 border border-slate-200 hover:bg-brand-primary hover:text-white transition-colors"
            >
              ✏️
            </button>
          </div>

          {/* FIX 4: Seçili değilse "tıkla" ipucu göster */}
          {!isSelected && (
            <p className="text-[8px] text-brand-muted font-bold uppercase mt-1 italic">
              Tıkla → Odaları Gör
            </p>
          )}

          <div className="flex justify-between mt-4 text-[9px] font-black text-brand-muted italic uppercase tracking-tighter">
            <span>
              📅 {new Date(booking.start_time).toLocaleDateString('tr-TR')}
            </span>
            <span>{new Date(booking.end_time).toLocaleDateString('tr-TR')}</span>
          </div>

          {/* FIX 5: Seçiliyse "sürükle" ipucu göster */}
          {isSelected && (
            <p className="text-[8px] text-brand-primary font-black uppercase mt-2 italic animate-pulse">
              ↕ Sürükle → Odaya Bırak
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- BİLEŞEN: HEDEF ODA KARTI ---
function DroppableRoom({ room, isPending }: any) {
  const { isOver, setNodeRef } = useDroppable({ id: `room-${room.id}` });

  return (
    <div
      ref={setNodeRef}
      className={`relative p-3 border-4 transition-all shadow-[8px_8px_0px_#000] flex flex-col items-center justify-center min-h-[90px]
        ${isOver
          ? 'bg-brand-primary border-black scale-105 shadow-none text-white'
          : 'bg-white border-brand-secondary'
        }`}
    >
      <span className="block font-black text-3xl uppercase italic text-center leading-none">
        {room.name}
      </span>
      <div
        className={`mt-3 px-3 py-1 rounded-full ${
          isOver ? 'bg-black/20' : 'bg-brand-surface'
        }`}
      >
        <span
          className={`text-[9px] font-black uppercase ${
            isOver ? 'text-white' : 'text-brand-muted'
          }`}
        >
          CAPACITY: {room.capacity}
        </span>
      </div>
      {isPending && (
        <div className="absolute top-2 right-2 animate-spin text-xs">⌛</div>
      )}
    </div>
  );
}

// --- ANA SAYFA ---
export default function AssignPage() {
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // 1. Veri: Atanmamış Kayıtlar
  const { data: unassignedList = [], isLoading: listLoading } = useQuery({
    queryKey: ['unassignedBookings'],
    queryFn: () => axios.get('/assigns').then((res) => res.data),
  });

  // 2. Müsait Odaları Ara
  const searchRooms = async (booking: any) => {
    setIsSearching(true);
    setSelectedBooking(booking);
    try {
      const start = booking.start_time.split('T')[0].split(' ')[0];
      const end = booking.end_time.split('T')[0].split(' ')[0];
      const diffDays = Math.max(
        1,
        Math.ceil(
          Math.abs(
            new Date(end).getTime() - new Date(start).getTime()
          ) /
            (1000 * 60 * 60 * 24)
        )
      );

      const response = await axios.get('/rooms/available-ranges', {
        params: { start_date: start, days: diffDays },
      });

      const rawData = response.data?.data || response.data || [];
      const filtered = Array.isArray(rawData)
        ? rawData
            .map((item: any) => ({
              ...item.room,
              isAvailable: item.ranges?.length > 0,
            }))
            .filter((r: any) => r.isAvailable && r.name !== 'Unassigned')
        : [];

      setAvailableRooms(filtered);
    } catch (e) {
      console.error('Room analysis failed', e);
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Güncelleme (Inline Edit)
  const updateMutation = useMutation({
    mutationFn: (vars: any) => axios.patch(`/bookings/${vars.id}`, vars),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['unassignedBookings'] });
      const updatedData = res.data?.data || res.data;
      if (updatedData) searchRooms(updatedData);
    },
    onError: (err: any) =>
      console.log('Validasyon Hatası:', err.response?.data?.errors),
  });

  // 4. Atama (Sürükle-Bırak)
  const assignMutation = useMutation({
    // FIX 6: booking'i direkt parametre olarak al, selectedBooking'e bağımlılık yok
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

  // FIX 7: handleDragEnd — active.data.current'tan booking al, race condition yok
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || !active) return;

    const booking = active.data.current;
    const roomId = Number(over.id.toString().replace('room-', ''));

    if (booking && roomId) {
      assignMutation.mutate({ booking, roomId });
    }
  };

  // Auto-select: liste yüklenince ilk kartı seç, liste boşalınca sağı temizle ee
  useEffect(() => {
    if (unassignedList.length === 0) {
      setSelectedBooking(null);
      setAvailableRooms([]);
    } else if (!selectedBooking) {
      searchRooms(unassignedList[0]);
    }
  }, [unassignedList]);

  return (
    <>
    <style>{styles}</style>
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100vh-64px)] mt-16 bg-brand-surface overflow-hidden text-brand-secondary font-brand">

        {/* SOL: BEKLEYEN LİSTESİ */}
        <div className="w-1/5 border-r-4 border-brand-secondary bg-white flex flex-col overflow-hidden p-4">
          {/* Header — sabit */}
          <div className="flex justify-between items-center border-b-4 border-brand-primary pb-2 mb-6 flex-shrink-0">
            <h2 className="font-black uppercase italic tracking-tighter text-xl">
              Pending
            </h2>
            <span className="bg-brand-secondary text-white text-[10px] px-2 py-0.5 font-bold tabular-nums">
              {unassignedList?.length || 0}
            </span>
          </div>

          {/* Liste — sadece burası scroll */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {listLoading ? (
              <div className="py-10 text-center animate-pulse font-black text-[10px] uppercase">
                Syncing...
              </div>
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
                  onUpdate={(id: number, data: any) =>
                    updateMutation.mutate({ id, ...data })
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* SAĞ: ODA ANALİZİ */}
        <div className="flex-1 p-8 overflow-y-auto bg-[#F8FAFC]">
          {selectedBooking ? (
            <div className="max-w-6xl mx-auto">
              <div className="mb-12 border-l-[12px] border-brand-primary pl-8">
                <h2 className="text-6xl font-black uppercase italic leading-none mb-3 tracking-tighter text-brand-secondary">
                  {selectedBooking.title}
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-white border-2 border-brand-secondary px-3 py-1 shadow-[4px_4px_0px_#000]">
                    <span className="text-[11px] font-black uppercase">
                      {new Date(selectedBooking.start_time).toLocaleDateString('tr-TR')}{' '}
                      ➔{' '}
                      {new Date(selectedBooking.end_time).toLocaleDateString('tr-TR')}
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
                  <p className="font-black text-brand-muted text-[11px] tracking-[0.4em] uppercase">
                    Calculating Optimal Slots...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-8 pb-20">
                  {availableRooms.map((room) => (
                    <DroppableRoom
                      key={room.id}
                      room={room}
                      isPending={assignMutation.isPending}
                    />
                  ))}
                  {availableRooms.length === 0 && (
                    <div className="col-span-full py-24 border-4 border-dashed border-slate-200 bg-slate-50 text-center rounded-xl">
                      <p className="font-black text-slate-400 uppercase italic text-lg mb-2 tracking-tight">
                        Full House! No Vacancy
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        Try adjusting dates in the left panel
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-[0.03] select-none pointer-events-none">
              <span className="text-[250px] leading-none">🛎️</span>
              <p className="font-black uppercase italic text-7xl tracking-tighter">
                Ready for Duty
              </p>
            </div>
          )}
        </div>
      </div>
    </DndContext>
    </>
  );
}
