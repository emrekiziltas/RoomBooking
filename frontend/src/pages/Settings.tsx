import { useEffect, useState } from 'react';
import { getLookupValues, updateLookupValue } from '../api/lookups';

export function Settings() {
  const [lookups, setLookups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await getLookupValues();
      setLookups(res.data);
    } catch (err) {
      console.error("Lookup yükleme hatası");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 font-black animate-pulse">LOADING SYSTEM SETTINGS...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 border-b-4 border-brand-secondary pb-4">
        <h1 className="text-3xl font-black uppercase italic text-brand-secondary">
          System <span className="text-brand-primary">Configuration</span>
        </h1>
        <p className="text-xs font-bold text-brand-muted tracking-[0.3em] mt-1">LOOKUP VALUE MANAGEMENT</p>
      </div>

      {message && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 font-bold text-xs uppercase">
          {message}
        </div>
      )}

      <div className="bg-white shadow-xl rounded-ini overflow-hidden border border-brand-surface">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-secondary text-white text-[10px] uppercase tracking-widest">
              <th className="p-4">Type ID</th>
              <th className="p-4">Key / Code</th>
              <th className="p-4">Label / Value</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-surface">
            {lookups.map((item) => (
              <tr key={item.id} className="hover:bg-brand-surface/30 transition-colors">
                <td className="p-4 text-xs font-black text-brand-muted">{item.type_id}</td>
                <td className="p-4 text-xs font-black uppercase">{item.key}</td>
                <td className="p-4">
                  <input 
                    className="bg-brand-surface px-3 py-1 rounded font-bold text-xs w-full focus:ring-2 focus:ring-brand-primary outline-none"
                    defaultValue={item.label}
                    onBlur={async (e) => {
                       try {
                         await updateLookupValue(item.id, { label: e.target.value });
                         setMessage('Updated successfully!');
                         setTimeout(() => setMessage(''), 3000);
                       } catch (err) {
                         alert('Update failed');
                       }
                    }}
                  />
                </td>
                <td className="p-4 text-xs italic text-brand-muted">Auto-saves on blur</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}