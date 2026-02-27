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
      const titleCompare = titleA.localeCompare(titleB, 'tr', { sensitivity: 'base' });
      if (titleCompare === 0) {
        const roomA = a.room?.name || "";
        const roomB = b.room?.name || "";
        return roomA.localeCompare(roomB, undefined, { numeric: true });
      }
      return titleCompare;
    };
    const sortByRoomOnly = (a: any, b: any) => (a.name || "").localeCompare(b.name || "", undefined, { numeric: true });

    const ins = bookings.filter(b => b.start_time.startsWith(dateStr)).sort(sortByGuestName);
    const outs = bookings.filter(b => b.end_time.startsWith(dateStr)).sort(sortByGuestName);
    const stays = bookings.filter(b => {
      const s = b.start_time.split(/[\sT]/)[0];
      const e = b.end_time.split(/[\sT]/)[0];
      return dateStr > s && dateStr < e;
    }).sort(sortByGuestName);

    const occupiedRoomIds = [...ins, ...stays].map(b => b.room?.id || (b as any).room_id);
    const vacants = rooms.filter(r => !occupiedRoomIds.includes(r.id)).sort(sortByRoomOnly);

    return { checkIns: ins, checkOuts: outs, stayOvers: stays, vacantRooms: vacants };
  }, [bookings, rooms, reportDate]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-brand-secondary animate-pulse text-2xl uppercase tracking-widest">
      InI Preparing Reports...
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-12">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-12 print-hide">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
          <div>
            <h1 className="text-brand-title font-black uppercase tracking-tighter italic leading-[0.8]">
              Daily <span className="text-brand-primary">Ops</span>
            </h1>
            <p className="text-brand-muted font-bold uppercase text-brand-small tracking-[0.3em] mt-4">Operational Movement Report</p>
          </div>
          <div className="ini-input-wrapper">
             <input 
              type="date" 
              value={reportDate} 
              onChange={(e) => setReportDate(e.target.value)}
              className="bg-transparent px-4 py-2 font-black outline-none text-brand-primary cursor-pointer text-brand-base"
            />
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Arrivals" value={checkIns.length} color="bg-brand-success" />
          <StatCard label="Departures" value={checkOuts.length} color="bg-brand-danger" />
          <StatCard label="In-House" value={stayOvers.length} color="bg-brand-primary" />
          <StatCard label="Vacant" value={vacantRooms.length} color="bg-brand-secondary" />
        </div>
      </div>

      {/* THREE COLUMN VIEW */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
        <Column title="Arrivals" data={checkIns} color="text-brand-success" badgeBg="bg-brand-success/10" />
        <Column title="Departures" data={checkOuts} color="text-brand-danger" badgeBg="bg-brand-danger/10" />
        <Column title="Vacant Rooms" data={vacantRooms} color="text-brand-secondary" isRoomOnly />
      </div>

      {/* PRINT BUTTON */}
      <button 
        onClick={() => window.print()}
        className="fixed bottom-8 right-8 bg-brand-secondary text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all print-hide z-50 flex items-center gap-2"
      >
        <span className="text-xl leading-none">🖨️</span>
        <span className="text-brand-small font-black uppercase pr-2 tracking-widest leading-none">Print Ops Report</span>
      </button>

    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ label, value, color }: any) {
  return (
    <div className="ini-card p-8 flex justify-between items-center group hover:border-brand-primary/20">
      <div>
        <p className="text-brand-small font-black uppercase text-brand-muted tracking-widest">{label}</p>
        <p className="text-4xl font-black mt-1 leading-none text-brand-secondary">{value}</p>
      </div>
      <div className={`w-3 h-12 ${color} rounded-full opacity-10 group-hover:opacity-100 transition-all`} />
    </div>
  );
}

function Column({ title, data, color, badgeBg, isRoomOnly }: any) {
  return (
    <div className="space-y-4">
      <div className={`flex justify-between items-end border-b-4 border-brand-surface pb-4 ${color}`}>
        <h3 className="font-black uppercase tracking-tighter text-xl italic leading-none">{title}</h3>
        <span className="text-2xl font-black opacity-20 leading-none">{data.length}</span>
      </div>

      <div className="ini-card ini-divide overflow-hidden px-6">
        {data.map((item: any) => (
          <div key={item.id} className="py-4 flex justify-between items-center">
            <span className="font-black text-brand-secondary uppercase truncate pr-4 text-brand-base">
              {isRoomOnly ? item.name : item.title}
            </span>
            {!isRoomOnly && (
              <span className={`ini-badge ${color} ${badgeBg}`}>Room {item.room?.name}</span>
            )}
          </div>
        ))}
        {data.length === 0 && (
          <div className="py-10 text-center text-brand-muted font-black uppercase text-brand-small tracking-widest opacity-30 italic">
            No Movement
          </div>
        )}
      </div>
    </div>
  );
}