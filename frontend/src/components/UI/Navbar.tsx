import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../api/auth';
import api from '../../api/axios';

export function Navbar() {
  const [navItems, setNavItems] = useState<any[]>([]);
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNav = async () => {
      try {
        const response = await api.get('/navigation');
        setNavItems(response.data);
      } catch (error) {
      }
    };
    fetchNav();
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      logoutStore();
      navigate('/login');
    }
  }

  // Menüleri filtreleme mantığı
  const filteredNavItems = navItems.filter((item) => {
    try {
      const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
      const isAdminRequired = meta?.requiresAdmin === true || meta?.role === 'admin';

      if (!user) {
        return !isAdminRequired;
      }

      // Admin gerekiyorsa ama kullanıcı admin değilse gizle
      if (isAdminRequired && user.role !== 'admin') {
        return false;
      }

      return true;
    } catch (e) {
      return true; // JSON hatası varsa her ihtimale karşı göster
    }
  });

  // Link stillerini yöneten yardımcı fonksiyon
  const getLinkStyles = (item: any) => {
    // DB'den gelen metadata içindeki renkleri kullanabilirsin
    let meta: any = {};
    try {
      meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
    } catch (e) {}

    const base = "px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ";
    const active = meta?.active_bg_class || "text-brand-primary bg-brand-primary/10";
    const inactive = meta?.bg_color_class || "text-slate-400 hover:text-slate-900";

    return ({ isActive }: { isActive: boolean }) => 
      base + (isActive ? active : inactive);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-[100]">
      <div className="flex items-center gap-8">
        <div className="mr-4">
          <span className="font-black italic text-xl tracking-tighter uppercase">InI </span>
        </div>

        <div className="flex gap-2">
          {navItems.length > 0 ? (
            filteredNavItems.map((item) => {
              let path = '#';
              try {
                const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
                path = meta?.path || '#';
              } catch (e) {}

              return (
                <NavLink key={item.id} to={path} className={getLinkStyles(item)}>
                  {item.label}
                </NavLink>
              );
            })
          ) : (
            <span className="text-xs text-slate-300 animate-pulse uppercase font-bold">Loading system menu...</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        {user?.role === 'admin' && (
          <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-2 py-1 rounded border border-indigo-200 uppercase tracking-tighter">
            System Admin
          </span>
        )}

        <div className="text-right hidden md:block">
          <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Welcome</p>
          <p className="text-sm font-black text-slate-900 uppercase">{user?.name || 'User'}</p>
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