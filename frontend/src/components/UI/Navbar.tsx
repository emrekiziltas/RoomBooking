import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { logoutApi } from "../../api/auth";
import api from "../../api/axios";

export function Navbar() {
  const [navItems, setNavItems] = useState<any[]>([]);
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNav = async () => {
      try {
        const response = await api.get("/navigation");
        setNavItems(response.data);
      } catch (error) {
        console.error("Menü hatası:", error);
      }
    };
    if (user) fetchNav();
  }, [user]);

  async function handleLogout() {
    try {
      await logoutApi();
    } catch (error) {
      console.error("Çıkış hatası:", error);
    } finally {
      logoutStore();
      navigate("/login");
    }
  }

  // Filtreleme Mantığı
  const filteredNavItems = navItems.filter((item) => {
    try {
      const meta = typeof item.metadata === "string" ? JSON.parse(item.metadata) : item.metadata;
      const isAdminRequired = meta?.requiresAdmin === true || meta?.role === "admin";
      if (isAdminRequired && user?.role !== "admin") return false;
      return true;
    } catch (e) {
      return true;
    }
  });

  if (!user) return null;

  return (
    <nav className="bg-white border-b-2 border-brand-surface px-8 py-3 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
      <div className="flex items-center gap-10">
        {/* Logo Alanı */}
        <div className="cursor-pointer group" onClick={() => navigate("/")}>
          <span className="font-black italic text-2xl tracking-tighter uppercase text-brand-secondary group-hover:text-brand-primary transition-colors">
            InI <span className="text-brand-primary text-xs italic lowercase tracking-normal font-medium">booking</span>
          </span>
        </div>
        
        {/* Dinamik Menü Tabları */}
        <div className="flex gap-1">
          {navItems.length > 0 ? (
            filteredNavItems.map((item) => {
              let path = "#";
              try {
                const meta = typeof item.metadata === "string" ? JSON.parse(item.metadata) : item.metadata;
                path = meta?.path || "#";
              } catch (e) {}
              
              return (
                <NavLink 
                  key={item.id} 
                  to={path} 
                  className={({ isActive }) => 
                    `px-4 py-2 rounded-ini text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${
                      isActive 
                        ? "text-brand-primary bg-brand-primary/10 shadow-sm" 
                        : "text-brand-muted hover:text-brand-secondary hover:bg-brand-surface"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              );
            })
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 opacity-40">
               <div className="w-2 h-2 bg-brand-primary rounded-full animate-ping"></div>
               <span className="text-[10px] font-black uppercase tracking-widest">Sistem Yükleniyor...</span>
            </div>
          )}
        </div>
      </div>

      {/* Sağ Taraf: Profil ve Çıkış */}
      <div className="flex items-center gap-6">
        <div className="text-right hidden sm:block border-r-2 border-brand-surface pr-6">
          <p className="text-[9px] font-black text-brand-muted uppercase leading-none mb-1">Hesap Türü</p>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-ini uppercase border ${
            user?.role === 'admin' 
              ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            {user?.role || 'User'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:block">
            <p className="text-[10px] font-black text-brand-muted uppercase leading-none">Hoş geldin</p>
            <p className="text-xs font-black text-brand-secondary uppercase">{user?.name}</p>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="bg-brand-secondary text-white px-5 py-2.5 rounded-ini hover:bg-brand-danger transition-all duration-300 text-[11px] font-black uppercase tracking-widest shadow-md shadow-brand-secondary/20 active:scale-95"
          >
            Güvenli Çıkış
          </button>
        </div>
      </div>
    </nav>
  );
}