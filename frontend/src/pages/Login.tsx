import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth'; 
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export function Login() {
  const navigate = useNavigate();
  // Zustand store'dan setAuth fonksiyonunu alıyoruz
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Klasik Giriş (Email/Şifre)
  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      // res.data kullanıcı objesini, res.token ise string token'ı temsil eder
      setAuth(res.data, res.token);
      navigate('/calendar');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Giriş başarısız!');
    } finally {
      setLoading(false);
    }
  }

  // Google Giriş Başarılı Olduğunda
  const handleGoogleSuccess = async (response: any) => {
    try {
      const res = await axios.post('http://localhost:8000/api/auth/google', {
        credential: response.credential
      });

      if (res.data.success) {
        // ✅ EN ÖNEMLİ KISIM: Zustand setAuth çağrılıyor.
        // Bu işlem otomatik olarak 'auth-storage'ı günceller ve Navbar'ı tetikler.
        setAuth(res.data.user, res.data.token);

        console.log("Google ile giriş başarılı");
        
        // Navigate ile yönlendirmek yeterli olmalı çünkü setAuth state'i güncelledi.
        // Eğer Navbar hala gelmezse window.location.href = '/' kullanabilirsin.
        navigate('/calendar'); 
      }
    } catch (error: any) {
      console.error("Google Giriş Hatası:", error.response?.data || error.message);
      setError('Google ile giriş yapılamadı.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Giriş Yap</h1>

        <div className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="ornek@email.com"
          />
          <Input
            label="Şifre"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••"
          />

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} onClick={handleSubmit}>
            Giriş Yap
          </Button>

          {/* Ayırıcı Çizgi */}
          <div className="flex items-center my-2">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-3 text-gray-400 text-xs uppercase font-bold">Veya</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Google Butonu */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.log('Login Failed')}
              useOneTap
              prompt="select_account"
            />
          </div>

          <p className="text-center text-sm text-gray-600 mt-4">
            Hesabın yok mu?{' '}
            <Link to="/register" className="text-blue-600 hover:underline">
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;