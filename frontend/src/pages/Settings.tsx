import { useEffect, useState } from "react";
import api from "../api/axios";
import { PageHeader } from "../components/PageHeader";

const COLOR_GROUPS = [
  "slate", "gray", "zinc", "red", "orange", "amber", "yellow", "lime", 
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
    } catch (err) { alert("Action Failed!"); } finally { setUpdatingId(null); }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-brand font-black text-brand-secondary animate-pulse text-xl uppercase tracking-widest">
      Accessing System Core...
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-surface font-brand">
      
      {/* 1. HEADER SECTION */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-brand-surface pb-4">
          <div className="flex-1 w-full">
            <PageHeader highlight="SYSTEM" title="SETTINGS" />
          </div>
          <div className="pb-[2px] mt-4 md:mt-0">
             <p className="text-brand-muted font-black uppercase text-[8px] tracking-[0.3em]">Core Configuration & Matrix Control</p>
          </div>
        </div>
      </div>

      {/* 2. CONTENT SECTION */}
      <div className="max-w-7xl mx-auto px-4 mt-8 pb-20 space-y-4">
        {Object.entries(groupedSettings).map(([typeName, items]) => {
          const isFloorGroup = typeName.toLowerCase().includes("floor") || items[0]?.type?.key === "floor";

          return (
            <section key={typeName} className="ini-card bg-white overflow-visible">
              <div
                onClick={() => setExpandedTypes(p => ({ ...p, [typeName]: !p[typeName] }))}
                className="p-5 flex justify-between items-center cursor-pointer bg-brand-surface/30 hover:bg-brand-surface/50 transition-colors border-b border-brand-surface"
              >
                <span className="font-black text-brand-secondary uppercase text-[11px] tracking-[0.2em]">{typeName}</span>
                <span className="text-brand-muted font-black text-[10px]">{expandedTypes[typeName] ? 'HIDE —' : 'SHOW +'}</span>
              </div>

              {expandedTypes[typeName] && (
                <div className="p-2 md:p-6 overflow-visible">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-[9px] text-brand-muted font-black uppercase tracking-[0.2em] border-b border-brand-surface">
                        <th className="pb-4 text-left pl-4 w-1/2">Resource & Identifier</th>
                        {isFloorGroup && <th className="pb-4 text-center w-32">Visual Tag</th>}
                        <th className="pb-4 text-right pr-4">Execution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-surface">
                      {items.map((item) => {
                        const currentColor = tempColors[item.id] || "bg-slate-100";
                        const isDark = currentColor.includes("700");

                        return (
                          <tr key={item.id} className="group hover:bg-brand-surface/20 transition-all">
                            <td className="py-5 pl-4">
                              <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <span className={`text-[9px] font-mono font-black px-3 py-1 rounded-sm border shrink-0 text-center ${currentColor} ${isDark ? 'text-white border-black/10' : 'text-brand-secondary border-brand-surface'}`}>
                                  {item.key}
                                </span>
                                <input
                                  id={`label-${item.id}`}
                                  defaultValue={item.label}
                                  className="font-black text-brand-secondary bg-transparent outline-none flex-1 border-b border-transparent focus:border-brand-primary px-1 py-1 text-sm uppercase tracking-tight"
                                />
                              </div>
                            </td>

                            {isFloorGroup && (
                              <td className="py-5 text-center overflow-visible">
                                <div className="relative inline-block">
                                  <button
                                    onClick={() => setActivePicker(activePicker === item.id ? null : item.id)}
                                    className={`w-10 h-10 rounded-ini border-2 border-white shadow-sm transition-transform hover:scale-110 active:scale-95 ${currentColor}`}
                                  />

                                  {activePicker === item.id && (
                                    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] p-4 bg-white border border-brand-secondary shadow-2xl rounded-ini w-[300px] md:w-[500px] animate-in zoom-in-95 duration-200">
                                      <div className="flex justify-between items-center mb-4 border-b border-brand-surface pb-2">
                                        <span className="text-[8px] font-black text-brand-secondary uppercase tracking-widest italic">Color Matrix Selection</span>
                                        <button onClick={() => setActivePicker(null)} className="text-brand-muted hover:text-brand-danger font-black text-xs">✕</button>
                                      </div>

                                      <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
                                        {COLOR_GROUPS.map(color => (
                                          <div key={color} className="flex flex-col gap-1">
                                            <span className="text-[6px] font-black text-brand-muted uppercase truncate">{color}</span>
                                            <div className="flex gap-0.5 h-6">
                                              {TONES.map(tone => (
                                                <button
                                                  key={`${color}-${tone}`}
                                                  onClick={() => {
                                                    setTempColors(p => ({ ...p, [item.id]: `bg-${color}-${tone}` }));
                                                    setActivePicker(null);
                                                  }}
                                                  className={`flex-1 bg-${color}-${tone} hover:z-10 hover:scale-125 border border-black/5 transition-all relative group/btn`}
                                                />
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}

                            <td className="py-5 text-right pr-4">
                              <button
                                disabled={updatingId === item.id}
                                onClick={() => handleUpdate(item)}
                                className="bg-brand-secondary text-white px-6 py-2.5 rounded-ini text-[9px] font-black tracking-widest hover:bg-brand-primary transition-all disabled:opacity-50 shadow-sm active:scale-95"
                              >
                                {updatingId === item.id ? '...' : 'COMMIT'}
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
    </div>
  );
}