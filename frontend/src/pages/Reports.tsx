import { useState, useEffect, useMemo } from 'react';
import { getBookings } from '../api/bookings';
import { getRooms } from '../api/rooms';
import { PageHeader } from "../components/PageHeader";
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
    
    const vacantGroups = rooms
      .filter(r => !occupiedRoomIds.includes(r.id))
      .reduce((acc: any, room: any) => {
        const floorLabel = room.floor?.label || room.floor?.name || "RESOURCES"; 
        if (!acc[floorLabel]) acc[floorLabel] = [];
        acc[floorLabel].push(room);
        return acc;
      }, {} as Record<string, Room[]>);

    return { checkIns: ins, checkOuts: outs, stayOvers: stays, vacantRooms: vacantGroups };
  }, [bookings, rooms, reportDate]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-brand-secondary animate-pulse text-xl uppercase tracking-widest font-brand">
      Generating Reports...
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-surface font-brand">
      
      {/* 1. HEADER SECTION - Diğer sayfalarla tam uyumlu */}
      <div className="max-w-7xl mx-auto px-4 pt-4 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-brand-surface pb-4">
          <div className="flex-1 w-full">
            <PageHeader highlight="DAILY" title="OPS" />
          </div>
          
          <div className="flex items-center gap-2 pb-[2px] mt-4 md:mt-0">
            <div className="bg-white border border-brand-surface rounded-ini px-3 py-2 shadow-sm flex items-center gap-2">
              <span className="text-[7px] font-black text-brand-muted uppercase">Ops Date</span>
              <input 
                type="date" 
                value={reportDate} 
                onChange={(e) => setReportDate(e.target.value)} 
                className="bg-transparent font-black outline-none text-brand-secondary cursor-pointer text-[10px] uppercase" 
              />
            </div>
            <button 
              onClick={() => window.print()} 
              className="bg-brand-secondary text-white px-5 py-3 rounded-ini font-black uppercase text-[10px] tracking-widest hover:bg-brand-primary transition-all shadow-md active:scale-95"
            >
              PRINT
            </button>
          </div>
        </div>
      </div>

      {/* 2. CONTENT SECTION - mt-8 ile ferahlatıldı */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Arrivals" value={reportData.checkIns.length} color="text-brand-primary" />
          <StatCard label="Departures" value={reportData.checkOuts.length} color="text-brand-danger" />
          <StatCard label="In-House" value={reportData.stayOvers.length} color="text-brand-secondary" />
          <StatCard label="Vacant" value={Object.values(reportData.vacantRooms).flat().length} color="text-brand-muted" />
        </div>

        {/* MAIN COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          <Column title="Arrivals" data={reportData.checkIns} accentColor="text-brand-primary" />
          <Column title="Departures" data={reportData.checkOuts} accentColor="text-brand-danger" />
          <Column title="Vacant Resources" data={reportData.vacantRooms} accentColor="text-brand-secondary" isRoomOnly />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="ini-card p-6 bg-white hover:shadow-md transition-all">
      <p className="text-[9px] font-black uppercase text-brand-muted tracking-[0.2em]">{label}</p>
      <p className={`text-4xl font-black mt-1 leading-none ${color}`}>{value}</p>
    </div>
  );
}

function Column({ title, data, accentColor, isRoomOnly }: any) {
  const isEmpty = isRoomOnly ? Object.keys(data).length === 0 : data.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center border-b-2 border-brand-surface pb-3 gap-1">
        <h3 className={`font-black uppercase tracking-tighter text-sm italic leading-none ${accentColor}`}>{title}</h3>
      </div>

      <div className="space-y-4">
        {isRoomOnly ? (
          Object.keys(data).sort().map(groupLabel => (
            <div key={groupLabel} className="ini-card bg-white overflow-hidden shadow-sm">
              {groupLabel && (
                <div className="bg-brand-surface/40 px-4 py-2 border-b border-brand-surface flex justify-between items-center">
                  <span className="text-[8px] font-black text-brand-muted uppercase tracking-[0.2em]">{groupLabel}</span>
                  <span className="text-[8px] font-black text-brand-muted/50">{data[groupLabel].length} UNITS</span>
                </div>
              )}
              <div className="divide-y divide-brand-surface">
                {data[groupLabel].sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((room: any) => (
                  <div key={room.id} className="px-5 py-3 flex justify-between items-center hover:bg-brand-surface/20 transition-all">
                    <span className="font-black text-brand-secondary uppercase text-[11px] tracking-tight">{room.name}</span>
                    <span className="text-[7px] font-black text-brand-success uppercase italic opacity-50 tracking-widest">Available</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="ini-card bg-white overflow-hidden shadow-sm">
            <div className="divide-y divide-brand-surface">
              {data.map((item: any) => (
                <div key={item.id} className="px-5 py-4 flex justify-between items-center hover:bg-brand-surface/20 transition-all">
                  <div className="flex flex-col">
                    <span className="font-black text-brand-secondary uppercase truncate pr-2 text-[11px] tracking-tight">{item.title}</span>
                    <span className="text-[7px] font-black text-brand-muted uppercase opacity-60 mt-0.5">{item.room?.floor?.label || 'MISSION AREA'}</span>
                  </div>
                  <span className="text-[10px] font-black bg-brand-surface text-brand-secondary px-2.5 py-1 rounded-sm uppercase tracking-tighter border border-brand-surface/50">{item.room?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {isEmpty && <div className="py-16 text-center text-brand-muted font-black uppercase text-[9px] tracking-[0.3em] opacity-30 italic border-2 border-dashed border-brand-surface rounded-ini">No Data Logged</div>}
      </div>
    </div>
  );
}