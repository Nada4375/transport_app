import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
// App.jsx

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
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
} from 'lucide-react';

import useAuthStore from '../../store/authStore';
import { transportersAPI } from '../../services/api';
import './Layout.css';

const NAV = {
  client: [
    { to: '/client', label: 'Dashboard', icon: <Home size={18} />, end: true },
    { to: '/client/orders', label: 'My Orders', icon: <Package size={18} /> },
    { to: '/client/orders/new', label: 'New Order', icon: <PlusCircle size={18} /> },
    { to: '/client/map', label: 'Live Map', icon: <MapPinned size={18} /> },
  ],
  transporter: [
    { to: '/transporter', label: 'Dashboard', icon: <Home size={18} />, end: true },
    { to: '/transporter/orders', label: 'Assigned Orders', icon: <ClipboardList size={18} /> },
    { to: '/transporter/fleet', label: 'My Fleet', icon: <Truck size={18} /> },
    { to: '/transporter/map', label: 'Position Map', icon: <MapPinned size={18} /> },
  ],
  admin: [
    { to: '/admin', label: 'Analytics', icon: <BarChart3 size={18} />, end: true },
    { to: '/admin/orders', label: 'All Orders', icon: <ClipboardList size={18} /> },
    { to: '/admin/validation', label: 'Validation', icon: <CheckCircle size={18} /> },
    { to: '/admin/map', label: 'Map Overview', icon: <MapPinned size={18} /> },
    // Layout.jsx dans admin nav
    { to: '/admin/transporters', label: 'Transporteurs', icon: <Truck size={18} strokeWidth={1.8} /> },
  ],
};

export default function Layout({ role }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [showProfile, setShowProfile] = useState(false);
  const [transporterProfile, setTransporterProfile] = useState(null);

  useEffect(() => {
    if (role === 'transporter') {
      transportersAPI.profile()
        .then((res) => setTransporterProfile(res.data))
        .catch(() => setTransporterProfile(null));
    }
  }, [role]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const displayName = user?.first_name || user?.username || 'Utilisateur';

  const profileName =
    transporterProfile?.responsable_name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    '—';

  const profileEmail =
    transporterProfile?.email ||
    user?.email ||
    '—';

  const profilePhone =
    transporterProfile?.phone ||
    user?.phone ||
    '—';

  const profileCompany =
    transporterProfile?.company_name ||
    user?.company_name ||
    '—';

  const profileAddress =
    transporterProfile?.local_address ||
    transporterProfile?.city ||
    user?.city ||
    '—';

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
          <button
            type="button"
            className="sidebar-user-main"
            onClick={() => setShowProfile(true)}
            title="Voir le profil"
          >
            <div className="user-avatar">
              {user?.first_name?.[0] || user?.username?.[0] || '?'}
            </div>

            <div className="user-info">
              <div className="user-name">{displayName}</div>
              <div className="user-email">{profileEmail}</div>
            </div>
          </button>

          <button onClick={handleLogout} className="logout-btn" title="Logout">
            <Power size={18} strokeWidth={1.8} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      {showProfile && (
        <div className="profile-overlay" onClick={() => setShowProfile(false)}>
          <div className="profile-card" onClick={(e) => e.stopPropagation()}>
            <button className="profile-close" onClick={() => setShowProfile(false)}>
              <X size={16} />
            </button>

            <div className="profile-avatar">
              {user?.first_name?.[0] || user?.username?.[0] || '?'}
            </div>

            <h2>{transporterProfile?.company_name || user?.username || 'Profil'}</h2>
            <p className="profile-role">@{user?.username} · {role}</p>

            <div className="profile-info-list">
              <div>
                <User size={16} />
                <span>{profileName}</span>
              </div>

              <div>
                <Mail size={16} />
                <span>{profileEmail}</span>
              </div>

              <div>
                <Phone size={16} />
                <span>{profilePhone}</span>
              </div>

              <div>
                <Building2 size={16} />
                <span>{profileCompany}</span>
              </div>

              <div>
                <MapPin size={16} />
                <span>{profileAddress}</span>
              </div>
            </div>

            <button className="profile-logout" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}