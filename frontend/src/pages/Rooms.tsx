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
  const [formData, setFormData] = useState({ capacity: 1, blackboard: false });
  const [saving, setSaving] = useState(false);

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
      blackboard: room.features?.blackboard || false
    });
  };

  const handleUpdate = async () => {
    if (!editModal) return;

    setSaving(true);
    try {
      await updateRoom(editModal.room.id, {
        capacity: formData.capacity,
        features: { blackboard: formData.blackboard }
      });
      
      // Refresh rooms list
      await fetchRooms();
      setEditModal(null);
    } catch (error) {
      console.error('Error updating room:', error);
      alert('Failed to update room');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-800">All Rooms</h1>
        <p className="text-gray-500 mt-2">Manage room capacity and features</p>
      </div>

      <div className="max-w-6xl mx-auto">
        {['F', 'M', 'S'].map((prefix) => {
          const floorRooms = groupedRooms[prefix] || [];
          if (floorRooms.length === 0) return null;
          const floor = FLOORS[prefix];

          return (
            <div key={prefix} className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <h2 className={`text-lg font-bold ${floor.color} whitespace-nowrap`}>
                  {floor.label}
                </h2>
                <div className={`flex-1 h-0.5 ${floor.bg} rounded-full`} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {floorRooms.map((room) => (
                  <div
                    key={room.id}
                    className={`${floor.bg} border-l-4 ${floor.border} rounded-xl p-4 shadow-sm hover:shadow-md transition-all`}
                  >
                    <h3 className={`font-bold text-lg ${floor.color} mb-2`}>
                      {room.name}
                    </h3>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      <div>Capacity: {room.capacity} 👤</div>
                      {room.features?.blackboard && (
                        <div className="text-xs bg-white/80 px-2 py-1 rounded mt-1">
                          📋 Blackboard
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => openEditModal(room)}
                      className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Edit Room: {editModal.room.name}
              </h3>
              <button
                onClick={() => setEditModal(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacity
                  </label>
                  <select
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select capacity</option>
                    <option value="1">1 Person</option>
                    <option value="2">2 People</option>
                    <option value="3">3 People</option>
                    <option value="4">4 People</option>
                  </select>
                </div>

              {/* Blackboard */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="blackboard"
                  checked={formData.blackboard}
                  onChange={(e) => setFormData({ ...formData, blackboard: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="blackboard" className="text-sm font-medium text-gray-700">
                  Has Blackboard
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}