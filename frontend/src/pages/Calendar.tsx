import { useEffect, useState, Fragment } from 'react';
import { getRooms } from '../api/rooms';
import { getBookings } from '../api/bookings';
import type { Room, Booking } from '../types/index';

// 15 günlük periyot oluştur (bugünden başlayarak)
function getDaysForPeriod(startDate: Date, daysCount: number = 15) {
  const days = [];
  for (let i = 0; i < daysCount; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    days.push(date);
  }
  return days;
}

function getOccupancyColor(bookedCount: number, capacity: number): string {
  if (bookedCount === 0) return 'bg-gray-50 hover:bg-gray-100';
  if (bookedCount >= capacity) return 'bg-red-100 hover:bg-red-200 border-red-300';
  
  const ratio = bookedCount / capacity;
  if (ratio <= 0.33) return 'bg-green-100 hover:bg-green-200 border-green-300';
  if (ratio <= 0.66) return 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300';
  return 'bg-orange-100 hover:bg-orange-200 border-orange-300';
}

export function Calendar() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(30);
  const [selectedDetail, setSelectedDetail] = useState<{room: Room, day: Date, bookings: Booking[]} | null>(null);

  const days = getDaysForPeriod(startDate, daysToShow);

  // Tarih aralığını formatla
  const dateRangeText = `${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${days[days.length - 1].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

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

  const goBackward = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - daysToShow);
    setStartDate(newDate);
  };

  const goForward = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + daysToShow);
    setStartDate(newDate);
  };

  const goToToday = () => setStartDate(new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading calendar...</p>
        </div>
      </div>
    );
  }

  const floors = [
    { prefix: 'F', label: 'First Floor', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    { prefix: 'M', label: 'Mezzanine', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
    { prefix: 'S', label: 'Second Floor', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-[95vw] mx-auto mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Calendar View</h1>
              <p className="text-gray-500 text-sm mt-1">{dateRangeText}</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Period selector */}
              <select 
                value={daysToShow}
                onChange={(e) => setDaysToShow(Number(e.target.value))}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors text-sm outline-none cursor-pointer"
              >
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={15}>15 Days</option>
                <option value={30}>30 Days</option>
              </select>

              <button 
                onClick={goBackward} 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors text-sm"
              >
                ← Prev {daysToShow}d
              </button>
              <button 
                onClick={goToToday} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors text-sm"
              >
                Today
              </button>
              <button 
                onClick={goForward} 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors text-sm"
              >
                Next {daysToShow}d →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Table */}
      <div className="max-w-[95vw] mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="border-r border-gray-200 p-3 sticky left-0 z-20 bg-gray-50 min-w-[140px] text-left">
                    <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Room</span>
                  </th>
                  {days.map(day => {
                    const isToday = day.getTime() === today.getTime();
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const dayName = day.toLocaleDateString('en-GB', { weekday: 'short' });
                    const monthName = day.toLocaleDateString('en-GB', { month: 'short' });
                    
                    return (
                      <th 
                        key={day.toISOString()} 
                        className={`border-r border-gray-200 p-2 min-w-[50px] ${isToday ? 'bg-blue-100' : ''} ${isWeekend ? 'bg-gray-100' : ''}`}
                      >
                        <div className="text-center">
                          <div className={`text-[10px] font-bold uppercase ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                            {dayName}
                          </div>
                          <div className={`text-lg font-black ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                            {day.getDate()}
                          </div>
                          <div className={`text-[9px] font-bold ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>
                            {monthName}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {floors.map((floor) => {
                  const floorRooms = rooms.filter((r) => r.name?.[0].toUpperCase() === floor.prefix);
                  
                  return (
                    <Fragment key={floor.prefix}>
                      {/* Floor Header */}
                      <tr>
                        <td
                          colSpan={days.length + 1}
                          className={`border-y-2 ${floor.border} px-4 py-2 font-black text-sm ${floor.color} ${floor.bg}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${floor.color.replace('text-', 'bg-')}`}></div>
                            {floor.label}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Room Rows */}
                      {floorRooms.map((room) => (
                        <tr key={room.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="border-r border-gray-200 px-4 py-3 font-bold bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${floor.color.replace('text-', 'bg-')}`}></div>
                              <span className="text-sm text-gray-800">{room.name}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {room.capacity} 👤
                            </div>
                          </td>
                          
                          {days.map((day) => {
                            const dayBookings = getBookingsForRoomAndDay(room.id, day);
                            const bookedCount = dayBookings.length;
                            const availableCapacity = room.capacity - bookedCount;
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                            const isToday = day.getTime() === today.getTime();
                            const colorClass = getOccupancyColor(bookedCount, room.capacity);
                            
                            return (
                              <td
                                key={day.toISOString()}
                                onClick={() => {
                                  if (dayBookings.length > 0) {
                                    setSelectedDetail({ room, day, bookings: dayBookings });
                                  }
                                }}
                                className={`
                                  border-r border-gray-200 text-center transition-all
                                  ${bookedCount > 0 ? 'cursor-pointer' : ''}
                                  ${isWeekend && bookedCount === 0 ? 'bg-gray-50' : colorClass}
                                  ${isToday ? 'ring-2 ring-blue-400 ring-inset' : ''}
                                  ${bookedCount > 0 ? 'border' : ''}
                                `}
                              >
                                {bookedCount > 0 && (
                                  <div className="py-2 px-1">
                                    <div className="font-black text-base text-gray-800">{bookedCount}</div>
                                    <div className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                                      {availableCapacity} free
                                    </div>
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
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="text-xs font-black text-gray-600 uppercase tracking-wider mb-3">Legend</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-50 border border-gray-300 rounded"></div>
              <span className="text-gray-700 font-medium">Empty</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-gray-700 font-medium">Low (≤33%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span className="text-gray-700 font-medium">Medium (≤66%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-100 border border-orange-300 rounded"></div>
              <span className="text-gray-700 font-medium">High (&lt;100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-100 border border-red-300 rounded"></div>
              <span className="text-gray-700 font-medium">Full (100%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-100">
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                  {selectedDetail.room.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedDetail.day.toLocaleDateString('en-GB', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                  <span className="text-xs font-bold text-blue-700">
                    {selectedDetail.room.capacity - selectedDetail.bookings.length} / {selectedDetail.room.capacity} available
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetail(null)} 
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedDetail.bookings.map((b) => (
                <div key={b.id} className="p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                  <div className="font-black text-sm text-gray-800 uppercase tracking-tight">{b.title}</div>
                  <div className="text-xs text-gray-600 mt-2 flex items-center gap-2">
                    <span>⏰</span>
                    <span className="font-bold">
                      {new Date(b.start_time).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})} - 
                      {new Date(b.end_time).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="text-xs mt-2 text-blue-700 font-bold flex items-center gap-1">
                    <span>👤</span>
                    <span>{b.user?.name || 'Unknown User'}</span>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setSelectedDetail(null)}
              className="mt-6 w-full py-3 bg-gray-900 text-white rounded-xl font-black hover:bg-black transition-colors uppercase text-sm tracking-wider"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}