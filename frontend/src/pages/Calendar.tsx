import { useEffect, useState, Fragment, useMemo, useRef } from 'react';
import { getRooms, getFloors } from '../api/rooms';
import { getBookings, updateBooking, deleteBooking, moveBooking } from '../api/bookings';
import { NewBookingForm } from '../components/NewBookingForm';
import { EditBookingModal } from '../components/EditBookingModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import type { Room, Booking } from '../types/index';

const normalizeDate = (dateInput: any): number => {
  if (!dateInput) return 0;
  let d: Date;
  if (dateInput instanceof Date) {
    d = dateInput;
  } else {
    const cleaned = String(dateInput).replace(' ', 'T').replace(/\.\d+/, '');
    d = new Date(cleaned);
  }
  if (isNaN(d.getTime())) return 0;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const toMinutes = (t: string): number | null => {
  if (!t) return null;
  const parts = t.slice(0, 5).split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
};

const STANDARD_START = 8 * 60 + 30;
const STANDARD_END   = 17 * 60;
const TOLERANCE = 5;

const cleanISO = (val: any) => {
  if (!val) return '—';
  return String(val).replace('T', ' ').split('.')[0];
};

function getOccupancyColor(bookedCount: number, capacity: number, isWeekend: boolean): string {
  if (bookedCount >= capacity) return 'bg-brand-primary text-white border-brand-primary shadow-inner';
  if (bookedCount > 0) return 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 font-bold';
  if (isWeekend) return 'bg-brand-surface/50 border-brand-surface text-brand-muted';
  return 'bg-white border-brand-surface text-slate-100';
}

export function Calendar() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [meta, setMeta] = useState<{ guest_roles: any[] }>({ guest_roles: [] });
  const [loading, setLoading] = useState(true);
  const [viewWindow, setViewWindow] = useState<7 | 15>(15);
  const [floorConfigs, setFloorConfigs] = useState<Record<string, any>>({});
  const [collapsedFloors, setCollapsedFloors] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [deleteConfirmBooking, setDeleteConfirmBooking] = useState<Booking | null>(null);

  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ roomId: number, date: string } | null>(null);
  const isDraggingRef = useRef(false);
  const floorOpenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const colWidth = viewWindow === 7 ? 'min-w-[100px]' : 'min-w-[70px]';
  const bookingTextSize = viewWindow === 7 ? 'text-[10px] h-6' : 'text-[8px] h-5';

  const fetchData = async () => {
    try {
      const [r, b, f] = await Promise.all([getRooms(), getBookings(), getFloors()]);

      setRooms(r.data || []);
      setBookings(b.data || []);

      const roles = b.meta?.guest_roles || b.guest_roles || [];
      setMeta({ guest_roles: roles });

      const configs: Record<string, any> = {};
      (f.data ?? []).forEach((floor: any) => {
        configs[floor.key.toUpperCase()] = { label: floor.label.toUpperCase() };
      });
      setFloorConfigs(configs);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleDragOverFloor = (floor: string) => {
    if (!draggedBooking) return;
    if (collapsedFloors.includes(floor)) {
      if (floorOpenTimeoutRef.current) clearTimeout(floorOpenTimeoutRef.current);
      floorOpenTimeoutRef.current = setTimeout(() => {
        setCollapsedFloors(prev => prev.filter(f => f !== floor));
      }, 500);
    }
  };

  const clearFloorTimeout = () => {
    if (floorOpenTimeoutRef.current) {
      clearTimeout(floorOpenTimeoutRef.current);
      floorOpenTimeoutRef.current = null;
    }
  };

  const moveNext = () => setStartDate(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() + viewWindow);
    return d;
  });

  const movePrev = () => setStartDate(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() - viewWindow);
    return d;
  });

  const days = useMemo(() => {
    return Array.from({ length: viewWindow }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [startDate, viewWindow]);

  const todayTs = useMemo(() => {
    const t = new Date();
    return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  }, []);

  const getBookingsForRoomAndDay = (roomId: number, day: Date) => {
    const calendarDayTs = new Date(day).setHours(0, 0, 0, 0);

    return bookings.filter(b => {
      const bRoomId = b.room_id || b.room?.id;
      const startTs = new Date(b.check_in).setHours(0, 0, 0, 0);
      const endTs = new Date(b.check_out).setHours(0, 0, 0, 0);

      return Number(bRoomId) === Number(roomId) &&
        calendarDayTs >= startTs &&
        calendarDayTs <= endTs;
    });
  };

  const getShadowState = (room: Room, dateStr: string) => {
    if (!draggedBooking || !dragOverCell || dragOverCell.roomId !== room.id)
      return { isShadow: false, isConflict: false };

    const startTs = normalizeDate((draggedBooking as any).check_in);
    const endTs = normalizeDate((draggedBooking as any).check_out);
    const durationMs = endTs - startTs;

    const currentCellTs = normalizeDate(dateStr);
    const dragStartTs = normalizeDate(dragOverCell.date);
    const dragEndTs = dragStartTs + durationMs;

    const isShadow = currentCellTs >= dragStartTs && currentCellTs < dragEndTs;
    let isConflict = false;

    if (isShadow) {
      const otherBookings = getBookingsForRoomAndDay(room.id, new Date(dateStr))
        .filter(b => Number(b.id) !== Number(draggedBooking.id));
      isConflict = (otherBookings.length + 1) > room.capacity;
    }
    return { isShadow, isConflict };
  };

  const handleUpdate = async (id: number, data: any) => {
    try {
      const response = await updateBooking(id, data);
      if (response) {
        setEditingBooking(null);
        await fetchData();
        setToast({ msg: "UPDATED SUCCESSFULLY ✓", type: 'success' });
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.message || "UPDATE FAILED";
      setToast({ msg: serverMessage.toUpperCase(), type: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBooking(id);
      setDeleteConfirmBooking(null);
      setEditingBooking(null);
      await fetchData();
      setToast({ msg: "DELETED ✓", type: 'success' });
    } catch (err) {
      setToast({ msg: "DELETE FAILED", type: 'error' });
    }
  };

  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    isDraggingRef.current = true;
    setDraggedBooking(booking);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedBooking(null);
    setDragOverCell(null);
    isDraggingRef.current = false;
    clearFloorTimeout();
  };

  const handleDrop = async (e: React.DragEvent, targetRoomId: number, targetDate: string) => {
    e.preventDefault();
    if (!draggedBooking) return;

    try {
      const response = await moveBooking(draggedBooking.id, {
        room_id: targetRoomId,
        check_in: targetDate,
        check_out: targetDate,
      });

      if (response) {
        await fetchData();
        setToast({ msg: "MOVED SUCCESSFULLY ✓", type: 'success' });
      }
    } catch (err: any) {
      console.error("Move Error:", err);
      const serverMessage = err.response?.data?.message || "MOVE FAILED";
      setToast({ msg: serverMessage.toUpperCase(), type: 'error' });
    } finally {
      handleDragEnd();
    }
  };

  const dynamicFloors = useMemo(() => {
    const floorSet = new Set(rooms.map(room => room.name?.[0]?.toUpperCase()).filter(Boolean));
    return Array.from(floorSet).sort();
  }, [rooms]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black animate-pulse uppercase text-2xl tracking-widest text-slate-800">
      Syncing...
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-surface p-4 font-brand relative">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b-4 border-slate-800 pb-6 mb-8 gap-4">
        <div className="flex-1 w-full text-left">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic leading-none">
              Daily <span className="text-brand-primary">Ops</span>
            </h1>
            <div className="h-8 w-[3px] bg-slate-800 rotate-[20deg]" />
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Current View</p>
              <p className="text-slate-800 text-sm font-black uppercase bg-yellow-300 px-2 py-0.5 shadow-[2px_2px_0px_#000]">
                {days[0].toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {days[days.length - 1].toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-200 p-1 border-2 border-slate-800 shadow-[4px_4px_0px_#000]">
            {[7, 15].map((v) => (
              <button
                key={v}
                onClick={() => setViewWindow(v as any)}
                className={`px-4 py-1.5 text-[10px] font-black transition-all ${viewWindow === v ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-300'}`}
              >
                {v} DAYS
              </button>
            ))}
          </div>

          <div className="flex items-center border-2 border-slate-800 shadow-[4px_4px_0px_#000] bg-white">
            <button onClick={movePrev} className="w-10 h-10 font-black text-lg border-r-2 border-slate-800 hover:bg-slate-100 transition-colors">‹</button>
            <button onClick={() => setStartDate(new Date(new Date().setHours(0, 0, 0, 0)))} className="px-6 h-10 text-[10px] font-black uppercase hover:bg-slate-100 tracking-widest">Today</button>
            <button onClick={moveNext} className="w-10 h-10 font-black text-lg border-l-2 border-slate-800 hover:bg-slate-100 transition-colors">›</button>
          </div>

          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`h-10 px-6 font-black uppercase text-[10px] border-2 border-slate-800 shadow-[4px_4px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${isFormOpen ? 'bg-red-500 text-white' : 'bg-brand-primary text-white'}`}
          >
            {isFormOpen ? '✕ Close' : '+ New Entry'}
          </button>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-10 min-w-[320px] max-w-[90vw]">
          <div className={`px-6 py-4 rounded-xl shadow-[8px_8px_0px_#000] border-2 bg-white ${toast.type === 'error' ? 'border-red-600' : 'border-brand-primary'}`}>
            <div className="flex items-center gap-4">
              <span className={`text-2xl ${toast.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {toast.type === 'error' ? '⚠' : '✓'}
              </span>
              <p className="font-black text-slate-800 text-sm uppercase italic leading-tight">
                {toast.msg}
              </p>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="mb-6">
          <NewBookingForm
            rooms={rooms}
            guestRoles={meta.guest_roles || []}
            onSuccess={() => { setIsFormOpen(false); fetchData(); }}
            onCancel={() => setIsFormOpen(false)}
            showToast={(msg, type) => setToast({ msg, type: type as any })}
            initialRoomId={rooms.find(r => r.id === dragOverCell?.roomId)?.id || undefined}
            initialDate={dragOverCell?.date || undefined}
          />
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-x-auto bg-white border-2 border-slate-800 no-scrollbar">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-800 h-16">
              <th className="sticky left-0 z-40 bg-slate-200 p-4 border-r-2 border-slate-800 w-[140px] text-[10px] font-black uppercase">
                Resources
              </th>
              {days.map(day => (
                <th
                  key={day.toISOString()}
                  className={`${colWidth} p-2 border-r border-slate-200 text-center ${normalizeDate(day) === todayTs ? 'bg-brand-primary/10' : ''}`}
                >
                  <div className="text-[9px] font-black opacity-40 uppercase">
                    {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </div>
                  <div className={`font-black ${viewWindow === 15 ? 'text-base' : 'text-xl'}`}>
                    {day.getDate()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dynamicFloors.map(floor => {
              const isCollapsed = collapsedFloors.includes(floor);

              return (
                <Fragment key={floor}>
                  <tr
                    className="bg-slate-800 text-white h-10 cursor-pointer hover:bg-slate-700 transition-colors sticky z-30"
                    onClick={() => setCollapsedFloors(prev =>
                      isCollapsed ? prev.filter(f => f !== floor) : [...prev, floor]
                    )}
                    onDragEnter={() => handleDragOverFloor(floor)}
                    onDragLeave={clearFloorTimeout}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <td className="sticky left-0 z-30 bg-slate-800 px-4 font-black italic text-[11px] uppercase tracking-widest border-b border-slate-700">
                      <span className="mr-2 inline-block w-4 text-center">
                        {isCollapsed ? '▷' : '▽'}
                      </span>
                      {floorConfigs[floor]?.label || floor}
                    </td>
                    <td colSpan={days.length} className="border-b border-slate-700" />
                  </tr>

                  {!isCollapsed && rooms
                    .filter(r => r.name?.toUpperCase().startsWith(floor))
                    .map(room => (
                      <tr key={room.id} className="border-b border-slate-100 group h-14 hover:bg-slate-50/50 transition-colors">
                        <td className="sticky left-0 z-20 bg-white px-3 border-r-2 border-slate-800 font-black italic uppercase text-slate-800 text-sm shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          <div className="flex flex-col leading-tight">
                            <span className="whitespace-nowrap">{room.name}</span>
                            <span className="text-[9px] not-italic font-bold text-slate-400 uppercase">
                              Cap: {room.capacity}
                            </span>
                          </div>
                        </td>
                        {days.map(day => {
                          const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                          const dayBookings = getBookingsForRoomAndDay(room.id, day);
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                          // ── DRAG STATE ──────────────────────────────────────
                          const { isShadow, isConflict } = getShadowState(room, dateStr);
                          const isDragTarget = dragOverCell?.roomId === room.id && dragOverCell?.date === dateStr;

                          return (
                            <td
                              key={day.toISOString()}
                              onDragEnter={() => draggedBooking && setDragOverCell({ roomId: room.id, date: dateStr })}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDrop(e, room.id, dateStr)}
                              className={`p-0.5 border-r border-slate-100 relative align-top min-h-[80px]
                                ${getOccupancyColor(dayBookings.length, room.capacity, isWeekend)}
                                ${isDragTarget && !isConflict ? 'ring-2 ring-inset ring-green-400 bg-green-50/60' : ''}
                                ${isDragTarget && isConflict  ? 'ring-2 ring-inset ring-red-400 bg-red-50/60'   : ''}
                              `}
                            >
                              <div className="flex flex-col gap-1 w-full">
                                {(() => {
                                  const roomAllBookings = [...bookings]
                                    .filter(b => Number(b.room_id || b.room?.id) === Number(room.id))
                                    .sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime());

                                  const lanes: any[][] = [];
                                  roomAllBookings.forEach(res => {
                                    let placed = false;
                                    const resIn = res.check_in?.split(/[ T]/)[0];

                                    for (let i = 0; i < lanes.length; i++) {
                                      const lastInLane = lanes[i][lanes[i].length - 1];
                                      const lastOut = lastInLane.check_out?.split(/[ T]/)[0];
                                      if (lastOut < resIn) {
                                        lanes[i].push(res);
                                        placed = true;
                                        break;
                                      }
                                    }
                                    if (!placed) lanes.push([res]);
                                  });

                                  const totalSlots = Math.max(room.capacity, lanes.length, 2);

                                  return Array.from({ length: totalSlots }).map((_, slotIndex) => {
                                    const currentLane = lanes[slotIndex] || [];
                                    const b = currentLane.find(res => {
                                      const bStart = res.check_in?.split(/[ T]/)[0];
                                      const bEnd = res.check_out?.split(/[ T]/)[0];
                                      return dateStr >= bStart && dateStr <= bEnd;
                                    });

                                    if (!b) {
                                      return <div key={`empty-${slotIndex}-${dateStr}`} className="h-5 w-full opacity-0 pointer-events-none" />;
                                    }

                                    const bStartStr = b.check_in?.split(/[ T]/)[0];
                                    const bEndStr = b.check_out?.split(/[ T]/)[0];
                                    const isStartDay = dateStr === bStartStr;
                                    const isEndDay = dateStr === bEndStr;

                                    const isCheckedIn = b.status === 'checked_in' || b.is_checked_in === true;
                                    const baseColor = isCheckedIn ? '#22c55e' : '#6366f1';

                                    const inTimeRaw = b.check_in?.match(/([01]\d|2[0-3]):([0-5]\d)/)?.[0] || "";
                                    const outTimeRaw = b.check_out?.match(/([01]\d|2[0-3]):([0-5]\d)/)?.[0] || "";
                                    const inMins = toMinutes(inTimeRaw) ?? 0;
                                    const outMins = toMinutes(outTimeRaw) ?? 1440;

                                    const isPartialStart = isStartDay && inMins >= 750;
                                    const isPartialEnd = isEndDay && outMins <= 750;

                                    let bgStyle = {};
                                    if (isPartialStart) {
                                      bgStyle = { background: `linear-gradient(to top right, white 49.5%, ${baseColor} 50%)` };
                                    } else if (isPartialEnd) {
                                      bgStyle = { background: `linear-gradient(to top right, ${baseColor} 49.5%, white 50%)` };
                                    } else {
                                      bgStyle = { backgroundColor: baseColor };
                                    }

                                    return (
                                      <div
                                        key={b.id}
                                        draggable={true}
                                        onDragStart={(e) => handleDragStart(e, b)}
                                        onDragEnd={handleDragEnd}
                                        onClick={(e) => { e.stopPropagation(); setEditingBooking(b); }}
                                        className={`relative h-5 w-full flex items-center justify-center rounded-sm text-[8px] font-black uppercase overflow-hidden shadow-sm border border-black/5 cursor-move
                                          ${(isPartialStart || isPartialEnd) ? 'text-slate-800' : 'text-white'}`}
                                        style={{
                                          ...bgStyle,
                                          // ── Sürüklenen kartı soldur ──────────
                                          opacity: draggedBooking?.id === b.id ? 0.3 : 1,
                                          transition: 'opacity 0.15s',
                                        }}
                                      >
                                        <span className="truncate px-1 pointer-events-none drop-shadow-sm">
                                          {b.snapshot_guest_name}
                                        </span>
                                      </div>
                                    );
                                  });
                                })()}

                                {/* ── Drop zone görseli ─────────────────────── */}
                                {isDragTarget && !isConflict && (
                                  <div className="h-5 w-full mt-0.5 rounded-sm border-2 border-dashed border-green-500 bg-green-100/40 flex items-center justify-center text-[8px] font-black text-green-700 uppercase">
                                    {draggedBooking?.snapshot_guest_name?.split(' ')[0]}
                                  </div>
                                )}
                                {isDragTarget && isConflict && (
                                  <div className="h-5 w-full mt-0.5 rounded-sm border-2 border-dashed border-red-500 bg-red-100/40 flex items-center justify-center text-[8px] font-black text-red-700 uppercase">
                                    dolu
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditBookingModal
        isOpen={!!editingBooking}
        booking={editingBooking}
        onClose={() => setEditingBooking(null)}
        onSave={handleUpdate}
        onDelete={() => setDeleteConfirmBooking(editingBooking)}
        guestRoles={meta?.guest_roles || []}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteConfirmBooking}
        data={deleteConfirmBooking}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmBooking(null)}
      />
    </div>
  );
}

export default Calendar;
