import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import App from './App';
import { AuthPage } from '@/components/ui/auth-page';
import RegisterPage from '@/pages/RegisterPage';
import SocialCallbackPage from '@/pages/SocialCallbackPage';
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/PasswordRecoveryPages';
import { useAuth } from '@/context/AuthContext';

function LoginRoute() {
  const navigate = useNavigate();
  const { loading, isAuthenticated } = useAuth();
  if (!loading && isAuthenticated) return <Navigate to="/dashboard" replace />;
  return (
    <AuthPage
      initialMode="login"
      onBackToHome={() => navigate('/')}
      onSuccess={() => navigate('/dashboard', { replace: true })}
      onRequestSignup={() => navigate('/register')}
    />
  );
}

export default function RootRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/dashboard" element={<App />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<SocialCallbackPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
