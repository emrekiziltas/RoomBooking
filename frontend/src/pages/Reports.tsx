import { useState, useEffect, useMemo } from 'react';
import { getBookings } from '../api/bookings';
import { getRooms, getAuditLogs } from '../api/rooms';
import { PageHeader } from "../components/PageHeader";
import type { Booking, Room } from '../types';

type Tab = 'daily' | 'range' | 'audit';

const ACTION_STYLES: Record<string, string> = {
  created: 'bg-brand-primary/10 text-brand-primary',
  updated: 'bg-amber-100 text-amber-700',
  deleted: 'bg-brand-danger/10 text-brand-danger',
};

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  room_id: 'Room',
  start_time: 'Check-in',
  end_time: 'Check-out',
};

export function Reports() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const [auditLimit, setAuditLimit] = useState(20);
  const [auditAction, setAuditAction] = useState<'all' | 'created' | 'updated' | 'moved' | 'deleted'>('all');

  const today = new Date().toISOString().split('T')[0];
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(today);

  const formatDiffValue = (val: any) => {
  if (!val) return '—';
  const str = String(val);
  // Eğer değer bir ISO tarihi ise (içinde T varsa)
  if (str.includes('T')) {
    // T'yi boşluğa çevir ve saniye/milisaniye kısmını kes (ilk 16 karakter: YYYY-MM-DD HH:mm)
    return str.replace('T', ' ').substring(0, 16);
  }
  return str;
};
  useEffect(() => {
    setLoading(true);
    Promise.all([getBookings(), getRooms()])
      .then(([b, r]) => {
        setBookings(b.data || b || []);
        setRooms(r.data || r || []);
      })
      .catch(err => console.error("Load Error:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      setLoading(true);
      getAuditLogs(auditLimit)
        .then(data => setAuditLogs(data))
        .catch(() => setAuditLogs([]))
        .finally(() => setLoading(false));
    }
  }, [auditLimit, activeTab]);

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

  const rangeData = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    return bookings
      .filter(b => {
        const bStart = b.start_time?.split(/[\sT]/)[0];
        const bEnd = b.end_time?.split(/[\sT]/)[0];
        return bStart <= rangeEnd && bEnd >= rangeStart;
      })
      .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { sensitivity: 'base' }));
  }, [bookings, rangeStart, rangeEnd]);

  return (
    <div className="min-h-screen bg-brand-surface font-brand">
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto px-4 pt-4 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-brand-surface pb-4">
          <div className="flex-1 w-full">
            <PageHeader highlight="OPERATIONAL" title="REPORTS" subtitle="Matrix Analysis & Audit Logs" />
          </div>
          <button onClick={() => window.print()} className="bg-brand-secondary text-white px-6 py-3.5 rounded-ini font-black uppercase text-[9px] tracking-widest hover:bg-brand-primary transition-all shadow-lg active:scale-95 mt-4 md:mt-0">
            PRINT
          </button>
        </div>
      </div>

      {/* TABS SECTION */}
      <div className="max-w-7xl mx-auto px-4 mt-6 print:hidden">
        <div className="flex gap-1 bg-white border-2 border-brand-surface rounded-ini p-1 w-fit shadow-sm">
          {(['daily', 'range', 'audit'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-6 py-2 rounded-ini font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === t ? 'bg-brand-secondary text-white shadow-sm' : 'text-brand-muted hover:text-brand-secondary'}`}
            >
              {t === 'audit' ? 'Audit Log' : t === 'daily' ? 'Daily' : 'Date Range'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6 pb-20">
        {loading ? (
          <div className="h-[50vh] flex flex-col items-center justify-center gap-4 text-brand-secondary/30">
            <div className="w-8 h-8 border-4 border-brand-surface border-t-brand-secondary rounded-full animate-spin" />
            <span className="font-black uppercase text-[9px] tracking-[0.4em] animate-pulse">Synchronizing...</span>
          </div>
        ) : (
          <>
            {/* DAILY TAB */}
            {activeTab === 'daily' && (
              <div className="animate-in fade-in duration-500">
                <div className="flex justify-end mb-6">
                  <div className="bg-white border border-brand-surface rounded-ini px-4 py-2.5 shadow-sm flex items-center gap-3">
                    <span className="text-[8px] font-black text-brand-muted uppercase tracking-widest">Date</span>
                    <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="bg-transparent font-black outline-none text-brand-secondary cursor-pointer text-[10px] uppercase" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-4">
                    <StatCard label="Arrivals" value={reportData.checkIns.length} color="text-brand-primary" />
                    <DataColumn title="Expected Arrivals" data={reportData.checkIns} accentColor="text-brand-primary" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <StatCard label="Departures" value={reportData.checkOuts.length} color="text-brand-danger" />
                    <DataColumn title="Expected Departures" data={reportData.checkOuts} accentColor="text-brand-danger" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <StatCard label="In-House" value={reportData.stayOvers.length} color="text-brand-info" />
                    <DataColumn title="Current Stays" data={reportData.stayOvers} accentColor="text-brand-info" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <StatCard label="Vacant" value={reportData.vacantRooms.length} color="text-brand-muted" />
                    <DataColumn title="Available Now" data={reportData.vacantRooms} accentColor="text-brand-muted" isRoomOnly />
                  </div>
                </div>
              </div>
            )}

            {/* RANGE TAB */}
            {activeTab === 'range' && (
              <div className="animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-white border border-brand-surface rounded-ini px-4 py-2.5 shadow-sm flex items-center gap-3">
                      <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest">From</span>
                      <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="bg-transparent font-black outline-none text-brand-secondary text-[10px]" />
                    </div>
                    <span className="text-brand-muted font-black text-xs">→</span>
                    <div className="bg-white border border-brand-surface rounded-ini px-4 py-2.5 shadow-sm flex items-center gap-3">
                      <span className="text-[8px] font-black text-brand-danger uppercase tracking-widest">To</span>
                      <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="bg-transparent font-black outline-none text-brand-secondary text-[10px]" />
                    </div>
                  </div>
                  <StatCard label="Total Bookings" value={rangeData.length} color="text-brand-primary" />
                </div>
                <div className="ini-card bg-white overflow-hidden shadow-sm border border-brand-surface/50">
                  <div className="grid grid-cols-12 px-4 py-3 bg-brand-surface/50 text-[9px] font-black text-brand-muted uppercase">
                    <span className="col-span-4">Guest / Title</span>
                    <span className="col-span-2">Room</span>
                    <span className="col-span-3">Check-in</span>
                    <span className="col-span-3">Check-out</span>
                  </div>
                  <div className="divide-y divide-brand-surface">
                    {rangeData.length === 0 ? (
                      <div className="py-16 text-center text-brand-muted opacity-30 italic">No bookings in this range</div>
                    ) : (
                      rangeData.map((item: any) => (
                        <div key={item.id} className="grid grid-cols-12 px-4 py-4 items-center">
                          <span className="col-span-4 font-black text-brand-secondary text-[10px] uppercase truncate pr-4">{item.title}</span>
                          <span className="col-span-2 text-[10px] font-black uppercase text-brand-muted">{item.room?.name || '—'}</span>
                          <span className="col-span-3 text-[10px] font-medium tabular-nums">{new Date(item.start_time).toLocaleDateString('en-GB')}</span>
                          <span className="col-span-3 text-[10px] font-medium tabular-nums">{new Date(item.end_time).toLocaleDateString('en-GB')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* AUDIT TAB */}
            {activeTab === 'audit' && (
              <div className="animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black text-brand-secondary uppercase tracking-widest italic">
                    System Audit — Last {auditLimit} Entries
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-white border-2 border-brand-surface rounded-ini p-1">
                      {(['all', 'created', 'updated', 'deleted'] as const).map(a => (
                        <button
                          key={a}
                          onClick={() => setAuditAction(a)}
                          className={`px-3 py-1 rounded-ini font-black text-[9px] uppercase tracking-widest transition-all ${auditAction === a ? 'bg-brand-secondary text-white' : 'text-brand-muted hover:text-brand-secondary'}`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    <select
                      value={auditLimit}
                      onChange={(e) => setAuditLimit(Number(e.target.value))}
                      className="bg-white border-2 border-brand-surface rounded-ini px-3 py-1.5 font-black text-[10px] uppercase outline-none"
                    >
                      <option value={20}>Last 20</option>
                      <option value={50}>Last 50</option>
                      <option value={100}>Last 100</option>
                    </select>
                  </div>
                </div>

                <div className="ini-card bg-white shadow-sm border border-brand-surface/50 overflow-hidden">
                  <div className="grid grid-cols-12 px-4 py-3 bg-brand-surface/30 border-b border-brand-surface text-[8px] font-black text-brand-muted uppercase">
                    <span className="col-span-1">Act</span>
                    <span className="col-span-3">Guest / Title</span>
                    <span className="col-span-1 text-center">Room</span>
                    <span className="col-span-5 pl-4">Changes & History</span>
                    <span className="col-span-2 text-right">Date</span>
                  </div>

                  <div className="divide-y divide-brand-surface">
                    {(() => {
                      const filtered = auditAction === 'all' ? auditLogs : auditLogs.filter((l: any) => l.action === auditAction);
                      if (filtered.length === 0) return (
                        <div className="py-12 text-center text-brand-muted opacity-20 italic uppercase text-[7px]">No Logs Found</div>
                      );

                      return filtered.map((log: any) => {
                        const title = log.new_data?.title || log.old_data?.title || '—';
                        const diff: any[] = log.diff || [];
                        return (
                          <div key={log.id} className="grid grid-cols-12 px-4 py-4 items-start hover:bg-brand-surface/20 transition-all border-b border-brand-surface/10">
                            <div className="col-span-1">
                              <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${ACTION_STYLES[log.action] || 'bg-brand-surface text-brand-muted'}`}>
                                {log.action}
                              </span>
                            </div>
                            <span className="col-span-3 font-black text-brand-secondary text-[10px] uppercase truncate pr-4">
                              {title}
                            </span>
                            <div className="col-span-1 flex justify-center">
                              <span className="bg-brand-secondary/10 text-brand-secondary px-2 py-0.5 rounded text-[9px] font-black border border-brand-secondary/20">
                                {log.room || '—'}
                              </span>
                            </div>
                            <div className="col-span-5 flex flex-col gap-1.5 border-l border-brand-surface pl-4">
                              {diff.length === 0 ? (
                                <span className="text-[8px] text-brand-muted/40 italic uppercase tracking-tighter">
                                  {log.action === 'created' ? '• Initializing record' : '• System note: No field changes'}
                                </span>
                              ) : (
                                diff.map((d: any) => (
                                  <div key={d.field} className="flex items-center gap-2 text-[9px]">
                                    {/* Değişen satır burası: String(d.old) yerine formatDiffValue(d.old) kullanıyoruz */}
<div className="flex items-center bg-brand-surface/30 rounded px-1.5 py-0.5 border border-brand-surface shadow-sm overflow-hidden">
  <span className="text-brand-danger/60 line-through px-1 truncate max-w-[120px] text-[8px]">
    {formatDiffValue(d.old)}
  </span>
  <span className="text-brand-muted px-1 opacity-30">→</span>
  <span className="text-brand-primary font-bold px-1 truncate max-w-[120px] text-[8px]">
    {formatDiffValue(d.new)}
  </span>
</div>
                            
                                  </div>
                                ))
                              )}
                            </div>
                            <span className="col-span-2 text-right text-[8px] font-black text-brand-muted tabular-nums pt-0.5 italic">
                              {log.created_at ? new Date(log.created_at).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- HELPERS ---

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
      <div className="border-b-2 border-brand-surface pb-3">
        <h3 className={`font-black uppercase tracking-[0.1em] text-[10px] italic ${accentColor}`}>{title}</h3>
      </div>
      <div className="ini-card bg-white overflow-hidden shadow-sm border border-brand-surface/50 min-h-[100px]">
        <div className="divide-y divide-brand-surface">
          {isRoomOnly ? (
            data.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((room: any) => (
              <div key={room.id} className="px-4 py-3.5 flex justify-between items-center hover:bg-brand-surface/20 transition-all group">
                <span className="font-black text-brand-secondary text-[11px] tracking-tight">{room.name}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-success opacity-30 group-hover:opacity-100 transition-opacity" />
              </div>
            ))
          ) : (
            data.map((item: any) => (
              <div key={item.id} className="px-4 py-4 flex justify-between items-center hover:bg-brand-surface/20 transition-all">
                <span className="font-black text-brand-secondary uppercase truncate text-[10px] tracking-tight leading-none pr-2">{item.title}</span>
                <span className="text-[9px] font-black bg-brand-secondary text-white px-2 py-1 rounded-sm uppercase tracking-tighter shadow-sm shrink-0 ml-2">
                  {item.room?.name}
                </span>
              </div>
            ))
          )}
          {isEmpty && (
            <div className="py-12 text-center text-brand-muted font-black uppercase text-[7px] tracking-[0.3em] opacity-20 italic">Empty Log</div>
          )}
        </div>
      </div>
    </div>
  );
}
export default Reports