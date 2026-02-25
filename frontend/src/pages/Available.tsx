import { useEffect, useState, useMemo } from 'react';
import type { Room } from '../types/index';
import { getAvailableRooms } from '../api/rooms';
import { createBooking } from '../api/bookings';


const FLOORS: Record<string, { label: string; color: string; border: string; bg: string; bookingColor: string }> = {
  F: { label: 'First Floor',    color: 'text-blue-700',   border: 'border-blue-500',  bg: 'bg-blue-50',  bookingColor: '#3B82F6' },
  M: { label: 'Mezzanine Floor', color: 'text-green-700',  border: 'border-green-500', bg: 'bg-green-50', bookingColor: '#10B981' },
  S: { label: 'Second Floor',    color: 'text-orange-700', border: 'border-orange-500', bg: 'bg-orange-50', bookingColor: '#F59E0B' },
};

export function Available() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingModal, setBookingModal] = useState<{ room: Room; color: string } | null>(null);
  const [bookingForm, setBookingForm] = useState({
    title: '',
    start_time: '',
    end_time: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchRooms = async (date: string) => {
    setLoading(true);
    try {
      const response = await getAvailableRooms(date);
      const roomsData = Array.isArray(response) ? response : (response.data || []);
      setRooms(roomsData);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms(selectedDate);
  }, [selectedDate]);

  const openBookingModal = (room: Room) => {
    // Odanın floor'una göre renk al
    const prefix = room.name?.[0]?.toUpperCase() || 'F';
    const floorColor = FLOORS[prefix]?.bookingColor || '#3B82F6';
    
    setBookingModal({ room, color: floorColor });
    setBookingForm({
      title: '',
      start_time: `${selectedDate}T09:00`,
      end_time: `${selectedDate}T17:00`
    });
  };

  const handleCreateBooking = async () => {
    if (!bookingModal || !bookingForm.title.trim()) {
      alert('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      await createBooking({
        room_id: bookingModal.room.id,
        title: bookingForm.title,
        start_time: bookingForm.start_time,
        end_time: bookingForm.end_time,
        color: bookingModal.color // Odanın rengini kullan
      });

      alert('Booking created successfully!');
      setBookingModal(null);
      fetchRooms(selectedDate);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      alert(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  };

  const groupedRooms = useMemo(() => {
    const groups: Record<string, Room[]> = {};
    const safeRooms = Array.isArray(rooms) ? rooms : [];

    safeRooms.forEach((room) => {
      const prefix = room.name?.[0]?.toUpperCase() || 'F';
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(room);
    });
    return groups;
  }, [rooms]);

  const floorKeys = ['F', 'M', 'S'];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* HEADER & SEARCH */}
      <div className="max-w-6xl mx-auto mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Room Availability</h1>
          <p className="text-gray-500 text-sm">Find and book your space</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="date" 
            className="flex-1 md:w-48 p-2 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button 
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Today
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p>Checking availability...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed">
            <p className="text-gray-500">No rooms available for this date.</p>
          </div>
        ) : (
          floorKeys.map((prefix) => {
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
                      onClick={() => openBookingModal(room)}
                      className={`${floor.bg} border-l-4 ${floor.border} rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                    >
                      <h3 className={`font-bold text-lg ${floor.color} group-hover:scale-105 transition-transform`}>
                        {room.name}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <span className="text-gray-600">
                          {room.available_capacity} Desk is available
                        </span>
                        {room.booked_slots > 0 && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                            {room.booked_slots} dolu ({room.occupancy_rate}%)
                          </span>
                        )}
                      </div>

                      {room.features?.blackboard && (
                        <span className="text-[10px] font-bold bg-white/80 border border-gray-100 px-2 py-0.5 rounded-full text-gray-500 uppercase tracking-wider">
                          📋 Blackboard
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Booking Modal */}
      {bookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                {/* Renk göstergesi */}
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: bookingModal.color }}
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Book {bookingModal.room.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedDate).toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBookingModal(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={bookingForm.title}
                  onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                  placeholder="Meeting, Workshop, etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={bookingForm.start_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={bookingForm.end_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setBookingModal(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBooking}
                disabled={saving || !bookingForm.title.trim()}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Booking...' : 'Book Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}