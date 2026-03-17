import { useAuthStore } from '../store/authStore';
import { logoutApi } from '../api/auth'; // logoutApi olarak import ettik
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      // Önce API tarafında çıkış yapalım
      await logoutApi(); 
    } catch (error) {
      console.error("API logout hatası:", error);
    } finally {
      // API hata verse bile tarayıcıdaki kullanıcıyı temizleyelim (Güvenli çıkış)
      logoutStore();
      navigate('/login');
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6 border-t-4 border-brand-primary">
        <h1 className="text-2xl font-bold text-green-600 mb-4 flex items-center gap-2">
          <span>✅</span> login Successful!
        </h1>
        
        {user && (
          <div className="mb-6 space-y-2 text-gray-700 bg-slate-50 p-4 rounded-lg">
            <p className="flex justify-between">
              <span className="font-bold uppercase text-[10px] text-gray-400">Username</span> 
              <span className="font-semibold">{user.name}</span>
            </p>
            <p className="flex justify-between border-t pt-2">
              <span className="font-bold uppercase text-[10px] text-gray-400">Role</span> 
              <span className="bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded text-[10px] font-black uppercase">
                {user.role}
              </span>
            </p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full bg-red-500 text-white py-3 rounded-lg font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-colors shadow-lg active:scale-95"
        >
          Sistemden Güvenli Çıkış
        </button>
      </div>
    </div>
  );
}
export default Dashboard
