import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';

// Sayfa Importları
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Bookings from './pages/Bookings';
import Calendar from './pages/Calendar';
import Available from './pages/Available';
import AvailableRanges from './pages/AvailableRanges';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { Navbar } from './components/UI/Navbar'; // Süslü parantez ekledik çünkü 'named export'

const queryClient = new QueryClient();

// PrivateRoute: Giriş kontrolü
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  return user ? <>{children}</> : <Navigate to="/login" />;
};

// AdminRoute: Yetki kontrolü
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/" />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* ✅ NAVBAR BURADA OLMALI! 
          Böylece Routes değişse bile Navbar hep tepede kalır.
        */}
        <Navbar /> 

        <Routes>
          {/* Public Rotalar */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Korumalı Rotalar */}
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/rooms" element={<PrivateRoute><Rooms /></PrivateRoute>} />
          <Route path="/bookings" element={<PrivateRoute><Bookings /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><Calendar /></PrivateRoute>} />
          <Route path="/available" element={<PrivateRoute><Available /></PrivateRoute>} />
          <Route path="/available-ranges" element={<PrivateRoute><AvailableRanges /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />

          {/* Admin Rotası */}
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;