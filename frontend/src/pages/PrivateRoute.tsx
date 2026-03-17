import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
    const token = localStorage.getItem('token');
    
    // Eğer token yoksa, kullanıcıyı login sayfasına geri gönder
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
};