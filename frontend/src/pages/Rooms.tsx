import { useEffect, useState } from 'react';
import { getRooms, updateRoom } from '../api/rooms';
import type { Room } from '../types/index';

const FLOORS: Record<string, { label: string; color: string; border: string; bg: string }> = {
  F: { label: 'First Floor', color: 'text-blue-700', border: 'border-blue-500', bg: 'bg-blue-50' },
  M: { label: 'Mezzanine Floor', color: 'text-green-700', border: 'border-green-500', bg: 'bg-green-50' },
  S: { label: 'Second Floor', color: 'text-orange-700', border: 'border-orange-500', bg: 'bg-orange-50' },
};

export function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ room: Room } | null>(null);
  const [formData, setFormData] = useState<{capacity: number, features: Record<string, boolean>}>({ 
    capacity: 1, 
    features: {} 
  });
  const [saving, setSaving] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await getRooms();
      setRooms(response.data || []);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const openEditModal = (room: Room) => {
    setEditModal({ room });
    setFormData({ capacity: room.capacity, features: room.features || {} });
  };

  const addNewFeature = () => {
    if (!newFeatureName.trim()) return;
    const key = newFeatureName.trim().toLowerCase().replace(/\s+/g, '_');
    setFormData(prev => ({
      ...prev,
      features: { ...prev.features, [key]: true }
    }));
    setNewFeatureName('');
  };

  const toggleFeature = (key: string, isChecked: boolean) => {
    const updatedFeatures = { ...formData.features };
    if (isChecked) { updatedFeatures[key] = true; } 
    else { delete updatedFeatures[key]; }
    setFormData({ ...formData, features: updatedFeatures });
  };

  const handleUpdate = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await updateRoom(editModal.room.id, {
        capacity: formData.capacity,
        features: formData.features 
      });
      await fetchRooms();
      setEditModal(null);
    } catch (error) { alert('Güncelleme başarısız.'); }
    finally { setSaving(false); }
  };

  const groupedRooms = rooms.reduce((acc, room) => {
    const prefix = room.name?.[0]?.toUpperCase() || 'F';
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* BAŞLIK */}
      <div className="max-w-6xl mx-auto mb-12">
        <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Oda Yönetimi</h1>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Sistem Kontrol Paneli</p>
      </div>

      {/* ODA LİSTESİ */}
      <div className="max-w-6xl mx-auto">
        {['F', 'M', 'S'].map((prefix) => {
          const floorRooms = groupedRooms[prefix] || [];
          if (floorRooms.length === 0) return null;
          const floor = FLOORS[prefix];
          return (
            <div key={prefix} className="mb-12">
              <div className="flex items-center gap-4 mb-6">
                <h2 className={`text-sm font-black ${floor.color} uppercase tracking-[0.2em]`}>{floor.label}</h2>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
  {floorRooms.map((room) => (
    <div key={room.id} className={`${floor.bg} border border-slate-200/60 rounded-[2.5rem] p-7 shadow-sm flex flex-col h-full transition-all duration-300 hover:shadow-2xl group`}>
      
      {/* ÜST KISIM: Oda İsmi ve Dev Kapasite Bloğu */}
      <div className="flex justify-between items-center mb-6">
        <h3 className={`font-black text-2xl ${floor.color} uppercase tracking-tighter leading-none`}>
          {room.name}
        </h3>
        
        {/* Daha Belirgin Kapasite Tasarımı */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1">
            <span className="text-3xl font-black text-slate-800 leading-none">{room.capacity}</span>
            <span className="text-lg text-slate-400">👤</span>
          </div>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5"></span>
        </div>
      </div>

      {/* ORTA KISIM: Özellik Listesi (Sade ve Şık) */}
      <div className="space-y-3">
        <div className="h-px bg-slate-200/50 w-full mb-4" /> {/* Ayırıcı Çizgi */}
        {room.features && Object.entries(room.features).filter(([_, val]) => val).length > 0 ? (
          Object.entries(room.features).map(([key, val]) => (
            val && (
              <div key={key} className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${floor.border.replace('border-', 'bg-')} opacity-50`} />
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
                  {key.replace('_', ' ')}
                </span>
              </div>
            )
          ))
        ) : (
          <span className="text-[10px] font-black text-slate-300 uppercase italic">Donanım Yok</span>
        )}
      </div>

      {/* ALT KISIM: Buton (Her Zaman Alta Sabit) */}
      <div className="mt-auto pt-8"> 
        <button 
          onClick={() => openEditModal(room)} 
          className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] shadow-lg shadow-slate-200 hover:bg-blue-600 hover:shadow-blue-100 transition-all duration-300 active:scale-[0.98]"
        >
          ✏️ Odayı Düzenle
        </button>
      </div>

    </div>
  ))}
</div>
            </div>
          );
        })}
      </div>

      {/* --- MODAL (OVERLAY + CONTAINER) --- */}
      {editModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full p-10 border border-slate-100 animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-12">
              <div>
                <h3 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">{editModal.room.name}</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Özellikleri ve Kapasiteyi Güncelle</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-3 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Sol Sütun */}
              <div className="space-y-10">
                <div>
                  <label className="text-[10px] font-black text-blue-600 uppercase mb-4 block tracking-widest">👤 Oda Kapasitesi</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(num => (
                      <button key={num} type="button" onClick={() => setFormData({...formData, capacity: num})} className={`py-4 rounded-2xl font-black transition-all border-2 ${formData.capacity === num ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>{num}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-blue-600 uppercase mb-4 block tracking-widest">➕ Yeni Donanım</label>
                  <div className="relative">
                    <input type="text" placeholder="Klima, TV..." value={newFeatureName} onChange={(e) => setNewFeatureName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNewFeature()} className="w-full pl-6 pr-20 py-5 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                    <button type="button" onClick={addNewFeature} className="absolute right-2 top-2 bottom-2 px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-blue-600">EKLE</button>
                  </div>
                </div>
              </div>

      {/* SAĞ SÜTUN: Donanım Listesi Güzelleştirme */}
<div className="flex flex-col h-full bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100">
  <label className="text-[10px] font-black text-blue-600 uppercase mb-6 block tracking-[0.2em] opacity-70">
    🛠 Mevcut Donanımlar ({Object.keys(formData.features).length})
  </label>
  
  <div className="flex-1 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
    {Object.entries(formData.features).length > 0 ? (
      // grid-cols-1 yaparak dikey tutabiliriz ama p-2 gibi boşluklarla kutuyu daraltırız
      <div className="space-y-3">
        {Object.entries(formData.features).map(([key, val]) => (
          <div 
            key={key} 
            className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                {key.replace('_', ' ')}
              </span>
            </div>
            
            <input 
              type="checkbox" 
              checked={!!val} 
              onChange={(e) => toggleFeature(key, e.target.checked)} 
              className="w-6 h-6 rounded-lg border-slate-200 text-blue-600 focus:ring-0 cursor-pointer transition-transform group-hover:scale-110" 
            />
          </div>
        ))}
      </div>
    ) : (
      // Hiç özellik yoksa görünen yer
      <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm text-2xl">📦</div>
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
          Henüz bir donanım<br/>tanımlanmamış
        </span>
      </div>
    )}
  </div>
</div>
            </div>

            <button onClick={handleUpdate} disabled={saving} className="w-full mt-12 py-6 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all disabled:opacity-50 active:scale-[0.98]">
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Onayla'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}