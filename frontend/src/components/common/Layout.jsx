import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Package,
  PlusCircle,
  MapPinned,
  ClipboardList,
  Truck,
  BarChart3,
  CheckCircle,
  Power,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import './Layout.css';

const NAV = {
  client: [
    { to: '/client', label: 'Dashboard', icon: <Home size={18} strokeWidth={1.8} />, end: true },
    { to: '/client/orders', label: 'My Orders', icon: <Package size={18} strokeWidth={1.8} /> },
    { to: '/client/orders/new', label: 'New Order', icon: <PlusCircle size={18} strokeWidth={1.8} /> },
    { to: '/client/map', label: 'Live Map', icon: <MapPinned size={18} strokeWidth={1.8} /> },
  ],
  transporter: [
    { to: '/transporter', label: 'Dashboard', icon: <Home size={18} strokeWidth={1.8} />, end: true },
    { to: '/transporter/orders', label: 'Assigned Orders', icon: <ClipboardList size={18} strokeWidth={1.8} /> },
    { to: '/transporter/fleet', label: 'My Fleet', icon: <Truck size={18} strokeWidth={1.8} /> },
    { to: '/transporter/map', label: 'Position Map', icon: <MapPinned size={18} strokeWidth={1.8} /> },
  ],
  admin: [
    { to: '/admin', label: 'Analytics', icon: <BarChart3 size={18} strokeWidth={1.8} />, end: true },
    { to: '/admin/orders', label: 'All Orders', icon: <ClipboardList size={18} strokeWidth={1.8} /> },
    { to: '/admin/validation', label: 'Validation', icon: <CheckCircle size={18} strokeWidth={1.8} /> },
    { to: '/admin/map', label: 'Map Overview', icon: <MapPinned size={18} strokeWidth={1.8} /> },
  ],
};

export default function Layout({ role }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Truck size={20} strokeWidth={1.8} />
          <span>TransportHub</span>
        </div>

        <div className="sidebar-role">{role}</div>

        <nav className="sidebar-nav">
          {NAV[role]?.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.first_name?.[0] || user?.username?.[0] || '?'}
          </div>

          <div className="user-info">
            <div className="user-name">{user?.first_name || user?.username}</div>
            <div className="user-email">{user?.email}</div>
          </div>

          <button onClick={handleLogout} className="logout-btn" title="Logout">
            <Power size={18} strokeWidth={1.8} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}