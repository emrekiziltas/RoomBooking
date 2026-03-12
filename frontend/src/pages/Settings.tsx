import { useEffect, useState } from "react";
import api from "../api/axios";

const COLOR_GROUPS = [
  "slate", "gray", "red", "orange", "amber", "yellow", "lime", 
  "green", "emerald", "teal", "cyan", "sky", "blue", 
  "indigo", "violet", "purple", "fuchsia", "pink", "rose"
];
const TONES = [100, 400, 700]; 

export function Settings() {
  const [groupedSettings, setGroupedSettings] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [activePicker, setActivePicker] = useState<number | null>(null);
  const [tempColors, setTempColors] = useState<Record<number, string>>({});

  const fetchSettings = async () => {
    try {
      const res = await api.get("/settings");
      const rawData = res.data.success ? res.data.data : [];
      const filteredData = rawData.filter((item: any) => item.icon == 1);

      const initialColors: Record<number, string> = {};
      filteredData.forEach((item: any) => {
        if (item.bg_color_class) {
          const rawValue = item.bg_color_class.trim().split(' ')[0];
          const formattedColor = rawValue.startsWith('text-') 
            ? rawValue.replace('text-', 'bg-') 
            : rawValue;
          initialColors[item.id] = formattedColor;
        }
      });
      
      setTempColors(initialColors);

      const groups = filteredData.reduce((acc: any, item: any) => {
        const typeName = item.type?.label || "General";
        if (!acc[typeName]) acc[typeName] = [];
        acc[typeName].push(item);
        return acc;
      }, {});

      setGroupedSettings(groups);
      if (Object.keys(groups).length > 0 && Object.keys(expandedTypes).length === 0) {
        setExpandedTypes({ [Object.keys(groups)[0]]: true });
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleUpdate = async (item: any) => {
    setUpdatingId(item.id);
    const labelVal = (document.getElementById(`label-${item.id}`) as HTMLInputElement).value;
    const currentColor = tempColors[item.id] || item.bg_color_class || "bg-slate-100";
    const dbFriendlyColor = currentColor.replace('bg-', 'text-');

    try {
      await api.put(`/settings/${item.id}`, { label: labelVal, bg_color_class: dbFriendlyColor });
      fetchSettings();
      alert("Kaydedildi!");
    } catch (err) { alert("Hata!"); } finally { setUpdatingId(null); }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase italic">Loading System...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      {/* 1. ÜST HEADER: MARKA KİMLİĞİ */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-brand-surface pb-6">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-black text-brand-secondary uppercase italic leading-none">
             * <span className="text-brand-primary">Settings</span>
          </h1>
          <p className="text-brand-muted text-[10px] font-black uppercase tracking-[0.3em] mt-1">
            Resource Control & Dynamic Scheduling
          </p>
        </div>
        <div className="hidden md:block">
          <span className="bg-brand-surface px-4 py-1.5 rounded-full text-[9px] font-black text-brand-muted uppercase tracking-widest border border-brand-surface">
            System Configuration Mode
          </span>
        </div>
      </header>

      {/* 2. AYAR GRUPLARI */}
      {Object.entries(groupedSettings).map(([typeName, items]) => {
        const isFloorGroup = typeName.toLowerCase().includes("floor") || items[0]?.type?.key === "floor";

        return (
          <section key={typeName} className="border-2 border-slate-200 rounded-[2.5rem] bg-white shadow-xl mb-8 overflow-visible relative">
            <div 
              onClick={() => setExpandedTypes(p => ({...p, [typeName]: !p[typeName]}))}
              className="p-6 flex justify-between items-center cursor-pointer bg-slate-50 border-b border-slate-100 rounded-t-[2.5rem]"
            >
              <span className="font-black text-slate-800 uppercase tracking-widest">{typeName}</span>
              <span className="text-slate-400 font-bold">{expandedTypes[typeName] ? '▲' : '▼'}</span>
            </div>

            {expandedTypes[typeName] && (
              <div className="p-8 overflow-visible">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[11px] text-slate-400 font-black uppercase tracking-widest">
                      <th className="pb-6 text-left pl-4">Key & Label</th>
                      {isFloorGroup && <th className="pb-6 text-center w-32">Color</th>}
                      <th className="pb-6 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="overflow-visible">
                    {items.map((item) => {
                      const currentColor = tempColors[item.id] || "bg-slate-100";
                      const isDark = currentColor.includes("700");

                      return (
                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-all overflow-visible">
                          <td className="py-6 pl-4">
                            <div className="flex items-center gap-4">
                              <span className={`text-[10px] font-mono font-black px-3 py-1.5 rounded-xl border-2 shadow-sm shrink-0 ${currentColor} ${isDark ? 'text-white border-black/10' : 'text-slate-800 border-black/5'}`}>
                                {item.key}
                              </span>
                              <input 
                                id={`label-${item.id}`} 
                                defaultValue={item.label} 
                                className="font-bold text-slate-800 bg-transparent outline-none flex-1 border-b-2 border-transparent focus:border-blue-500 px-2 py-1"
                              />
                            </div>
                          </td>

                          {isFloorGroup && (
                            <td className="py-6 text-center overflow-visible">
                              <div className="relative inline-block">
                                <button 
                                  onClick={() => setActivePicker(activePicker === item.id ? null : item.id)}
                                  className={`w-12 h-12 rounded-2xl border-4 border-white shadow-lg transition-transform hover:scale-110 active:scale-90 ${currentColor}`}
                                />
                                
                                {activePicker === item.id && (
                                  <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[99999] p-5 bg-white border-2 border-slate-900 shadow-[0_30px_90px_rgba(0,0,0,0.4)] rounded-[1.5rem] w-[580px] animate-in zoom-in-95 fade-in duration-200">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Color Matrix v4.0</span>
                                      <button onClick={() => setActivePicker(null)} className="text-slate-400 hover:text-red-500 font-bold px-2">✕</button>
                                    </div>

                                    <div className="grid grid-cols-5 gap-3"> 
                                      {COLOR_GROUPS.map(color => (
                                        <div key={color} className="flex flex-col gap-1">
                                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter truncate text-left">{color}</span>
                                          <div className="flex gap-0.5 h-7">
                                            {TONES.map(tone => (
                                              <button 
                                                key={`${color}-${tone}`}
                                                onClick={() => {
                                                  setTempColors(p => ({...p, [item.id]: `bg-${color}-${tone}`}));
                                                  setActivePicker(null);
                                                }}
                                                className={`flex-1 bg-${color}-${tone} hover:z-10 hover:scale-125 border border-black/5 transition-all duration-150 relative group/btn`}
                                              >
                                                <span className={`absolute inset-0 flex items-center justify-center text-[6px] font-bold opacity-0 group-hover/btn:opacity-100 transition-opacity ${tone === 700 ? 'text-white' : 'text-slate-900'}`}>
                                                  {tone}
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    <div className="mt-4 flex justify-between items-center text-[7px] font-black text-slate-300 uppercase italic">
                                      <span>* Hover for tone values (100, 400, 700)</span>
                                      <span>Direct Injection Mode</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}

                          <td className="py-6 text-right pr-4">
                            <button 
                              disabled={updatingId === item.id}
                              onClick={() => handleUpdate(item)}
                              className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50"
                            >
                              {updatingId === item.id ? '...' : 'SAVE'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}