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
    setLoading(true);
    Promise.all([getBookings(), getRooms()]).then(([b, r]) => {
      setBookings(b.data || b || []);
      setRooms(r.data || r || []);
      setLoading(false);
    });
  }, [reportDate]); // Tarih değiştiğinde de loading tetiklensin istersen

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
    const vacantList = rooms.filter(r => !occupiedRoomIds.includes(r.id));

    return { checkIns: ins, checkOuts: outs, stayOvers: stays, vacantRooms: vacantList };
  }, [bookings, rooms, reportDate]);

  return (
    <div className="min-h-screen bg-brand-surface font-brand">
      
      {/* 1. HEADER - BU KISIM HİÇBİR ZAMAN KAPANMAZ */}
      <div className="max-w-7xl mx-auto px-4 pt-4 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-brand-surface pb-4">
          <div className="flex-1 w-full">
            <PageHeader highlight="OPERATIONAL" title="REPORTS" />
          </div>
          
          <div className="flex items-center gap-2 pb-[2px] mt-4 md:mt-0">
            <div className="bg-white border border-brand-surface rounded-ini px-4 py-2.5 shadow-sm flex items-center gap-3">
              <span className="text-[8px] font-black text-brand-muted uppercase tracking-widest">Date</span>
              <input 
                type="date" 
                value={reportDate} 
                onChange={(e) => setReportDate(e.target.value)} 
                className="bg-transparent font-black outline-none text-brand-secondary cursor-pointer text-[10px] uppercase" 
              />
            </div>
            <button onClick={() => window.print()} className="bg-brand-secondary text-white px-6 py-3.5 rounded-ini font-black uppercase text-[9px] tracking-widest hover:bg-brand-primary transition-all shadow-lg active:scale-95">
              PRINT
            </button>
          </div>
        </div>
      </div>

      {/* 2. CONTENT SECTION - SADECE BURASI LOADING'E BAĞLI */}
      <div className="max-w-7xl mx-auto px-4 mt-8 pb-20">
        
        {loading ? (
          /* YÜKLENİYOR DURUMU (Header görünür kalır) */
          <div className="h-[50vh] flex flex-col items-center justify-center gap-4 text-brand-secondary/30">
            <div className="w-8 h-8 border-4 border-brand-surface border-t-brand-secondary rounded-full animate-spin" />
            <span className="font-black uppercase text-[9px] tracking-[0.4em] animate-pulse">Synchronizing Matrix...</span>
          </div>
        ) : (
          /* VERİ GELDİĞİNDE GÖRÜNECEK 4 KOLONLU YAPI */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
            
            {/* COLUMN 1: ARRIVALS */}
            <div className="flex flex-col gap-4">
              <StatCard label="Arrivals" value={reportData.checkIns.length} color="text-brand-primary" />
              <DataColumn title="Expected Arrivals" data={reportData.checkIns} accentColor="text-brand-primary" />
            </div>

            {/* COLUMN 2: DEPARTURES */}
            <div className="flex flex-col gap-4">
              <StatCard label="Departures" value={reportData.checkOuts.length} color="text-brand-danger" />
              <DataColumn title="Expected Departures" data={reportData.checkOuts} accentColor="text-brand-danger" />
            </div>

            {/* COLUMN 3: IN-HOUSE */}
            <div className="flex flex-col gap-4">
              <StatCard label="In-House" value={reportData.stayOvers.length} color="text-brand-info" />
              <DataColumn title="Current Stays" data={reportData.stayOvers} accentColor="text-brand-info" />
            </div>

            {/* COLUMN 4: VACANT */}
            <div className="flex flex-col gap-4">
              <StatCard label="Vacant" value={reportData.vacantRooms.length} color="text-brand-muted" />
              <DataColumn title="Available Now" data={reportData.vacantRooms} accentColor="text-brand-muted" isRoomOnly />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="ini-card p-6 bg-white border border-brand-surface shadow-sm">
      <p className="text-[8px] font-black uppercase text-brand-muted tracking-[0.25em]">{label}</p>
      <p className={`text-4xl font-black mt-2 leading-none tracking-tighter ${color}`}>{value}</p>
    </div>
  );
}

function DataColumn({ title, data, accentColor, isRoomOnly }: any) {
  const isEmpty = data.length === 0;

  return (
    <div className="space-y-4">
      <div className={`border-b-2 border-brand-surface pb-3`}>
        <h3 className={`font-black uppercase tracking-[0.1em] text-[10px] italic ${accentColor}`}>{title}</h3>
      </div>

      <div className="ini-card bg-white overflow-hidden shadow-sm border border-brand-surface/50 min-h-[100px]">
        <div className="divide-y divide-brand-surface">
          {isRoomOnly ? (
            data.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((room: any) => (
              <div key={room.id} className="px-4 py-3.5 flex justify-between items-center hover:bg-brand-surface/20 transition-all group">
                <div className="flex flex-col">
                  <span className="font-black text-brand-secondary text-[11px] tracking-tight">{room.name}</span>
                  <span className="text-[6px] font-black text-brand-muted uppercase tracking-widest">{room.floor?.label || 'UNIT'}</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-success opacity-30 group-hover:opacity-100 transition-opacity" />
              </div>
            ))
          ) : (
            data.map((item: any) => (
              <div key={item.id} className="px-4 py-4 flex justify-between items-center hover:bg-brand-surface/20 transition-all">
                <div className="flex flex-col gap-1 overflow-hidden">
                  <span className="font-black text-brand-secondary uppercase truncate text-[10px] tracking-tight leading-none">{item.title}</span>
                  <span className="text-[6px] font-black text-brand-muted uppercase tracking-widest opacity-60 italic truncate">
                    {item.room?.floor?.label || 'HQ'}
                  </span>
                </div>
                <span className="text-[9px] font-black bg-brand-secondary text-white px-2 py-1 rounded-sm uppercase tracking-tighter shadow-sm shrink-0 ml-2">
                  {item.room?.name}
                </span>
              </div>
            ))
          )}
          
          {isEmpty && (
            <div className="py-12 text-center text-brand-muted font-black uppercase text-[7px] tracking-[0.3em] opacity-20 italic">
              Empty Log
            </div>
          )}
        </div>
      </div>
    </div>
  );
}