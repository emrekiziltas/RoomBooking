import { useEffect, useState,useMemo } from 'react';
import { getAvailableRanges } from '../api/rooms';

interface RoomRange {
  room: {
    id: number;
    name: string;
    capacity: number;
    features?: { blackboard?: boolean };
  };
  ranges: Array<{
    start: string;
    end: string;
    days: number;
  }>;
}

export function AvailableRanges() {
  const [ranges, setRanges] = useState<RoomRange[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('2026-02-25');
  const [days, setDays] = useState(5);

  const fetchRanges = async () => {
    setLoading(true);
    try {
      const response = await getAvailableRanges(startDate, days);
      setRanges(response.data || []);
    } catch (error) {
      console.error('Error fetching ranges:', error);
      setRanges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanges();
  }, []);

  const FLOORS: Record<string, { label: string; color: string; bg: string; border: string }> = {
    F: { label: 'First Floor', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-500' },
    M: { label: 'Mezzanine Floor', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-500' },
    S: { label: 'Second Floor', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-500' },
  };
/*
  const groupedRanges = ranges.reduce((acc, item) => {
    const prefix = item.room.name[0].toUpperCase();
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(item);
    return acc;
  }, {} as Record<string, RoomRange[]>);
*/

// ... (Önceki kodlar aynı)

const groupedRanges = useMemo(() => {
  // 1. Sadece seçilen startDate ile birebir eşleşen aralıkları filtrele
  const filteredData = ranges
    .map((item) => ({
      ...item,
      ranges: item.ranges.filter((range) => range.start === startDate),
    }))
    .filter((item) => item.ranges.length > 0);

  // 2. Filtrelenmiş veriyi katlara (F, M, S) göre grupla
  return filteredData.reduce((acc, item) => {
    const prefix = item.room.name[0].toUpperCase();
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(item);
    return acc;
  }, {} as Record<string, RoomRange[]>);
}, [ranges, startDate]);
// ... (Geri kalan render kodları aynı)
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Available Date Ranges</h1>
        
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Required Days</label>
            <input
              type="number"
              min="1"
              max="30"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full p-2 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <button
            onClick={fetchRanges}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Search
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p>Searching for available ranges...</p>
          </div>
        ) : ranges.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed">
            <p className="text-gray-500">No rooms available for {days} consecutive days from {startDate}</p>
          </div>
        ) : (
          Object.keys(FLOORS).map((prefix) => {
            const floorRanges = groupedRanges[prefix] || [];
            if (floorRanges.length === 0) return null;
            const floor = FLOORS[prefix];

            return (
              <div key={prefix} className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className={`text-lg font-bold ${floor.color} whitespace-nowrap`}>
                    {floor.label}
                  </h2>
                  <div className={`flex-1 h-0.5 ${floor.bg} rounded-full`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {floorRanges.map((item) => (
                    <div
                      key={item.room.id}
                      className={`${floor.bg} border-l-4 ${floor.border} rounded-xl p-5 shadow-sm hover:shadow-md transition-all`}
                    >
                      <h3 className={`font-bold text-xl ${floor.color} mb-2`}>
                        {item.room.name}
                      </h3>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        {item.room.capacity} 👤
                        {item.room.features?.blackboard && (
                          <span className="ml-2 text-xs bg-white/80 px-2 py-0.5 rounded-full">
                            📋 Blackboard
                          </span>
                        )}
                      </div>

                      {item.ranges.map((range, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200 mb-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-gray-500">Available from</div>
                              <div className="font-semibold text-sm">
                                {new Date(range.start).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                            <div className="text-2xl text-gray-300">→</div>
                            <div>
                              <div className="text-xs text-gray-500">Until</div>
                              <div className="font-semibold text-sm">
                                {new Date(range.end).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-center">
                            <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">
                              {range.days} consecutive days
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
