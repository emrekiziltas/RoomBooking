import { useEffect, useState, Fragment } from 'react';
import { getRooms } from '../api/rooms';
import { getBookings } from '../api/bookings';
import type { Room, Booking } from '../types/index';

function getDaysInMonth(year: number, month: number) {
  const days = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

// Güncellenmiş renk fonksiyonu - capacity'e göre hesaplama
function getOccupancyColor(bookedCount: number, capacity: number): string {
  if (bookedCount === 0) return 'bg-gray-100';
  if (bookedCount >= capacity) return 'bg-red-500'; // Tam dolu
  
  const ratio = bookedCount / capacity;
  if (ratio <= 0.33) return 'bg-green-200';
  if (ratio <= 0.66) return 'bg-yellow-300';
  return 'bg-orange-400';
}

export function Calendar() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDetail, setSelectedDetail] = useState<{room: Room, day: Date, bookings: Booking[]} | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getDaysInMonth(year, month);

  const monthName = currentDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

  useEffect(() => {
    Promise.all([getRooms(), getBookings()]).then(([r, b]) => {
      setRooms(r.data);
      setBookings(b.data);
      setLoading(false);
    });
  }, []);

  function getBookingsForRoomAndDay(roomId: number, day: Date) {
    return bookings.filter((b) => {
      const bookingRoomId = b.room?.id || (b as any).room_id;
      if (Number(bookingRoomId) !== Number(roomId)) return false;

      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      
      const checkDayStart = new Date(day);
      checkDayStart.setHours(0, 0, 0, 0);
      
      const checkDayEnd = new Date(day);
      checkDayEnd.setHours(23, 59, 59, 999);

      return start <= checkDayEnd && end >= checkDayStart;
    });
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

  const floors = [
    { prefix: 'F', label: 'First Floor', color: 'text-blue-700' },
    { prefix: 'M', label: 'Mezzanine', color: 'text-green-700' },
    { prefix: 'S', label: 'Second Floor', color: 'text-orange-700' },
  ];

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Header with Navigation */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold capitalize">{monthName}</h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-50">Geri</button>
          <button onClick={nextMonth} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-50">İleri</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="border-collapse text-xs w-full bg-white">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2 sticky left-0 z-20 bg-gray-50 min-w-[120px]">Oda</th>
              {days.map(day => (
                <th key={day.toISOString()} className="border p-1 min-w-[30px]">
                  {day.getDate()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {floors.map((floor) => {
              const floorRooms = rooms.filter((r) => r.name?.[0].toUpperCase() === floor.prefix);
              
              return (
                <Fragment key={floor.prefix}>
                  <tr>
                    <td
                      colSpan={days.length + 1}
                      className={`border px-2 py-1 font-bold text-sm ${floor.color} bg-gray-100`}
                    >
                      {floor.label}
                    </td>
                  </tr>
                  {floorRooms.map((room) => (
                    <tr key={room.id}>
                      <td className="border px-2 py-1 font-medium bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div>{room.name}</div>
                        <div className="text-gray-400">{room.capacity} 👤</div>
                      </td>
                      {days.map((day) => {
                        const dayBookings = getBookingsForRoomAndDay(room.id, day);
                        const bookedCount = dayBookings.length;
                        const availableCapacity = room.capacity - bookedCount;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const colorClass = getOccupancyColor(bookedCount, room.capacity);
                        
                        return (
                          <td
                            key={day.toISOString()}
                            onClick={() => {
                              if (dayBookings.length > 0) {
                                setSelectedDetail({ room, day, bookings: dayBookings });
                              }
                            }}
                            className={`border text-center cursor-pointer hover:brightness-95 transition-all
                              ${isWeekend && bookedCount === 0 ? 'bg-gray-50' : colorClass}`}
                            title={`${availableCapacity} / ${room.capacity} müsait\n${dayBookings.map((b) => `${b.title}`).join('\n')}`}
                          >
                            {bookedCount > 0 && (
                              <div className="py-1">
                                <div className="font-bold text-gray-800">{bookedCount}</div>
                                <div className="text-[10px] text-gray-600">{availableCapacity} left</div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <div>
                <h3 className="font-bold text-lg">
                  {selectedDetail.room.name} - {selectedDetail.day.toLocaleDateString('tr-TR')}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedDetail.room.capacity - selectedDetail.bookings.length} / {selectedDetail.room.capacity} müsait
                </p>
              </div>
              <button onClick={() => setSelectedDetail(null)} className="text-gray-500 hover:text-black text-2xl">&times;</button>
            </div>
            
            <div className="space-y-3">
              {selectedDetail.bookings.map((b) => (
                <div key={b.id} className="p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                  <div className="font-semibold text-sm">{b.title}</div>
                  <div className="text-xs text-gray-600">
                    ⏰ {new Date(b.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                       {new Date(b.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div className="text-xs mt-1 text-blue-700 font-medium">👤 {b.user?.name || 'Bilinmeyen Kullanıcı'}</div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setSelectedDetail(null)}
              className="mt-6 w-full py-2 bg-gray-800 text-white rounded hover:bg-black transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-gray-100 border inline-block"></span> Boş</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-green-200 inline-block"></span> Az dolu (≤33%)</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-yellow-300 inline-block"></span> Yarı dolu (≤66%)</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-orange-400 inline-block"></span> Neredeyse dolu (&lt;100%)</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-red-500 inline-block"></span> Tam dolu (100%)</span>
      </div>
    </div>
  );
}