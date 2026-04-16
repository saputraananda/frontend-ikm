import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import AbsensiPage from './pages/AbsensiPage';
import ValetPage from './pages/ValetPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import ReportLeader from './pages/ReportLeader';
import AboutAppPage from './pages/AboutAppPage';
import ProtectedRoute from './components/ProtectedRoute';
import useAuthStore from './store/authStore';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

export default function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><AbsensiPage /></ProtectedRoute>} />
        <Route path="/valet" element={<ProtectedRoute><ValetPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><ReportLeader /></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute><AboutAppPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}