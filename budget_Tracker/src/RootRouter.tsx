import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import App from './App';
import { AuthPage } from '@/components/ui/auth-page';
import RegisterPage from '@/pages/RegisterPage';

function LoginRoute() {
  const navigate = useNavigate();
  return (
    <AuthPage
      initialMode="login"
      onBackToHome={() => navigate('/')}
      onSuccess={() => navigate('/')}
      onRequestSignup={() => navigate('/register')}
    />
  );
}

export default function RootRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
