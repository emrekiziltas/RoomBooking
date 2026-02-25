import { useAuthStore } from '../store/authStore';
import { logout } from '../api/auth';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      logoutStore();
      navigate('/login');
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-green-600 mb-4">✅ Giriş Başarılı!</h1>
        
        {user && (
          <div className="mb-4 text-gray-700">
            <p><span className="font-medium">Ad:</span> {user.name}</p>
            <p><span className="font-medium">Email:</span> {user.email}</p>
            <p><span className="font-medium">Rol:</span> {user.role}</p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}