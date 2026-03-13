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
    setLoading(true);
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
    
    // Değerleri DOM'dan alıyoruz
    const labelVal = (document.getElementById(`label-${item.id}`) as HTMLInputElement).value;
    const metadataInput = document.getElementById(`metadata-${item.id}`) as HTMLInputElement;
    
    const currentColor = tempColors[item.id] || item.bg_color_class || "bg-slate-100";
    const dbFriendlyColor = currentColor.replace('bg-', 'text-');

    const payload: any = { 
      label: labelVal, 
      bg_color_class: dbFriendlyColor 
    };

    // Eğer metadata varsa payload'a ekle (genelde object formatında beklenir)
    if (metadataInput) {
      payload.metadata = metadataInput.value;
    }

    try {
      await api.put(`/settings/${item.id}`, payload);
      fetchSettings();
    } catch (err) { 
      alert("Action Failed!"); 
    } finally { 
      setUpdatingId(null); 
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface font-brand">
      
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

      <div className="max-w-7xl mx-auto px-4 mt-8 pb-20 space-y-4">
        {loading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center">
             <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4" />
             <p className="text-brand-secondary font-black text-[9px] uppercase tracking-[0.4em] animate-pulse">Syncing Matrix...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {Object.entries(groupedSettings).map(([typeName, items]) => {
              const isFloorGroup = typeName.toLowerCase().includes("floor") || items[0]?.type?.key === "floor";

              return (
                <section key={typeName} className="ini-card bg-white mb-6 overflow-visible">
                  <div
                    onClick={() => setExpandedTypes(p => ({ ...p, [typeName]: !p[typeName] }))}
                    className="p-5 flex justify-between items-center cursor-pointer bg-brand-surface/30 hover:bg-brand-surface/50 transition-colors border-b border-brand-surface"
                  >
                    <span className="font-black text-brand-secondary uppercase text-[11px] tracking-[0.2em]">{typeName}</span>
                    <span className="text-brand-muted font-black text-[10px]">{expandedTypes[typeName] ? 'HIDE —' : 'SHOW +'}</span>
                  </div>

                  {expandedTypes[typeName] && (
                    <div className="p-2 md:p-6 overflow-visible">
                      <table className="w-full">
                        <thead>
                          <tr className="text-[9px] text-brand-muted font-black uppercase tracking-[0.2em] border-b border-brand-surface text-left">
                            <th className="pb-4 pl-4">Resource Identifier</th>
                            <th className="pb-4">Label & Display Name</th>
                            <th className="pb-4">Metadata / Value</th>
                            {isFloorGroup && <th className="pb-4 text-center">Color</th>}
                            <th className="pb-4 text-right pr-4">Action</th>
                          </tr>
                        </thead>

<tbody className="divide-y divide-brand-surface">
  {items.map((item) => {
    const currentColor = tempColors[item.id] || "bg-slate-100";
    const isDark = currentColor.includes("700");
    
    // Sadece "System Settings" grubundaysak metadata alanını göster
    const isSystemSetting = typeName.toLowerCase().includes("system") || item.type?.key === "system_setting";

    return (
      <tr key={item.id} className="group hover:bg-brand-surface/20">
        <td className="py-5 pl-4">
          <span className={`text-[9px] font-mono font-black px-3 py-1 rounded-sm border ${currentColor} ${isDark ? 'text-white border-black/10' : 'text-brand-secondary border-brand-surface'}`}>
            {item.key}
          </span>
        </td>

        <td className="py-5">
          <input
            id={`label-${item.id}`}
            defaultValue={item.label}
            className="font-black text-brand-secondary bg-transparent outline-none w-full border-b border-transparent focus:border-brand-primary text-sm uppercase"
          />
        </td>

        {/* KOŞULLU METADATA ALANI */}
        <td className="py-5">
          {isSystemSetting ? (
            <input
              id={`metadata-${item.id}`}
              defaultValue={typeof item.metadata === 'object' ? item.metadata?.value : item.metadata}
              placeholder="Value..."
              className="font-mono text-[11px] text-brand-primary bg-brand-primary/5 px-2 py-1 rounded outline-none w-3/4 border border-brand-primary/10 focus:border-brand-primary focus:bg-white transition-all"
            />
          ) : (
            <span className="text-[8px] text-brand-muted/30 italic uppercase font-black tracking-widest">Static</span>
          )}
        </td>

        {/* Kat ayarlarıysa renk seçiciyi göster */}
        {isFloorGroup && (
          <td className="py-5 text-center">
            {/* Renk seçici butonu buraya gelecek */}
          </td>
        )}

        <td className="py-5 text-right pr-4">
          <button
            disabled={updatingId === item.id}
            onClick={() => handleUpdate(item)}
            className="bg-brand-secondary text-white px-5 py-2 rounded-ini text-[9px] font-black tracking-widest hover:bg-brand-primary active:scale-95 transition-all"
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
        )}
      </div>
    </div>
  );
}