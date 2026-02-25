import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';

export function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const res = await register(name, email, password);
      setAuth(res.data, res.token);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kayıt başarısız!');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Kayıt Ol</h1>

        <div className="flex flex-col gap-4">
          <Input
            label="Ad Soyad"
            value={name}
            onChange={setName}
            placeholder="Ad Soyad"
          />
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
            Kayıt Ol
          </Button>

          <p className="text-center text-sm text-gray-600">
            Hesabın var mı?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}