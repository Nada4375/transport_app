import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Package, Users, ClipboardList, RefreshCw, CheckCircle,
  Map, ArrowRight, Star, AlertCircle
} from 'lucide-react';

import { ordersAPI, vehiclesAPI, driversAPI, transportersAPI } from '../../services/api';
import './Transporter.css';

const STATUS_CONFIG = {
  in_transit: { label: 'En cours', cls: 'badge-blue' },
  assigned: { label: 'Assignée', cls: 'badge-orange' },
  delivered: { label: 'Livrée', cls: 'badge-green' },
  pending: { label: 'En attente', cls: 'badge-gray' },
  validated: { label: 'Validée', cls: 'badge-orange' },
  on_mission: { label: 'En mission', cls: 'badge-blue' },
  available: { label: 'Disponible', cls: 'badge-green' },
  maintenance: { label: 'Maintenance', cls: 'badge-red' },
  offline: { label: 'Hors ligne', cls: 'badge-gray' },
  on_delivery: { label: 'En livraison', cls: 'badge-blue' },
  idle: { label: 'Inactif', cls: 'badge-gray' },
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-MA');
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status || '—', cls: 'badge-gray' };
  return <span className={`tp-badge ${cfg.cls}`}>{cfg.label}</span>;
}

export default function TransporterDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [profRes, statsRes, ordersRes, vRes, dRes] = await Promise.allSettled([
        transportersAPI.profile(),
        transportersAPI.dashboardStats(),
        ordersAPI.list(),
        vehiclesAPI.list(),
        driversAPI.list(),
      ]);

      if (profRes.status === 'fulfilled') {
        setProfile(profRes.value.data);
      } else {
        console.error('PROFILE ERROR:', profRes.reason?.response?.data || profRes.reason?.message);
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      } else {
        console.error('STATS ERROR:', statsRes.reason?.response?.data || statsRes.reason?.message);
      }

      if (ordersRes.status === 'fulfilled') {
        const data = ordersRes.value.data.results || ordersRes.value.data || [];
        const all = Array.isArray(data) ? data : [];
        setAssignments(
          all.filter(o => ['assigned', 'in_transit'].includes(o.status)).slice(0, 5)
        );
      } else {
        console.error('ORDERS ERROR:', ordersRes.reason?.response?.data || ordersRes.reason?.message);
      }

      if (vRes.status === 'fulfilled') {
        const data = vRes.value.data.results || vRes.value.data || [];
        setVehicles(Array.isArray(data) ? data : []);
      } else {
        console.error('VEHICLES ERROR:', vRes.reason?.response?.data || vRes.reason?.message);
      }

      if (dRes.status === 'fulfilled') {
        const data = dRes.value.data.results || dRes.value.data || [];
        setDrivers(Array.isArray(data) ? data : []);
      } else {
        console.error('DRIVERS ERROR:', dRes.reason?.response?.data || dRes.reason?.message);
      }

    } catch (err) {
      console.error('DASHBOARD ERROR:', err);
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statCards = [
    {
      icon: <Truck size={20} />,
      label: 'Véhicules disponibles',
      value: vehicles.filter(v => v.status === 'available').length,
      color: 'green',
    },
    {
      icon: <Package size={20} />,
      label: 'Véhicules en mission',
      value: vehicles.filter(v => v.status === 'on_mission').length,
      color: 'blue',
    },
    {
      icon: <Users size={20} />,
      label: 'Chauffeurs disponibles',
      value: drivers.filter(d => d.status === 'available').length,
      color: 'green',
    },
    {
      icon: <ClipboardList size={20} />,
      label: 'Commandes actives',
      value: assignments.length,
      color: 'orange',
    },
    {
      icon: <RefreshCw size={20} />,
      label: 'En transit',
      value: assignments.filter(o => o.status === 'in_transit').length,
      color: 'blue',
    },
    {
      icon: <CheckCircle size={20} />,
      label: 'Total livraisons',
      value: stats?.total_deliveries ?? profile?.total_deliveries ?? 0,
      color: 'gray',
    },
    {
      icon: <Star size={20} />,
      label: 'Note moyenne',
      value: stats?.rating ? `${Number(stats.rating).toFixed(1)} / 5` : '—',
      color: 'green',
    },
  ];

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title">
            {profile?.company_name || 'Tableau de bord'}
          </h1>
          <p className="tp-page-sub">Vue d'ensemble de votre activité de livraison</p>
        </div>

        <div className="tp-header-actions">
          <button className="tp-btn-primary" onClick={() => navigate('/transporter/orders')}>
            Voir les commandes <ArrowRight size={16} />
          </button>

          <button className="tp-btn-secondary" onClick={() => navigate('/transporter/map')}>
            <Map size={15} /> Carte live
          </button>
        </div>
      </div>

      {error && (
        <div className="tp-alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {profile && (
        <div className="tp-profile-card">
          <div className="tp-profile-grid">
           

          </div>
        </div>
      )}

      {loading ? (
        <div className="tp-empty">Chargement des données…</div>
      ) : (
        <div className="tp-stats-grid">
          {statCards.map((s, i) => (
            <div key={i} className={`tp-stat-card accent-${s.color}`}>
              <div className="tp-stat-icon">{s.icon}</div>
              <div className="tp-stat-val">{s.value}</div>
              <div className="tp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="tp-dash-grid">
        <div className="tp-card wide">
          <div className="tp-card-header">
            <h2>Dernières assignations</h2>
            <button className="tp-link" onClick={() => navigate('/transporter/orders')}>
              Tout voir
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="tp-empty-small">Aucune commande active pour le moment.</div>
          ) : (
            <div className="tp-table-wrap">
              <table className="tp-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Client</th>
                    <th>Départ</th>
                    <th>Destination</th>
                    <th>Chauffeur</th>
                    <th>Véhicule</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {assignments.map(a => (
                    <tr key={a.id}>
                      <td><span className="tp-code">#{a.id}</span></td>
                      <td><strong>{a.client_name || '—'}</strong></td>
                      <td className="tp-td-muted">{a.departure_city || a.departure_address || '—'}</td>
                      <td className="tp-td-muted">{a.destination_city || a.destination_address || '—'}</td>
                      <td>{a.driver_name || '—'}</td>
                      <td>{a.vehicle_plate ? <span className="tp-code">{a.vehicle_plate}</span> : '—'}</td>
                      <td className="tp-td-muted">{fmtDate(a.created_at)}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>
                        <button
                          className="tp-action-btn"
                          onClick={() => navigate(`/transporter/map?order=${a.id}`)}
                          title="Voir sur la carte"
                        >
                          <Map size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="tp-card">
          <div className="tp-card-header">
            <h2>Statut Véhicules</h2>
            <button className="tp-link" onClick={() => navigate('/transporter/fleet?tab=vehicles')}>
              Gérer
            </button>
          </div>

          {vehicles.length === 0 ? (
            <div className="tp-empty-small">Aucun véhicule enregistré.</div>
          ) : (
            <div className="tp-list">
              {vehicles.slice(0, 4).map(v => (
                <div key={v.id} className="tp-list-item">
                  <div className="tp-list-icon">
                    <Truck size={22} strokeWidth={1.5} />
                  </div>

                  <div className="tp-list-body">
                    <strong>{v.plate_number}</strong>
                    <small>{v.vehicle_type} · {v.capacity_kg ? `${v.capacity_kg} kg` : ''}</small>
                  </div>

                  <StatusBadge status={v.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="tp-card">
          <div className="tp-card-header">
            <h2>Statut Chauffeurs</h2>
            <button className="tp-link" onClick={() => navigate('/transporter/fleet?tab=drivers')}>
              Gérer
            </button>
          </div>

          {drivers.length === 0 ? (
            <div className="tp-empty-small">Aucun chauffeur enregistré.</div>
          ) : (
            <div className="tp-list">
              {drivers.slice(0, 4).map(d => (
                <div key={d.id} className="tp-list-item">
                  <div className="tp-list-avatar">
                    {(d.first_name || 'C')[0].toUpperCase()}
                  </div>

                  <div className="tp-list-body">
                    <strong>{d.first_name} {d.last_name}</strong>
                    <small>{d.phone || '—'}</small>
                  </div>

                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}