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

  // Optimized sorting and filtering
  const { checkIns, checkOuts, stayOvers, vacantRooms } = useMemo(() => {
    const dateStr = new Date(reportDate).toISOString().split('T')[0];

    // GUEST NAME (TITLE) FIRST ASCENDING SORTING
    const sortByGuestName = (a: any, b: any) => {
      const titleA = (a.title || "").trim();
      const titleB = (b.title || "").trim();
      
      // Sort alphabetically (Turkish character support added)
      const titleCompare = titleA.localeCompare(titleB, 'tr', { sensitivity: 'base' });
      
      // If titles are identical, secondary sort by room name
      if (titleCompare === 0) {
        const roomA = a.room?.name || "";
        const roomB = b.room?.name || "";
        return roomA.localeCompare(roomB, undefined, { numeric: true });
      }
      return titleCompare;
    };

    // ROOM ONLY SORTING (For Vacant Rooms)
    const sortByRoomOnly = (a: any, b: any) => {
      return (a.name || "").localeCompare(b.name || "", undefined, { numeric: true });
    };

    // Filter and Sort Arrivals
    const ins = bookings
      .filter(b => b.start_time.startsWith(dateStr))
      .sort(sortByGuestName);
    
    // Filter and Sort Departures
    const outs = bookings
      .filter(b => b.end_time.startsWith(dateStr))
      .sort(sortByGuestName);
    
    // Filter and Sort In-House
    const stays = bookings
      .filter(b => {
        const s = b.start_time.split(/[\sT]/)[0];
        const e = b.end_time.split(/[\sT]/)[0];
        return dateStr > s && dateStr < e;
      })
      .sort(sortByGuestName);

    // Filter and Sort Vacant Rooms
    const occupiedRoomIds = [...ins, ...stays].map(b => b.room?.id || (b as any).room_id);
    const vacants = rooms
      .filter(r => !occupiedRoomIds.includes(r.id))
      .sort(sortByRoomOnly);

    return { checkIns: ins, checkOuts: outs, stayOvers: stays, vacantRooms: vacants };
  }, [bookings, rooms, reportDate]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-slate-900 animate-pulse text-2xl uppercase tracking-widest">
      InI Preparing Reports...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-12 font-sans text-slate-900">
      
      {/* HEADER & DATE PICKER */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">
              Daily <span className="text-indigo-600">Ops</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Operational Movement Report</p>
          </div>
          <div className="bg-white p-2 rounded-2xl border-2 border-slate-200 flex items-center shadow-sm">
             <input 
              type="date" 
              value={reportDate} 
              onChange={(e) => setReportDate(e.target.value)}
              className="bg-transparent px-4 py-2 font-black outline-none text-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Arrivals" value={checkIns.length} color="bg-emerald-500" />
          <StatCard label="Departures" value={checkOuts.length} color="bg-rose-500" />
          <StatCard label="In-House" value={stayOvers.length} color="bg-indigo-500" />
          <StatCard label="Vacant" value={vacantRooms.length} color="bg-slate-900" />
        </div>
      </div>

      {/* THREE COLUMN LIST VIEW */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* ARRIVALS COLUMN */}
        <div className="space-y-4">
          <SectionHeader title="Expected Arrivals" count={checkIns.length} color="text-emerald-600" />
          <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden px-6">
            {checkIns.map(res => (
              <div key={res.id} className="py-4 flex justify-between items-center group">
                <span className="font-black text-slate-900 uppercase truncate pr-4 text-sm">{res.title}</span>
                <span className="shrink-0 font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg text-xs">Room {res.room?.name}</span>
              </div>
            ))}
            {checkIns.length === 0 && <EmptyRow message="No Arrivals Listed" />}
          </div>
        </div>

        {/* DEPARTURES COLUMN */}
        <div className="space-y-4">
          <SectionHeader title="Expected Departures" count={checkOuts.length} color="text-rose-600" />
          <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden px-6">
            {checkOuts.map(res => (
              <div key={res.id} className="py-4 flex justify-between items-center group">
                <span className="font-black text-slate-900 uppercase truncate pr-4 text-sm">{res.title}</span>
                <span className="shrink-0 font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg text-xs">Room {res.room?.name}</span>
              </div>
            ))}
            {checkOuts.length === 0 && <EmptyRow message="No Departures Listed" />}
          </div>
        </div>

        {/* VACANT ROOMS COLUMN */}
        <div className="space-y-4">
          <SectionHeader title="Vacant Rooms" count={vacantRooms.length} color="text-slate-900" />
          <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden px-6">
            {vacantRooms.map(room => (
              <div key={room.id} className="py-4 flex justify-between items-center">
                <span className="font-black text-slate-900 uppercase text-sm">{room.name}</span>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ready</span>
              </div>
            ))}
            {vacantRooms.length === 0 && <EmptyRow message="No Vacancy Available" />}
          </div>
        </div>

      </div>

      {/* PRINT ACTION */}
      <button 
        onClick={() => window.print()}
        className="fixed bottom-8 right-8 bg-slate-900 text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all print:hidden z-50 flex items-center gap-2"
      >
        <span className="text-xl">🖨️</span>
        <span className="text-[10px] font-black uppercase pr-2 tracking-widest">Print Ops Report</span>
      </button>

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body { background-color: white !important; }
          .print\\:hidden { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

// --- SUB-COMPONENTS ---

const StatCard = ({ label, value, color }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
    <div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
      <p className="text-4xl font-black mt-1 leading-none">{value}</p>
    </div>
    <div className={`w-3 h-12 ${color} rounded-full opacity-10 group-hover:opacity-100 transition-all`} />
  </div>
);

const SectionHeader = ({ title, count, color }: any) => (
  <div className={`flex justify-between items-end border-b-4 border-slate-100 pb-4 ${color}`}>
    <h3 className="font-black uppercase tracking-tighter text-xl italic">{title}</h3>
    <span className="text-2xl font-black opacity-20">{count}</span>
  </div>
);

const EmptyRow = ({ message }: { message: string }) => (
  <div className="py-10 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">
    {message}
  </div>
);