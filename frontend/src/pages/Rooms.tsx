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

  // --- YENİ: Ekleme inputu için state ---
  const [newFeatureName, setNewFeatureName] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await getRooms();
      setRooms(response.data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (room: Room) => {
    setEditModal({ room });
    setFormData({
      capacity: room.capacity,
      features: room.features || {} 
    });
  };

  // --- YENİ: Dinamik Özellik Ekleme Fonksiyonu ---
  const addNewFeature = () => {
    if (!newFeatureName.trim()) return;
    const key = newFeatureName.trim().toLowerCase().replace(/\s+/g, '_');
    
    setFormData({
      ...formData,
      features: {
        ...formData.features,
        [key]: true // Yeni ekleneni otomatik aktif yap
      }
    });
    setNewFeatureName('');
  };

  // --- YENİ: Tik kaldırınca silme mantığı ---
  const toggleFeature = (key: string, isChecked: boolean) => {
    const updatedFeatures = { ...formData.features };
    if (isChecked) {
      updatedFeatures[key] = true;
    } else {
      delete updatedFeatures[key]; // False yapmak yerine objeden siliyoruz
    }
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
    } catch (error) {
      console.error('Error updating room:', error);
      alert('Güncelleme başarısız oldu.');
    } finally {
      setSaving(false);
    }
  };

  const groupedRooms = rooms.reduce((acc, room) => {
    const prefix = room.name?.[0]?.toUpperCase() || 'F';
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  if (loading) return <div className="flex items-center justify-center min-h-screen">...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* ... Üst Başlık Kısmı Aynı ... */}

      <div className="max-w-6xl mx-auto">
        {['F', 'M', 'S'].map((prefix) => {
          const floorRooms = groupedRooms[prefix] || [];
          if (floorRooms.length === 0) return null;
          const floor = FLOORS[prefix];
          return (
            <div key={prefix} className="mb-10">
               {/* ... Kat Başlıkları ve Oda Listeleme (Aynı) ... */}
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {floorRooms.map((room) => (
                  <div key={room.id} className={`${floor.bg} border-l-4 ${floor.border} rounded-xl p-5 shadow-sm`}>
                    <h3 className={`font-black text-xl ${floor.color} mb-3 uppercase`}>{room.name}</h3>
                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="font-bold">👤 Kapasite: {room.capacity}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {room.features && Object.entries(room.features).map(([key, value]) => (
                          value && <span key={key} className="bg-white/80 text-[9px] font-black px-2 py-1 rounded border border-gray-200 uppercase">{key.replace('_', ' ')}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => openEditModal(room)} className="w-full mt-4 py-2 px-3 bg-white border border-gray-300 rounded-lg text-[10px] font-black uppercase">✏️ Edit</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- GÜNCELLENMİŞ MODAL --- */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">{editModal.room.name}</h3>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-800 text-3xl">&times;</button>
            </div>

            <div className="space-y-6">
              {/* Kapasite Ayarı Aynı */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block ml-1">Kapasite</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(num => (
                    <button key={num} onClick={() => setFormData({...formData, capacity: num})} className={`py-3 rounded-xl font-bold ${formData.capacity === num ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{num}</button>
                  ))}
                </div>
              </div>

              {/* Dinamik Özellikler + Silme Mantığı */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block ml-1">Donanımlar</label>
                <div className="max-h-[150px] overflow-y-auto pr-2 space-y-2">
                  {Object.entries(formData.features).map(([key, value]) => (
                    <label key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                      <span className="text-xs font-bold text-gray-700 uppercase">{key.replace('_', ' ')}</span>
                      <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => toggleFeature(key, e.target.checked)} // Silme fonksiyonunu çağırıyoruz
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>

                {/* --- YENİ ÖZELLİK EKLEME ALANI --- */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Yeni özellik (örn: Wifi)"
                      value={newFeatureName}
                      onChange={(e) => setNewFeatureName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addNewFeature()}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={addNewFeature}
                      className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-600 transition-all"
                    >
                      EKLE
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={handleUpdate} disabled={saving} className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}