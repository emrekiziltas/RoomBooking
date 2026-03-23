import { useState, useEffect, useMemo } from 'react';
import { getBookings } from '../api/bookings';
import { getRooms, getAuditLogs } from '../api/rooms';
import { getLookupValues } from '../api/lookups'; 
import { PageHeader } from "../components/PageHeader";

const ACTION_STYLES: Record<string, string> = {
  created: 'bg-emerald-100 text-emerald-700',
  updated: 'bg-amber-100 text-amber-700',
  deleted: 'bg-rose-100 text-rose-700',
  moved: 'bg-blue-100 text-blue-700',
};

const FIELD_LABELS: Record<string, string> = {
  snapshot_guest_name: 'Guest Name',
  room_id: 'Room Number',
  check_in: 'Check-in Date',
  check_out: 'Check-out Date',
  status: 'Booking Status',
  snapshot_is_vip: 'VIP Status',
  snapshot_guest_role_id: 'Guest Role',
};

export function Reports() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [guestRoles, setGuestRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'audit'>('daily');
  const [auditLimit, setAuditLimit] = useState(20);
  const [reportDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. ROLE MAP
  const roleMap = useMemo(() => {
    const map: Record<string, string> = {};
    const rawData = Array.isArray(guestRoles) ? guestRoles : (guestRoles as any)?.data || [];
    rawData.forEach((r: any) => { if (r.id) map[String(r.id)] = r.label; });
    return map;
  }, [guestRoles]);

  // 2. ROOM MAP
  const roomMap = useMemo(() => {
    const map: Record<string, string> = {};
    const rawData = Array.isArray(rooms) ? rooms : (rooms as any)?.data || [];
    rawData.forEach((r: any) => { if (r.id) map[String(r.id)] = r.name || r.room_number; });
    return map;
  }, [rooms]);

  // 3. FORMATTER
  const formatValue = (val: any, field?: string) => {
    if (val === null || val === undefined || val === '') return '—';
    const sVal = String(val);
    if (field === 'snapshot_guest_role_id') return roleMap[sVal] ? roleMap[sVal].toUpperCase() : `ID: ${sVal}`;
    if (field === 'room_id') return roomMap[sVal] ? `ROOM ${roomMap[sVal]}` : `RM: ${sVal}`;
    if (field === 'snapshot_is_vip') return (sVal === '1' || sVal === 'true' || val === true) ? '🌟 VIP' : 'NO';
    if (sVal.includes('-') && sVal.includes('T')) return sVal.split('T')[0];
    return sVal.toUpperCase();
  };

  // 4. DATA FETCHING
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [bRes, rRes, lRes] = await Promise.allSettled([
          getBookings(),
          getRooms(),
          getLookupValues(6)
        ]);
        if (bRes.status === 'fulfilled') setBookings(bRes.value.data || bRes.value || []);
        if (rRes.status === 'fulfilled') setRooms(rRes.value.data || rRes.value || []);
        if (lRes.status === 'fulfilled') setGuestRoles(lRes.value.data || lRes.value || []);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      getAuditLogs(auditLimit)
        .then(res => setAuditLogs(Array.isArray(res) ? res : res.data || []))
        .catch(() => setAuditLogs([]));
    }
  }, [activeTab, auditLimit]);

  // 5. KPI & TABLE CALCULATIONS
  const stats = useMemo(() => {
    const todayIns = bookings.filter(b => b.check_in?.startsWith(reportDate));
    const todayOuts = bookings.filter(b => b.check_out?.startsWith(reportDate));
    const totalRooms = rooms.length;
    const occupied = bookings.filter(b => 
      reportDate >= (b.check_in?.split('T')[0]) && reportDate < (b.check_out?.split('T')[0])
    );
    const occupancyRate = totalRooms > 0 ? Math.round((occupied.length / totalRooms) * 100) : 0;
    const vips = occupied.filter(b => b.snapshot_is_vip).length;

    return { todayIns, todayOuts, occupancyRate, vips, occupied, totalRooms };
  }, [bookings, rooms, reportDate]);

  return (
    <div className="min-h-screen bg-brand-surface font-brand p-6">
      <PageHeader highlight="MANAGEMENT" title="OPERATIONAL REPORTS" subtitle="Audit Logs & Status" />

      {/* KPI SECTION */}
      {activeTab === 'daily' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 animate-in fade-in slide-in-from-top-4">
          <KPICard title="Occupancy" value={`${stats.occupancyRate}%`} sub={`${stats.occupied.length}/${stats.totalRooms} Rooms`} color="border-brand-primary" />
          <KPICard title="Today's Arrivals" value={stats.todayIns.length} sub="Check-ins" color="border-emerald-500" />
          <KPICard title="Today's Departures" value={stats.todayOuts.length} sub="Check-outs" color="border-rose-500" />
          <KPICard title="VIP Guests" value={stats.vips} sub="Currently In-House" color="border-amber-500" />
        </div>
      )}

      {/* TABS */}
      <div className="mt-8 flex gap-2 bg-white p-1 border-2 border-brand-surface rounded-ini w-fit shadow-sm">
        {(['daily', 'audit'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-2.5 rounded-ini text-[11px] font-black uppercase transition-all ${activeTab === tab ? 'bg-brand-secondary text-white shadow-md' : 'text-brand-muted hover:bg-brand-surface'}`}>
            {tab === 'daily' ? 'Live Status' : 'Audit Trail'}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-t-brand-secondary rounded-full animate-spin" /></div>
        ) : activeTab === 'daily' ? (
          <div className="bg-white border-2 border-brand-surface rounded-ini overflow-hidden shadow-sm animate-in fade-in">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-surface/30 text-[10px] font-black uppercase text-brand-secondary">
                  <th className="p-4">Guest & Role</th>
                  <th className="p-4">Room</th>
                  <th className="p-4">Check-In</th>
                  <th className="p-4">Check-Out</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-surface">
                {stats.occupied.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-[10px] font-bold opacity-30 uppercase">No active bookings for today</td></tr>
                ) : (
                  stats.occupied.map((b) => (
                    <tr key={b.id} className="hover:bg-brand-surface/10 transition-colors text-[11px]">
                      <td className="p-4">
                        <div className="font-black text-brand-secondary uppercase">{b.snapshot_guest_name || 'N/A'}</div>
                        <div className="text-[8px] font-bold text-brand-muted uppercase">{formatValue(b.snapshot_guest_role_id, 'snapshot_guest_role_id')}</div>
                      </td>
                      <td className="p-4 font-black text-brand-primary">{roomMap[String(b.room_id)] || 'TBA'}</td>
                      <td className="p-4 font-bold text-brand-muted">{formatValue(b.check_in)}</td>
                      <td className="p-4 font-bold text-brand-muted">{formatValue(b.check_out)}</td>
                      <td className="p-4 text-right">
                        <span className={`px-2 py-1 rounded-[4px] text-[8px] font-black uppercase ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-surface text-brand-muted'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* AUDIT TRAIL TAB */
          <div className="bg-white border-2 border-brand-surface rounded-ini overflow-hidden shadow-sm">
            <div className="flex justify-between items-center p-4 bg-brand-surface/20 border-b">
              <h4 className="text-[10px] font-black uppercase text-brand-secondary">System Audit Trail</h4>
              <select value={auditLimit} onChange={e => setAuditLimit(Number(e.target.value))} className="text-[10px] font-bold border rounded px-2 py-1 outline-none">
                <option value={20}>Last 20</option>
                <option value={50}>Last 50</option>
              </select>
            </div>
            <div className="divide-y divide-brand-surface">
              {auditLogs.map((log: any) => {
                const oldD = log.old_data || {};
                const newD = log.new_data || {};
                const diffs = log.action === 'updated' ? Object.keys(FIELD_LABELS).filter(k => String(oldD[k]) !== String(newD[k])) : [];

                return (
                  <div key={log.id} className="grid grid-cols-12 p-5 gap-4 hover:bg-brand-surface/5 transition-colors items-start">
                    <div className="col-span-1">
                      <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${ACTION_STYLES[log.action]}`}>{log.action}</span>
                    </div>
                    <div className="col-span-3">
                      <p className="font-black text-[11px] text-brand-secondary uppercase truncate">
                        {log.action === 'deleted' ? (oldD.snapshot_guest_name || 'Removed') : (newD.snapshot_guest_name || 'System')}
                      </p>
                      <p className="text-[8px] text-brand-muted font-bold mt-1">LOG #{log.id} • B-ID: {log.booking_id}</p>
                    </div>
                    <div className="col-span-6 border-l pl-5">
                      {log.action === 'deleted' ? (
                        <div className="p-3 bg-rose-50 border-l-4 border-rose-400 rounded-r-ini shadow-sm text-[10px]">
                          <span className="text-[7px] font-black text-white uppercase bg-rose-500 px-2 py-0.5 rounded shadow-sm mb-2 inline-block">Permanent Deletion</span>
                          <div className="grid grid-cols-2 gap-2">
                             <div className="font-black text-rose-900 uppercase">{oldD.snapshot_guest_name}</div>
                             <div className="text-right text-rose-800 italic">{formatValue(oldD.check_in)} → {formatValue(oldD.check_out)}</div>
                          </div>
                        </div>
                      ) : log.action === 'created' ? (
                        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-400 rounded-r-ini shadow-sm text-[10px] text-emerald-900 leading-relaxed">
                          <span className="text-[7px] font-black text-white uppercase bg-emerald-500 px-2 py-0.5 rounded shadow-sm mb-2 inline-block">New Entry Created</span>
                          <br />Booking for <span className="font-black">{newD.snapshot_guest_name}</span> in <span className="font-black">{formatValue(newD.room_id, 'room_id')}</span>.
                        </div>
                      ) : diffs.length > 0 ? (
                        <div className="space-y-2">
                          <span className="text-[7px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-100 mb-1 inline-block">Field Modifications</span>
                          {diffs.map(k => (
                            <div key={k} className="flex flex-col gap-1 border-b border-brand-surface/30 pb-1 last:border-0">
                              <span className="text-[7px] font-black text-brand-muted uppercase">{FIELD_LABELS[k] || k}</span>
                              <div className="flex items-center gap-2 text-[9px] font-bold">
                                <span className="text-rose-500 line-through opacity-60 bg-rose-50 px-1 rounded">{formatValue(oldD[k], k)}</span>
                                <span className="text-brand-muted">→</span>
                                <span className="text-emerald-600 bg-emerald-50 px-1 rounded">{formatValue(newD[k], k)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[9px] text-brand-muted opacity-50 italic py-2">Operational metadata synchronized.</div>
                      )}
                    </div>
                    <div className="col-span-2 text-right text-[9px] font-bold text-brand-muted">
                      {new Date(log.created_at).toLocaleString('tr-TR')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ title, value, sub, color }: any) {
  return (
    <div className={`bg-white border-2 border-brand-surface border-t-4 ${color} p-5 rounded-ini shadow-sm`}>
      <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">{title}</p>
      <h2 className="text-2xl font-black text-brand-secondary mt-1">{value}</h2>
      <p className="text-[9px] font-bold text-brand-muted/60 mt-1 uppercase">{sub}</p>
    </div>
  );
}

export default Reports;