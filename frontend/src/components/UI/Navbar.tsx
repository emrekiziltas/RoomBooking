import { NavLink, useNavigate } from 'react-router-dom';
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

  // Ortak stil fonksiyonu: Aktif linki Indigo (Mor-Mavi) yapar, diğerlerini gri bırakır.
  const linkStyles = ({ isActive }: { isActive: boolean }) =>
    `text-[11px] font-black uppercase tracking-widest transition-all border-b-2 py-1 ${
      isActive 
        ? 'text-indigo-600 border-indigo-600' 
        : 'text-slate-400 border-transparent hover:text-slate-900 hover:border-slate-300'
    }`;

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-[100]">
      <div className="flex items-center gap-8">
        {/* LOGO veya Uygulama Adı */}
        <div className="mr-4">
           <span className="font-black italic text-xl tracking-tighter uppercase">InI </span>
        </div>

        <div className="flex gap-6">
          <NavLink to="/calendar" className={linkStyles}>
            Calendar
          </NavLink>

          <NavLink to="/reports" className={linkStyles}>
            Reports
          </NavLink>

          <NavLink to="/bookings" className={linkStyles}>
            Bookings
          </NavLink>

          <NavLink to="/available" className={linkStyles}>
            Available
          </NavLink>

          <NavLink to="/available-ranges" className={linkStyles}>
            Range Availability
          </NavLink>

          <NavLink to="/rooms" className={linkStyles}>
            Rooms
          </NavLink>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right hidden md:block">
          <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Welcome</p>
          <p className="text-sm font-black text-slate-900 uppercase">{user?.name}</p>
        </div>
        
        <button
          onClick={handleLogout}
          className="bg-slate-900 text-white px-5 py-2 rounded-xl hover:bg-rose-600 transition-all text-[11px] font-black uppercase tracking-widest shadow-lg shadow-slate-200"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}