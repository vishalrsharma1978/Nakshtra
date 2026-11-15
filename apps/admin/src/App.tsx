import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Questions from './pages/Questions';
import Experts from './pages/Experts';
import Consultations from './pages/Consultations';
import Users from './pages/Users';
import Payments from './pages/Payments';
import Horoscopes from './pages/Horoscopes';
import Settings from './pages/Settings';

function Protected() {
  const { session, isAdmin, loading } = useAdminAuth();
  if (loading) return <p className="muted center-page">Loading…</p>;
  if (!session || !isAdmin) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/experts" element={<Experts />} />
            <Route path="/consultations" element={<Consultations />} />
            <Route path="/users" element={<Users />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/horoscopes" element={<Horoscopes />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
