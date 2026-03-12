import { useEffect, useState } from 'react';
import { getRooms, updateRoom, getAllLookupFeatures, getFloors, getSystemSettings } from '../api/rooms';
import type { Room, Feature } from '../types/index';

// Kat konfigürasyonu için tip tanımı
type FloorConfig = { label: string; color: string; border: string; bg: string };

export function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ room: Room } | null>(null);
  const [formData, setFormData] = useState<{capacity: number, features: any[]}>({ 
    capacity: 1, 
    features: [] 
  });
  
  const [allLookupFeatures, setAllLookupFeatures] = useState<Feature[]>([]);
  const [suggestions, setSuggestions] = useState<Feature[]>([]);
  const [saving, setSaving] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  // Dinamik Kat State'leri
  const [floors, setFloors] = useState<Record<string, FloorConfig>>({});
  const [maxCapacity, setMaxCapacity] = useState(3); // DB'den gelene kadar varsayılan

  // Katlar için otomatik atanacak renk paleti
  const floorColorPalette = [
    { color: 'text-brand-primary', border: 'border-brand-primary' },
    { color: 'text-brand-success', border: 'border-brand-success' },
    { color: 'text-brand-danger', border: 'border-brand-danger' },
    { color: 'text-brand-info', border: 'border-brand-info' }
  ];

  useEffect(() => { 
    const initLoad = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchRooms(), 
          loadAllLookupFeatures(), 
          loadFloors(),
          loadSettings()
        ]);
      } catch (err) {
        console.error("Yükleme hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    initLoad();
  }, []);

const loadSettings = async () => {
  try {
    const response = await getSystemSettings();
    const settings = response.data?.data || response.data || [];
    
    // DB'den 'max_room_capacity' anahtarını bul
    const roomCap = settings.find((s: any) => s.key === 'max_room_capacity');
    
    if (roomCap) {
      // ÖNEMLİ: Metadata bir objedir, içindeki 'value' değerini almalıyız
      // Eğer metadata string ise direkt Number(roomCap.metadata) da olabilir
      const val = roomCap.metadata?.value || roomCap.metadata; 
      if (val) {
        setMaxCapacity(Number(val));
        console.log("Dinamik Kapasite Set Edildi:", val);
      }
    }
  } catch (error) {
    console.error("Ayarlar yüklenemedi, varsayılan 3 kullanılıyor.");
  }
};

