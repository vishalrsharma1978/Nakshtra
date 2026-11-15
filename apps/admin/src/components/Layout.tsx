import { NavLink, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../auth';

const NAV = [
  { to: '/', label: '📊 Dashboard', end: true },
  { to: '/questions', label: '💬 Questions & SLA' },
  { to: '/experts', label: '🔮 Consultants' },
  { to: '/consultations', label: '📹 Consultations' },
  { to: '/users', label: '👥 Users' },
  { to: '/payments', label: '💳 Payments' },
  { to: '/horoscopes', label: '🌙 Horoscopes' },
  { to: '/settings', label: '⚙️ Settings' },
];

export default function Layout() {
  const { profile, signOut } = useAdminAuth();
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1 className="brand"><img src="/logo.png" alt="Nakshtra" className="brand-logo" /> Nakshtra Admin</h1>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>{profile?.email}</span>
          <button className="btn btn-outline" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
