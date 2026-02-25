import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../api/auth';

export function Navbar() {
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
    <nav className="bg-white shadow-md px-8 py-4 flex justify-between items-center">
      <div className="flex gap-6">
        <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium">
          Dashboard
        </Link>
        <Link to="/rooms" className="text-gray-700 hover:text-blue-600 font-medium">
          Rooms
        </Link>
        <Link to="/bookings" className="text-gray-700 hover:text-blue-600 font-medium">
        Bookings
      </Link>
            <Link to="/available" className="text-gray-700 hover:text-blue-600 font-medium">
  Available 
</Link>
      <Link to="/available-ranges" className="text-gray-700 hover:text-blue-600 font-medium">
  Range Availablity
</Link>
      <Link to="/calendar" className="text-gray-700 hover:text-blue-600 font-medium">
  Calendar
</Link>
 

      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-600 text-sm">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-1 rounded-lg hover:bg-red-600 text-sm"
        >
          Çıkış
        </button>
      </div>
    </nav>
  );
}