const loadFloors = async () => {
  try {
    const response = await getFloors();
    const apiFloors = response.data || response || [];
    const config: Record<string, FloorConfig> = {};
    
    apiFloors.forEach((f: any, index: number) => {
      const colorSet = floorColorPalette[index % floorColorPalette.length];
      
      // f.key (örn: '1_kat') üzerinden gruplandığı için key'i kullanıyoruz
      config[f.key.toUpperCase()] = {
        label: f.label.toUpperCase(), // DB'den gelen yeni isim
        color: f.bg_color_class || colorSet.color, // DB'den gelen yeni renk sınıfı
        border: f.border_color_class || colorSet.border,
        bg: 'bg-brand-surface'
      };
    });
    setFloors(config);
  } catch (error) {
    console.error("Kat bilgileri yüklenemedi.");
  }
};
  const loadAllLookupFeatures = async () => {
    try {
      const response = await getAllLookupFeatures();
      const apiFeatures = response || [];
      setAllLookupFeatures(apiFeatures);
    } catch (error) { 
      console.warn(`⚠️ Özellikler API'den alınamadı.`);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await getRooms();
      setRooms(response.data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const openEditModal = (room: Room) => {
    setEditModal({ room });
    setFormData({ capacity: room.capacity, features: room.features || [] });
  };

  const handleInputChange = (val: string) => {
    setNewFeatureName(val);
    if (val.length >= 2) {
      const search = val.toLowerCase();
      const filtered = allLookupFeatures.filter(f => 
        f.label.toLowerCase().includes(search) && 
        !formData.features.some(existing => existing.key === f.key)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (feature: Feature) => {
    setFormData(prev => ({ ...prev, features: [...prev.features, feature] }));
    setNewFeatureName('');
    setSuggestions([]);
  };

  const addNewFeature = () => {
    if (!newFeatureName.trim()) return;
    const label = newFeatureName.trim();
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_'); 
    if (formData.features.some(f => f.key === key)) return;
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, { id: 'new_' + Date.now(), key, label, type_id: 3 }]
    }));
    setNewFeatureName('');
    setSuggestions([]);
  };

  const deleteFeature = (identifier: string | number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter(f => f.key !== identifier && f.id !== identifier)
    }));
  };

  const handleUpdate = async () => {
    if (!editModal) return;
    setSaving(true);
    const payload = {
      capacity: formData.capacity,
      features: formData.features.map(f => ({
        id: typeof f.id === 'string' && f.id.startsWith('new_') ? null : f.id,
        key: f.key,
        label: f.label,
        type_id: 3
      }))
    };
    try {
      const response = await updateRoom(editModal.room.id, payload);
      if (response.data) await fetchRooms();
      setToast({ message: 'SYSTEM UPDATED ✓', type: 'success' });
      setEditModal(null);
    } catch (error) {
      setToast({ message: 'ACTION FAILED ✗', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const groupedRooms = rooms.reduce((acc, room) => {
    const prefix = room.name?.[0]?.toUpperCase() || '?';
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  const availableFloors = Object.keys(groupedRooms).sort();

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-brand-secondary animate-pulse text-2xl uppercase tracking-widest">
      InI Loading Resources...
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-surface px-4 pt-2 pb-12 font-brand">
      {toast && (
        <div className={`fixed top-8 right-8 z-[60] ${toast.type === 'success' ? 'bg-brand-success' : 'bg-brand-danger'} text-white px-6 py-3 rounded shadow-2xl font-black text-[10px] tracking-widest uppercase`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto mb-8 border-b-2 border-brand-surface pb-1">
        <h1 className="text-2xl font-black text-brand-secondary uppercase tracking-tighter italic">Room <span className="text-brand-primary">Management</span></h1>
        <p className="text-brand-muted font-black uppercase text-[9px] tracking-[0.3em]">SYSTEM CONTROL PANEL & CAPACITY</p>
      </div>

      <div className="max-w-7xl mx-auto">
        {availableFloors.map((prefix) => {
          const floorRooms = groupedRooms[prefix] || [];
          const floor = floors[prefix] || { label: `${prefix} BLOCK`, color: 'text-brand-muted' };

          return (
            <div key={prefix} className="mb-10">
              <div className="flex items-center gap-4 mb-4">
                <h2 className={`text-[10px] font-black ${floor.color} uppercase tracking-[0.2em]`}>{floor.label}</h2>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {floorRooms.map((room) => (
                  <div key={room.id} className="ini-card p-5 flex flex-col h-full hover:border-brand-primary transition-all group border border-transparent">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className={`font-black text-xl ${floor.color} uppercase tracking-tighter`}>{room.name}</h3>
                      <div className="flex items-center gap-1 bg-brand-surface px-2 py-1 rounded">
                        <span className="text-sm font-black text-brand-secondary">{room.capacity}</span>
                        <span className="text-[10px]">👤</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      {room.features?.map((f: any) => (
                        <div key={f.key} className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-brand-muted opacity-40" />
                          <span className="text-[9px] font-black text-brand-muted uppercase truncate">{f.label}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => openEditModal(room)} className="mt-4 w-full py-2 bg-brand-secondary text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-brand-primary transition-all">
                      Modify
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {editModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-sm" onClick={() => setEditModal(null)} />
          <div className="ini-card max-w-2xl w-full p-8 relative z-10 bg-white">
            <div className="flex justify-between items-start mb-8 border-b pb-4">
              <div>
                <h3 className="text-2xl font-black text-brand-secondary uppercase italic">{editModal.room.name}</h3>
                <p className="text-brand-muted text-[9px] font-black uppercase">Configure Infrastructure</p>
              </div>
              <button onClick={() => setEditModal(null)} className="text-brand-muted hover:text-brand-danger">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-brand-primary uppercase mb-3 block tracking-widest text-center">Set Capacity</label>
                  <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${maxCapacity}, minmax(0, 1fr))` }}>
                    {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({ ...formData, capacity: num })}
                        className={`py-3 rounded border-2 font-black text-[11px] transition-all ${
                          formData.capacity === num ? 'bg-brand-primary text-white border-brand-primary shadow-lg' : 'bg-brand-surface text-brand-secondary border-transparent hover:border-brand-primary/30'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-brand-primary uppercase mb-2 block tracking-widest">Inject Feature</label>
                  <div className="relative">
                    <input type="text" placeholder="AC, PROJECTOR..." value={newFeatureName} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNewFeature()} className="w-full pl-4 pr-16 py-3 bg-brand-surface rounded text-[10px] font-black outline-none focus:ring-1 ring-brand-primary uppercase" />
                    <button type="button" onClick={addNewFeature} className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-brand-secondary text-white rounded text-[8px] font-black hover:bg-brand-primary uppercase">Add</button>
                    {suggestions.length > 0 && (
                      <div className="absolute z-[70] left-0 right-0 mt-1 bg-white border rounded shadow-2xl max-h-40 overflow-y-auto">
                        {suggestions.map((s) => (
                          <button key={s.id || s.key} onClick={() => selectSuggestion(s)} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-brand-primary hover:text-white transition-colors border-b last:border-0">{s.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-brand-surface/30 rounded p-4 border border-brand-surface">
                <label className="text-[9px] font-black text-brand-secondary uppercase mb-4 block tracking-widest opacity-70">Inventory ({formData.features.length})</label>
                <div className="max-h-[220px] overflow-y-auto pr-2 space-y-2">
                  {formData.features.map((f: any) => (
                    <div key={f.id || f.key} className="flex items-center justify-between p-3 bg-white rounded border border-brand-surface">
                      <span className="text-[9px] font-black text-brand-secondary uppercase truncate pr-2">{f.label}</span>
                      <button onClick={() => deleteFeature(f.id || f.key)} className="text-brand-danger/70 hover:text-brand-danger">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleUpdate} disabled={saving} className="w-full mt-8 py-4 bg-brand-secondary text-white rounded font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-brand-primary transition-all disabled:opacity-50">
              {saving ? 'PROCESSING...' : 'COMMIT CHANGES'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}