import { useState, useEffect, useMemo } from 'react';
import { getBookings } from '../api/bookings';
import { getRooms } from '../api/rooms';
import type { Booking, Room } from '../types';

export function Reports() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBookings(), getRooms()]).then(([b, r]) => {
      setBookings(b.data || b || []);
      setRooms(r.data || r || []);
      setLoading(false);
    });
  }, []);

  const reportData = useMemo(() => {
    const dateStr = new Date(reportDate).toISOString().split('T')[0];
    const sortByGuestName = (a: any, b: any) => (a.title || "").trim().localeCompare((b.title || "").trim(), 'tr', { sensitivity: 'base' });

    const ins = bookings.filter(b => b.start_time?.startsWith(dateStr)).sort(sortByGuestName);
    const outs = bookings.filter(b => b.end_time?.startsWith(dateStr)).sort(sortByGuestName);
    const stays = bookings.filter(b => {
      const s = b.start_time?.split(/[\sT]/)[0];
      const e = b.end_time?.split(/[\sT]/)[0];
      return dateStr > s && dateStr < e;
    }).sort(sortByGuestName);

    const occupiedRoomIds = [...ins, ...stays].map(b => b.room?.id || (b as any).room_id);
    
    // GRUPLAMA MANTIĞI: Floor yoksa boş string döner, böylece başlık oluşmaz
    const vacantGroups = rooms
      .filter(r => !occupiedRoomIds.includes(r.id))
      .reduce((acc: any, room: any) => {
        const floorLabel = room.floor?.label || room.floor?.name || ""; 
        if (!acc[floorLabel]) acc[floorLabel] = [];
        acc[floorLabel].push(room);
        return acc;
      }, {} as Record<string, Room[]>);

    return { checkIns: ins, checkOuts: outs, stayOvers: stays, vacantRooms: vacantGroups };
  }, [bookings, rooms, reportDate]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-brand-secondary animate-pulse text-2xl uppercase tracking-widest font-brand">
      InI Preparing Reports...
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-surface px-4 pt-2 pb-12 font-brand transition-all">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-1 print:mb-8 print-hide border-b-2 border-brand-surface pb-1">
        <div className="flex flex-col md:flex-row justify-between items-end gap-2">
          <div>
            <h1 className="text-2xl font-black text-brand-secondary uppercase tracking-tighter leading-none italic">
              Daily <span className="text-brand-primary">Ops</span>
            </h1>
            <p className="text-brand-muted text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">
              OPERATIONAL MOVEMENT REPORT — {new Date(reportDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white border border-brand-surface rounded-md px-4 py-1.5 shadow-sm flex items-center gap-2">
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="bg-transparent font-black outline-none text-brand-secondary cursor-pointer text-xs uppercase" />
            </div>
            <button onClick={() => window.print()} className="bg-brand-secondary text-white px-5 py-2 rounded-md font-black uppercase text-[10px] tracking-widest hover:bg-brand-primary transition-all shadow-md active:scale-95">Print</button>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-2 mb-8 mt-4">
        <StatCard label="Arrivals" value={reportData.checkIns.length} color="text-brand-primary" />
        <StatCard label="Departures" value={reportData.checkOuts.length} color="text-brand-danger" />
        <StatCard label="In-House" value={reportData.stayOvers.length} color="text-brand-secondary" />
        <StatCard label="Vacant" value={Object.values(reportData.vacantRooms).flat().length} color="text-brand-muted" />
      </div>

      {/* MAIN COLUMNS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Column title="Arrivals" data={reportData.checkIns} accentColor="text-brand-primary" />
        <Column title="Departures" data={reportData.checkOuts} accentColor="text-brand-danger" />
        <Column title="Vacant Resources" data={reportData.vacantRooms} accentColor="text-brand-secondary" isRoomOnly />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="bg-white p-6 border border-brand-surface rounded-sm shadow-sm hover:shadow-md transition-all">
      <p className="text-[9px] font-black uppercase text-brand-muted tracking-[0.2em]">{label}</p>
      <p className={`text-3xl font-black mt-1 leading-none ${color}`}>{value}</p>
    </div>
  );
}

function Column({ title, data, accentColor, isRoomOnly }: any) {
  const isEmpty = isRoomOnly ? Object.keys(data).length === 0 : data.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center border-b-2 border-brand-surface pb-2 gap-1">
        <h3 className={`font-black uppercase tracking-tighter text-sm italic leading-none ${accentColor}`}>{title}</h3>
      </div>

      <div className="space-y-4">
        {isRoomOnly ? (
          Object.keys(data).sort().map(groupLabel => (
            <div key={groupLabel} className="bg-white border border-brand-surface rounded overflow-hidden shadow-sm">
              {/* Sadece bir label varsa başlık gösterilir, yoksa direkt liste başlar */}
              {groupLabel && (
                <div className="bg-brand-surface/40 px-4 py-1.5 border-b border-brand-surface flex justify-between items-center">
                  <span className="text-[8px] font-black text-brand-muted uppercase tracking-[0.2em]">{groupLabel}</span>
                  <span className="text-[8px] font-black text-brand-muted/50">{data[groupLabel].length} R</span>
                </div>
              )}
              <div className="divide-y divide-brand-surface">
                {data[groupLabel].sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((room: any) => (
                  <div key={room.id} className="px-5 py-2.5 flex justify-between items-center hover:bg-brand-surface/20 transition-all">
                    <span className="font-black text-brand-secondary uppercase text-[11px] tracking-tight">{room.name}</span>
                    <span className="text-[7px] font-black text-brand-success uppercase italic opacity-50">Ready</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-brand-surface rounded overflow-hidden shadow-sm">
            <div className="divide-y divide-brand-surface">
              {data.map((item: any) => (
                <div key={item.id} className="px-5 py-3 flex justify-between items-center hover:bg-brand-surface/20 transition-all">
                  <div className="flex flex-col">
                    <span className="font-black text-brand-secondary uppercase truncate pr-2 text-[11px] tracking-tight">{item.title}</span>
                    <span className="text-[7px] font-black text-brand-muted uppercase opacity-60">{item.room?.floor?.label || 'IN-HOUSE'}</span>
                  </div>
                  <span className="text-[9px] font-black bg-brand-secondary text-white px-2 py-0.5 rounded uppercase tracking-tighter shadow-sm">{item.room?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {isEmpty && <div className="py-12 text-center text-brand-muted font-black uppercase text-[9px] tracking-[0.3em] opacity-30 italic border-2 border-dashed border-brand-surface rounded">No Movement</div>}
      </div>
    </div>
  );
}