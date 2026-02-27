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
      setBookings(b.data);
      setRooms(r.data);
      setLoading(false);
    });
  }, []);

  const { checkIns, checkOuts, stayOvers, vacantRooms } = useMemo(() => {
    const dateStr = new Date(reportDate).toISOString().split('T')[0];
    const sortByGuestName = (a: any, b: any) => {
      const titleA = (a.title || "").trim();
      const titleB = (b.title || "").trim();
      return titleA.localeCompare(titleB, 'tr', { sensitivity: 'base' });
    };

    const ins = bookings.filter(b => b.start_time.startsWith(dateStr)).sort(sortByGuestName);
    const outs = bookings.filter(b => b.end_time.startsWith(dateStr)).sort(sortByGuestName);
    const stays = bookings.filter(b => {
      const s = b.start_time.split(/[\sT]/)[0];
      const e = b.end_time.split(/[\sT]/)[0];
      return dateStr > s && dateStr < e;
    }).sort(sortByGuestName);

    const occupiedRoomIds = [...ins, ...stays].map(b => b.room?.id || (b as any).room_id);
    const vacants = rooms.filter(r => !occupiedRoomIds.includes(r.id)).sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true}));

    return { checkIns: ins, checkOuts: outs, stayOvers: stays, vacantRooms: vacants };
  }, [bookings, rooms, reportDate]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-brand-secondary animate-pulse text-2xl uppercase tracking-widest font-brand">
      InI Preparing Reports...
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-surface px-4 pt-2 pb-12 font-brand transition-all">
      
      {/* HEADER SECTION - Calendar ile Uyumlu */}
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
              <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Select Date</span>
              <input 
                type="date" 
                value={reportDate} 
                onChange={(e) => setReportDate(e.target.value)}
                className="bg-transparent font-black outline-none text-brand-secondary cursor-pointer text-xs"
              />
            </div>
            <button 
              onClick={() => window.print()}
              className="bg-brand-secondary text-white px-5 py-2 rounded-md font-black uppercase text-[10px] tracking-widest hover:bg-brand-primary transition-all shadow-md"
            >
              Print
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS - Calendar Kart Yapısı */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-2 mb-8 mt-4">
        <StatCard label="Arrivals" value={checkIns.length} color="border-brand-primary" />
        <StatCard label="Departures" value={checkOuts.length} color="border-brand-danger" />
        <StatCard label="In-House" value={stayOvers.length} color="border-brand-secondary" />
        <StatCard label="Vacant" value={vacantRooms.length} color="border-brand-muted" />
      </div>

      {/* THREE COLUMN VIEW */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Column title="Arrivals" data={checkIns} accentColor="text-brand-primary" />
        <Column title="Departures" data={checkOuts} accentColor="text-brand-danger" />
        <Column title="Vacant Resources" data={vacantRooms} accentColor="text-brand-secondary" isRoomOnly />
      </div>

    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ label, value, color }: any) {
  return (
    <div className={`ini-card p-6 border-l-4 ${color} hover:bg-white transition-all`}>
      <p className="text-[9px] font-black uppercase text-brand-muted tracking-[0.2em]">{label}</p>
      <p className="text-3xl font-black mt-1 leading-none text-brand-secondary">{value}</p>
    </div>
  );
}

function Column({ title, data, accentColor, isRoomOnly }: any) {
  return (
    <div className="space-y-3">
<div className={`flex flex-col items-center border-b-2 border-brand-surface pb-2 gap-1`}>
        <h3 className={`font-black uppercase tracking-tighter text-sm italic leading-none ${accentColor}`}>{title}</h3>
      </div>

      <div className="ini-card overflow-hidden">
        <div className="divide-y divide-brand-surface">
          {data.map((item: any) => (
            <div key={item.id} className="px-5 py-3 flex justify-between items-center hover:bg-brand-surface/20 transition-all">
              <span className="font-black text-brand-secondary uppercase truncate pr-2 text-[11px] tracking-tight">
                {isRoomOnly ? item.name : item.title}
              </span>
              {!isRoomOnly && (
                <span className="text-[9px] font-black bg-brand-secondary text-white px-2 py-0.5 rounded uppercase tracking-tighter">
                  {item.room?.name}
                </span>
              )}
            </div>
          ))}
          {data.length === 0 && (
            <div className="py-12 text-center text-brand-muted font-black uppercase text-[9px] tracking-[0.3em] opacity-30 italic">
              No Movement Scheduled
            </div>
          )}
        </div>
      </div>
    </div>
  );
}