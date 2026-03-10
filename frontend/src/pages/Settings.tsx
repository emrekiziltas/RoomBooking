import { useEffect, useState } from "react";
import api from "../api/axios";

interface SettingItem {
  id: number;
  label: string;
  key: string;
  metadata: any;
  type_id?: number;
}

export function Settings() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings");
      const data = res.data.success ? res.data.data : res.data;
      if (Array.isArray(data)) {
        setSettings(data);
      }
    } catch (err) {
      console.error("Ayarlar yüklenirken hata oluştu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (item: SettingItem) => {
    setUpdatingId(item.id);

    // 1. Inputlardan güncel değerleri al
    const labelVal = (document.getElementById(`label-${item.id}`) as HTMLInputElement).value;
    const keyVal = (document.getElementById(`key-${item.id}`) as HTMLInputElement).value;
    const metaVal = (document.getElementById(`meta-${item.id}`) as HTMLInputElement).value;

    // 2. Metadata objesini hazırla
    const finalMeta = (item.metadata && typeof item.metadata === 'object') 
      ? { ...item.metadata, value: metaVal } 
      : { value: metaVal };

    const payload = {
      label: labelVal,
      key: keyVal,
      metadata: finalMeta
    };

    console.log("🚀 API'ye Giden Veri (Payload):", payload);

    try {
      const response = await api.put(`/settings/${item.id}`, payload);
      console.log("✅ Backend Yanıtı:", response.data);

      // 3. Başarılıysa Local State'i güncelle (Arayüz yenilenir)
      setSettings(prev => 
        prev.map(s => s.id === item.id 
          ? { ...s, label: labelVal, key: keyVal, metadata: finalMeta } 
          : s
        )
      );

      alert("DB Başarıyla Güncellendi ✓");
    } catch (err) {
      console.error("❌ Güncelleme hatası:", err);
      alert("Hata oluştu! Console loglarına bakınız.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-brand-surface font-brand uppercase italic font-black animate-pulse text-slate-400">
      Syncing System Data...
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-surface p-8 font-brand">
      <div className="max-w-7xl mx-auto mb-10 border-b-2 border-slate-100 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-brand-secondary uppercase tracking-tighter italic">
            Global <span className="text-brand-primary">Settings</span>
          </h1>
          <p className="text-slate-400 font-black text-[9px] tracking-[0.4em] uppercase mt-3 italic">Live Database Management</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400">
              <th className="px-8 py-6">ID</th>
              <th className="px-8 py-6">Wording / Label</th>
              <th className="px-8 py-6">System Key</th>
              <th className="px-8 py-6">Value (Meta)</th>
              <th className="px-8 py-6 text-right">Operation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {settings.map((item) => (
              <tr key={item.id} className="group hover:bg-brand-primary/5 transition-all italic font-bold">
                <td className="px-8 py-5 text-slate-300 font-mono text-xs">#{item.id}</td>
                <td className="px-8 py-5">
                  <input id={`label-${item.id}`} defaultValue={item.label} className="w-full border-2 border-slate-100 rounded-xl px-4 py-2 focus:border-brand-primary outline-none" />
                </td>
                <td className="px-8 py-5">
                  <input id={`key-${item.id}`} defaultValue={item.key} className="w-full border-none bg-transparent text-xs font-mono text-slate-400 outline-none focus:text-brand-primary" />
                </td>
                <td className="px-8 py-5">
                  <input 
                    id={`meta-${item.id}`} 
                    defaultValue={item.metadata?.value || (typeof item.metadata === 'string' ? item.metadata : "")} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-black text-brand-primary outline-none" 
                  />
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => handleUpdate(item)} 
                    disabled={updatingId === item.id}
                    className="bg-brand-secondary text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-brand-primary transition-all disabled:opacity-30"
                  >
                    {updatingId === item.id ? "COMMITING..." : "COMMIT UPDATE"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}