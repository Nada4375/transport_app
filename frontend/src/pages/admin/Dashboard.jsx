import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Transporter.css';
import {
  Truck, Users, ClipboardList, RefreshCw, CheckCircle,
  Clock, Map, ArrowRight, TrendingUp, AlertCircle, RefreshCcw, Star
} from 'lucide-react';

import {
  ordersAPI,
  vehiclesAPI,
  driversAPI,
  transportersAPI,
} from '../../services/api';

import '../transporter/Transporter.css';

const STATUS_CONFIG = {
  pending: { label: 'En attente', cls: 'badge-gray' },
  validated: { label: 'Validée', cls: 'badge-orange' },
  assigned: { label: 'Assignée', cls: 'badge-orange' },
  in_transit: { label: 'En transit', cls: 'badge-blue' },
  delivered: { label: 'Livrée', cls: 'badge-green' },
  cancelled: { label: 'Annulée', cls: 'badge-red' },
  on_mission: { label: 'En mission', cls: 'badge-blue' },
  available: { label: 'Disponible', cls: 'badge-green' },
  maintenance: { label: 'Maintenance', cls: 'badge-red' },
  idle: { label: 'Inactif', cls: 'badge-gray' },
  on_delivery: { label: 'En livraison', cls: 'badge-blue' },
  offline: { label: 'Hors ligne', cls: 'badge-gray' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status || '—', cls: 'badge-gray' };
  return <span className={`tp-badge ${cfg.cls}`}>{cfg.label}</span>;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-MA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, ordersRes, vRes, dRes, tRes] = await Promise.allSettled([
        ordersAPI.stats(),
        ordersAPI.list(),
        vehiclesAPI.list(),
        driversAPI.list(),
        transportersAPI.list(),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }

      if (ordersRes.status === 'fulfilled') {
        const data = ordersRes.value.data.results || ordersRes.value.data || [];
        setOrders(Array.isArray(data) ? data.slice(0, 6) : []);
      }

      if (vRes.status === 'fulfilled') {
        const data = vRes.value.data.results || vRes.value.data || [];
        setVehicles(Array.isArray(data) ? data.slice(0, 5) : []);
      }

      if (dRes.status === 'fulfilled') {
        const data = dRes.value.data.results || dRes.value.data || [];
        setDrivers(Array.isArray(data) ? data.slice(0, 5) : []);
      }

      if (tRes.status === 'fulfilled') {
        const data = tRes.value.data.results || tRes.value.data || [];
        setTransporters(Array.isArray(data) ? data.slice(0, 5) : []);
      }
    } catch (err) {
      console.error('ADMIN DASHBOARD ERROR:', err);
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalOrders = stats?.total_orders ?? stats?.total ?? orders.length;
  const pendingCount = stats?.pending_count ?? orders.filter(o => o.status === 'pending').length;
  const validatedCount = stats?.validated_count ?? orders.filter(o => o.status === 'validated').length;
  const activeRoutes = stats?.active_routes ?? orders.filter(o => ['assigned', 'in_transit'].includes(o.status)).length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const deliveryRate = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;

  const statCards = [
    {
      icon: <ClipboardList size={20} />,
      label: 'Total commandes',
      value: totalOrders,
      color: 'blue',
      action: () => navigate('/admin/orders'),
    },
    {
      icon: <Clock size={20} />,
      label: 'En attente',
      value: pendingCount,
      color: 'gray',
      action: () => navigate('/admin/validation'),
    },
    {
      icon: <CheckCircle size={20} />,
      label: 'Validées à assigner',
      value: validatedCount,
      color: 'orange',
      action: () => navigate('/admin/validation'),
    },
    {
      icon: <RefreshCw size={20} />,
      label: 'Routes actives',
      value: activeRoutes,
      color: 'blue',
      action: () => navigate('/admin/map'),
    },
    {
      icon: <TrendingUp size={20} />,
      label: 'Taux de livraison',
      value: `${deliveryRate}%`,
      color: 'green',
    },
    {
      icon: <Truck size={20} />,
      label: 'Véhicules disponibles',
      value: vehicles.filter(v => v.status === 'available').length,
      color: 'green',
    },
    {
      icon: <Users size={20} />,
      label: 'Chauffeurs disponibles',
      value: drivers.filter(d => d.status === 'available').length,
      color: 'green',
    },
  ];

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title">Dashboard Admin</h1>
          <p className="tp-page-sub">Vue globale de la plateforme TransportHub</p>
        </div>

        <div className="tp-header-actions">
          <button className="tp-btn-secondary" onClick={load} title="Actualiser">
            <RefreshCcw size={15} />
          </button>

          <button className="tp-btn-primary" onClick={() => navigate('/admin/validation')}>
            Valider / Assigner <ArrowRight size={16} />
          </button>

          <button className="tp-btn-secondary" onClick={() => navigate('/admin/map')}>
            <Map size={15} /> Carte live
          </button>
        </div>
      </div>

      {error && (
        <div className="tp-alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {pendingCount > 0 && (
        <div
          className="tp-alert-warning"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/admin/validation')}
        >
          <AlertCircle size={16} />
          <strong>{pendingCount} commande{pendingCount > 1 ? 's' : ''} en attente</strong>
          de validation.
        </div>
      )}

      {loading ? (
        <div className="tp-empty">Chargement des données…</div>
      ) : (
        <div className="tp-stats-grid">
          {statCards.map((s, i) => (
            <div
              key={i}
              className={`tp-stat-card accent-${s.color}${s.action ? ' clickable' : ''}`}
              onClick={s.action}
              style={s.action ? { cursor: 'pointer' } : {}}
            >
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
            <h2>Commandes récentes</h2>
            <button className="tp-link" onClick={() => navigate('/admin/orders')}>
              Tout voir
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="tp-empty-small">Aucune commande enregistrée.</div>
          ) : (
            <div className="tp-table-wrap">
              <table className="tp-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Client</th>
                    <th>Départ</th>
                    <th>Destination</th>
                    <th>Transporteur</th>
                    <th>Chauffeur</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td><span className="tp-code">#{o.id}</span></td>
                      <td><strong>{o.client_name || '—'}</strong></td>
                      <td className="tp-td-muted">{o.departure_city || '—'}</td>
                      <td className="tp-td-muted">{o.destination_city || '—'}</td>
                      <td>{o.transporter_name || <span className="tp-td-muted">—</span>}</td>
                      <td>{o.driver_name || <span className="tp-td-muted">—</span>}</td>
                      <td className="tp-td-muted">{fmtDate(o.created_at)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>
                        <button
                          className="tp-action-btn"
                          onClick={() => navigate(`/admin/map?order=${o.id}`)}
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
            <h2>Véhicules</h2>
          </div>

          {vehicles.length === 0 ? (
            <div className="tp-empty-small">Aucun véhicule.</div>
          ) : (
            <div className="tp-list">
              {vehicles.map(v => (
                <div key={v.id} className="tp-list-item">
                  <div className="tp-list-icon"><Truck size={22} /></div>
                  <div className="tp-list-body">
                    <strong>{v.plate_number}</strong>
                    <small>{v.transporter_name || v.vehicle_type || '—'}</small>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="tp-card">
          <div className="tp-card-header">
            <h2>Chauffeurs</h2>
          </div>

          {drivers.length === 0 ? (
            <div className="tp-empty-small">Aucun chauffeur.</div>
          ) : (
            <div className="tp-list">
              {drivers.map(d => (
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

        <div className="tp-card">
          <div className="tp-card-header">
            <h2>Transporteurs</h2>
            <button className="tp-link" onClick={() => navigate('/admin/transporters')}>
              Tout voir
            </button>
          </div>

          {transporters.length === 0 ? (
            <div className="tp-empty-small">Aucun transporteur.</div>
          ) : (
            <div className="tp-list">
              {transporters.map(t => (
                <div key={t.id} className="tp-list-item">
                  <div className="tp-list-avatar">
                    {(t.company_name || 'T')[0].toUpperCase()}
                  </div>
                  <div className="tp-list-body">
                    <strong>{t.company_name || '—'}</strong>
                    <small>{t.city || '—'} · {t.phone || '—'}</small>
                  </div>
                  <Star size={14} color="var(--g-400)" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}