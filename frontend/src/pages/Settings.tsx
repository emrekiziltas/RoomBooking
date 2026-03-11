import { useEffect, useState } from "react";
import api from "../api/axios";

// Tip tanımlamaları
interface SettingItem {
  id: number;
  label: string;
  key: string;
  metadata: any;
  type_id: number;
  type?: {
    id: number;
    label: string;
  };
}

export function Settings() {
  const [groupedSettings, setGroupedSettings] = useState<Record<string, SettingItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings");
      const data = res.data.success ? res.data.data : res.data;
      
      if (Array.isArray(data)) {
        const groups = data.reduce((acc: any, item: SettingItem) => {
          // Senin JSON verindeki başlık "type.label"
          const typeName = item.type?.label || "General Settings";
          if (!acc[typeName]) acc[typeName] = [];
          acc[typeName].push(item);
          return acc;
        }, {});
        
        setGroupedSettings(groups);
        
        // İlk grubu açık başlat
        const keys = Object.keys(groups);
        if (keys.length > 0) setExpandedTypes({ [keys[0]]: true });
      }
    } catch (err) {
      console.error("Hata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const toggleType = (typeName: string) => {
    setExpandedTypes(prev => ({ ...prev, [typeName]: !prev[typeName] }));
  };

  // Metadata içeriğini okumak için yardımcı fonksiyon
  const getMetaValue = (meta: any) => {
    if (!meta) return "";
    if (typeof meta === 'string') {
        try {
            const parsed = JSON.parse(meta);
            return parsed.value || meta;
        } catch { return meta; }
    }
    return meta.value || JSON.stringify(meta);
  };

  const handleUpdate = async (item: SettingItem) => {
    setUpdatingId(item.id);
    try {
      const labelInput = document.getElementById(`label-${item.id}`) as HTMLInputElement;
      const keyInput = document.getElementById(`key-${item.id}`) as HTMLInputElement;
      const metaInput = document.getElementById(`meta-${item.id}`) as HTMLInputElement;

      const payload: any = { 
        label: labelInput.value, 
        key: keyInput.value 
      };

      // Eğer metadata inputu varsa payload'a ekle
      if (metaInput) {
        payload.metadata = (item.metadata && typeof item.metadata === 'object') 
          ? { ...item.metadata, value: metaInput.value } 
          : { value: metaInput.value };
      }

      await api.put(`/settings/${item.id}`, payload); 
      alert("Saved Successfully!");
    } catch (err) {
      alert("Update Failed!");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div className="p-10 text-center font-black animate-pulse">LOADING ENGINE...</div>;

  return (
    <div className="min-h-screen bg-brand-surface p-8 font-brand">
      <div className="max-w-7xl mx-auto mb-10 border-b-2 border-slate-100 pb-6">
        <h1 className="text-4xl font-black text-brand-secondary uppercase italic">System <span className="text-brand-primary">Engine</span></h1>
      </div>

      <div className="max-w-7xl mx-auto space-y-4">
        {Object.entries(groupedSettings).map(([typeName, items]) => {
          // Sadece "System Settings" grubunda Metadata görünsün
          const isSystemSetting = typeName === "System Settings";

          return (
            <div key={typeName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <button 
                onClick={() => toggleType(typeName)}
                className="w-full px-8 py-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="bg-brand-primary text-white text-[10px] px-2 py-1 rounded italic font-black">{items.length}</span>
                  <h2 className="text-lg font-black uppercase italic text-slate-700">{typeName}</h2>
                </div>
                <span className={`transform transition-transform ${expandedTypes[typeName] ? 'rotate-180' : ''}`}>▼</span>
              </button>

              <div className={`transition-all ${expandedTypes[typeName] ? 'block' : 'hidden'}`}>
                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-50">
                        <th className="px-6 py-4">Key</th>
                        <th className="px-6 py-4">Label</th>
                        {isSystemSetting && <th className="px-6 py-4">Value (Metadata)</th>}
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold italic">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <input id={`key-${item.id}`} defaultValue={item.key} className="bg-transparent border-b border-transparent focus:border-brand-primary outline-none w-full text-slate-400 font-mono text-xs" />
                          </td>
                          <td className="px-6 py-4">
                            <input id={`label-${item.id}`} defaultValue={item.label} className="bg-transparent border-b border-transparent focus:border-brand-primary outline-none w-full" />
                          </td>
                          {isSystemSetting && (
                            <td className="px-6 py-4">
                              <input 
                                id={`meta-${item.id}`} 
                                defaultValue={getMetaValue(item.metadata)}
                                className="w-full bg-slate-100 rounded px-3 py-1 text-xs font-black text-brand-primary outline-none" 
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleUpdate(item)} 
                              className="bg-brand-secondary text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-brand-primary transition-all"
                            >
                              {updatingId === item.id ? "..." : "SAVE"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}