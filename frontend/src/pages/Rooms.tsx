import { useEffect, useState } from 'react';
import { getRooms, updateRoom } from '../api/rooms';
import type { Room } from '../types/index';

// Kat tanımları için renkleri brand değişkenlerine çektik
const FLOORS: Record<string, { label: string; color: string; border: string; bg: string }> = {
  F: { label: 'FIRST FLOOR', color: 'text-brand-primary', border: 'border-brand-primary', bg: 'bg-brand-surface' },
  M: { label: 'MEZZANINE', color: 'text-brand-success', border: 'border-brand-success', bg: 'bg-brand-surface' },
  S: { label: 'SECOND FLOOR', color: 'text-brand-danger', border: 'border-brand-danger', bg: 'bg-brand-surface' },
};

export function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ room: Room } | null>(null);
  
  // DİKKAT: features artık bir obje değil, bir Dizi (Array) oldu!
  const [formData, setFormData] = useState<{capacity: number, features: any[]}>({ 
    capacity: 1, 
    features: [] 
  });
  
  const [saving, setSaving] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  useEffect(() => { fetchRooms(); }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditModal(null); };
    if (editModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [editModal]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await getRooms();
      console.log("Backend'den Gelen Odalar:", response.data);
      setRooms(response.data || []);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const openEditModal = (room: Room) => {
    setEditModal({ room });
    // Odanın özelliklerini dizi olarak forma yüklüyoruz
    setFormData({ capacity: room.capacity, features: room.features || [] });
  };

  const addNewFeature = () => {
    if (!newFeatureName.trim()) return;
    const label = newFeatureName.trim();
    const key = label.toLowerCase().replace(/\s+/g, '_');
    
    // Zaten ekliyse tekrar ekleme
    if (formData.features.some(f => f.key === key)) {
      setNewFeatureName('');
      return;
    }

    setFormData(prev => ({
      ...prev,
      // Yeni eklenen özelliğe geçici bir ID veriyoruz (Backend halledecek)
      features: [...prev.features, { id: 'new_' + Date.now(), key, label }]
    }));
    setNewFeatureName('');
  };

  const deleteFeature = (identifier: string | number) => {
    setFormData(prev => ({
      ...prev,
      // Hem ID'ye hem Key'e göre silme kontrolü
      features: prev.features.filter(f => f.key !== identifier && f.id !== identifier)
    }));
  };

  const handleUpdate = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await updateRoom(editModal.room.id, {
        capacity: formData.capacity,
        features: formData.features // Artık backend'e dizi gönderiyoruz
      });
      await fetchRooms();
      setToast({ message: 'SYSTEM UPDATED ✓', type: 'success' });
      setEditModal(null);
      setTimeout(() => setToast(null), 3000);
    } catch (error) { 
      setToast({ message: 'ACTION FAILED ✗', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
    finally { setSaving(false); }
  };

  const groupedRooms = rooms.reduce((acc, room) => {
    const prefix = room.name?.[0]?.toUpperCase() || 'F';
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-brand-secondary animate-pulse text-2xl uppercase tracking-widest font-brand">
      InI Loading Resources...
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-surface px-4 pt-2 pb-12 font-brand">
      {toast && (
        <div className={`fixed top-8 right-8 z-[60] animate-in slide-in-from-top-4 duration-300 ${
          toast.type === 'success' ? 'bg-brand-success' : 'bg-brand-danger'
        } text-white px-6 py-3 rounded-ini shadow-2xl font-black text-[10px] tracking-widest uppercase`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto mb-8 border-b-2 border-brand-surface pb-1">
        <h1 className="text-2xl font-black text-brand-secondary uppercase tracking-tighter italic leading-none">
          Resource <span className="text-brand-primary">Management</span>
        </h1>
        <p className="text-brand-muted font-black uppercase text-[9px] tracking-[0.3em] mt-0.5">SYSTEM CONTROL PANEL & CAPACITY</p>
      </div>

      <div className="max-w-7xl mx-auto">
        {['F', 'M', 'S'].map((prefix) => {
          const floorRooms = groupedRooms[prefix] || [];
          if (floorRooms.length === 0) return null;
          const floor = FLOORS[prefix];
          return (
            <div key={prefix} className="mb-10">
              <div className="flex items-center gap-4 mb-4">
                <h2 className={`text-[10px] font-black ${floor.color} uppercase tracking-[0.2em]`}>{floor.label}</h2>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {floorRooms.map((room) => (
                  <div key={room.id} className="ini-card p-5 flex flex-col h-full hover:border-brand-primary transition-all duration-300 group">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className={`font-black text-xl ${floor.color} uppercase tracking-tighter leading-none`}>
                        {room.name}
                      </h3>
                      <div className="flex items-center gap-1 bg-brand-surface px-2 py-1 rounded-ini">
                        <span className="text-sm font-black text-brand-secondary leading-none">{room.capacity}</span>
                        <span className="text-[10px]">👤</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      {/* DİKKAT: Artık Object.entries yok, doğrudan diziyi map'liyoruz */}
                      {room.features && room.features.length > 0 ? (
                        room.features.map((feature: any) => (
                            <div key={feature.id || feature.key} className="flex items-center gap-2">
                              <div className={`w-1 h-1 rounded-full bg-brand-muted opacity-40`} />
                              <span className="text-[9px] font-black text-brand-muted uppercase tracking-tight truncate">
                                {feature.label || feature.key.replace('_', ' ')}
                              </span>
                            </div>
                        ))
                      ) : (
                        <span className="text-[8px] font-black text-gray-300 uppercase italic">Basic Config</span>
                      )}
                    </div>

                    <div className="mt-4"> 
                      <button 
                        onClick={() => openEditModal(room)} 
                        className="w-full py-2 bg-brand-secondary text-white rounded-ini text-[9px] font-black uppercase tracking-widest hover:bg-brand-primary transition-all active:scale-[0.98]"
                      >
                        Modify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {editModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setEditModal(null)} />
          <div className="ini-card max-w-2xl w-full p-8 relative z-10 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-8 border-b border-brand-surface pb-4">
              <div>
                <h3 className="text-2xl font-black text-brand-secondary uppercase tracking-tighter italic">{editModal.room.name}</h3>
                <p className="text-brand-muted text-[9px] font-black uppercase tracking-widest">Configure Infrastructure</p>
              </div>
              <button onClick={() => setEditModal(null)} className="text-brand-muted hover:text-brand-danger transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-brand-primary uppercase mb-3 block tracking-widest text-center">Set Capacity</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(num => (
                      <button key={num} type="button" onClick={() => setFormData({...formData, capacity: num})} className={`py-3 rounded-ini font-black text-xs transition-all border-2 ${formData.capacity === num ? 'bg-brand-primary border-brand-primary text-white shadow-lg' : 'bg-white border-brand-surface text-brand-muted hover:border-brand-primary/30'}`}>{num}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-brand-primary uppercase mb-2 block tracking-widest">Inject Feature</label>
                  <div className="relative">
                    <input type="text" placeholder="AC, PROJECTOR..." value={newFeatureName} onChange={(e) => setNewFeatureName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNewFeature()} className="w-full pl-4 pr-16 py-3 bg-brand-surface border-0 rounded-ini text-[10px] font-black outline-none focus:ring-1 ring-brand-primary uppercase" />
                    <button type="button" onClick={addNewFeature} className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-brand-secondary text-white rounded-ini text-[8px] font-black hover:bg-brand-primary uppercase transition-colors">Add</button>
                  </div>
                </div>
              </div>

              <div className="bg-brand-surface/30 rounded-ini p-4 border border-brand-surface">
                <label className="text-[9px] font-black text-brand-secondary uppercase mb-4 block tracking-widest opacity-70">Inventory ({formData.features.length})</label>
                <div className="max-h-[220px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {formData.features.length > 0 ? (
                    formData.features.map((feature: any) => (
                      <div key={feature.id || feature.key} className="flex items-center justify-between p-3 bg-white rounded-ini border border-brand-surface group">
                        <span className="text-[9px] font-black text-brand-secondary uppercase tracking-tight">
                          {feature.label || feature.key.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          {/* Sadece silme butonu bıraktık, zaten listedeyse var demektir */}
                          <button onClick={() => deleteFeature(feature.id || feature.key)} className="p-1 text-brand-danger opacity-0 group-hover:opacity-100 transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-24 flex items-center justify-center text-center opacity-30">
                      <span className="text-[8px] font-black uppercase">No Features<br/>Defined</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button onClick={handleUpdate} disabled={saving} className="w-full mt-8 py-4 bg-brand-secondary text-white rounded-ini font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-brand-primary transition-all disabled:opacity-50">
              {saving ? 'PROCESSING...' : 'COMMIT CHANGES'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}