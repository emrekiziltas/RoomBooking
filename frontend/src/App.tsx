import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';

// Sayfalar
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Rooms } from './pages/Rooms';
import { Bookings } from './pages/Bookings';
import { Calendar } from './pages/Calendar';
import { Available } from './pages/Available';
import { AvailableRanges } from './pages/AvailableRanges';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

// Bileşenler
import { Navbar } from './components/UI/Navbar';

const queryClient = new QueryClient();

// --- 🔒 Giriş Kontrolü Yapan Bileşen ---
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50">
        {children}
      </div>
    </>
  );
}

// --- 🛡️ Admin Kontrolü Yapan Bileşen ---
function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);

  if (user?.role !== 'admin') {
    // Admin değilse Dashboard'a geri gönder
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Herkese Açık Rotalar */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Giriş Yapmış Kullanıcı Rotaları */}
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/rooms" element={<PrivateRoute><Rooms /></PrivateRoute>} />
          <Route path="/bookings" element={<PrivateRoute><Bookings /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><Calendar /></PrivateRoute>} />
          <Route path="/available" element={<PrivateRoute><Available /></PrivateRoute>} />
          <Route path="/available-ranges" element={<PrivateRoute><AvailableRanges /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />

          {/* Sadece Admin Rotaları */}
          <Route 
            path="/settings" 
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Settings />
                </AdminRoute>
              </PrivateRoute>
            } 
          />

          {/* Tanımlanmayan yollar için ana sayfaya yönlendir */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;