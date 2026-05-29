// ============================================================
//  transporter/Orders.jsx  —  TransportHub
//  Modifications :
//   - Suppression TOTALE des MOCK_ORDERS
//   - Commandes réelles depuis GET /api/orders/
//   - Actions corrigées :
//     · Démarrer → POST /api/orders/{id}/start/
//     · Livré    → POST /api/orders/{id}/deliver/
//   - Statuts corrigés : in_transit (pas in_progress)
//   - Dates affichées avec toLocaleString('fr-MA')
//   - État vide propre si aucune commande
// ============================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import toast from 'react-hot-toast';
import {
  Clock, ClipboardList, RefreshCw, CheckCircle, XCircle,
  MapPin, Flag, Map, Play, Search, ChevronDown, ChevronUp,
  Navigation, Package, RefreshCcw
} from 'lucide-react';
import './Transporter.css';

// ── Config statuts (noms backend réels) ──────────────────────
const STATUS_CONFIG = {
  pending:    { label: 'En attente',  cls: 'badge-gray',   Icon: Clock         },
  validated:  { label: 'Validée',     cls: 'badge-orange', Icon: ClipboardList  },
  assigned:   { label: 'Assignée',    cls: 'badge-orange', Icon: ClipboardList  },
  in_transit: { label: 'En transit',  cls: 'badge-blue',   Icon: RefreshCw      },
  delivered:  { label: 'Livrée',      cls: 'badge-green',  Icon: CheckCircle    },
  cancelled:  { label: 'Annulée',     cls: 'badge-red',    Icon: XCircle        },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

// ── Formatage date fr-MA ─────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-MA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TransporterOrders() {
  const navigate = useNavigate();

  // ── État — AUCUNE mock data ───────────────────────────────
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedId,    setExpandedId]    = useState(null);

  // ── Chargement commandes ──────────────────────────────────
  const loadOrders = async () => {
    setLoading(true);
    try {
      const res  = await axios.get('/api/orders/');
      const data = res.data.results || res.data;
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Impossible de charger les commandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  // ── Démarrer la livraison : assigned → in_transit ─────────
  const startDelivery = async (order) => {
    setActionLoading(order.id);
    try {
      const res = await axios.post(`/api/orders/${order.id}/start/`);
      setOrders(o => o.map(x => x.id === order.id ? res.data.order : x));
      toast.success(`Livraison #${order.id} démarrée.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Impossible de démarrer la livraison.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Marquer livré : in_transit → delivered ────────────────
  const markDelivered = async (order) => {
    setActionLoading(order.id);
    try {
      const res = await axios.post(`/api/orders/${order.id}/deliver/`);
      setOrders(o => o.map(x => x.id === order.id ? res.data.order : x));
      toast.success(`Commande #${order.id} livrée !`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Impossible de confirmer la livraison.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Filtres ───────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (
      ((o.client_name       || '').toLowerCase().includes(q) ||
       (o.departure_city    || '').toLowerCase().includes(q) ||
       (o.destination_city  || '').toLowerCase().includes(q) ||
       (o.departure_address || '').toLowerCase().includes(q) ||
       String(o.id).includes(q)) &&
      (statusFilter === 'all' || o.status === statusFilter)
    );
  });

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="tp-page">

      {/* Header */}
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title">Mes Commandes</h1>
          <p className="tp-page-sub">{orders.length} commande{orders.length !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="tp-header-actions">
          <button className="tp-btn-secondary" onClick={loadOrders} title="Actualiser">
            <RefreshCcw size={15} />
          </button>
          <button className="tp-btn-secondary" onClick={() => navigate('/transporter/map')}>
            <Map size={15} /> Voir sur la carte
          </button>
        </div>
      </div>

      {/* Pills de statut */}
      <div className="tp-status-pills">
        <button
          className={`tp-status-pill ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <Package size={13} /> Toutes
          <span className="tp-status-count">{orders.length}</span>
        </button>
        {ALL_STATUSES.map(s => {
          const { label, Icon } = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              className={`tp-status-pill ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            >
              <Icon size={13} strokeWidth={2} />
              {label}
              {counts[s] > 0 && (
                <span className="tp-status-count">{counts[s]}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Barre de recherche */}
      <div className="tp-filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{
            position: 'absolute', left: 14, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--mist)', pointerEvents: 'none'
          }} />
          <input
            className="tp-search"
            style={{ paddingLeft: 40 }}
            placeholder="Rechercher par client, ville ou #commande…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="tp-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Tous les statuts</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Liste des commandes */}
      <div className="tp-orders-list">
        {loading ? (
          <div className="tp-empty">Chargement des commandes…</div>
        ) : filtered.length === 0 ? (
          <div className="tp-empty">
            <strong>Aucune commande trouvée</strong>
            <span>Modifiez vos filtres ou attendez une assignation.</span>
          </div>
        ) : filtered.map(order => {
          const st          = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
          const isExpanded  = expandedId === order.id;
          const isActioning = actionLoading === order.id;

          return (
            <div key={order.id} className={`tp-order-card${isExpanded ? ' expanded' : ''}`}>

              {/* En-tête de la carte */}
              <div
                className="tp-order-card-header"
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
              >
                <div className="tp-order-id">
                  <span className="tp-code">#{order.id}</span>
                  <span className={`tp-badge ${st.cls}`}>
                    <st.Icon size={11} strokeWidth={2.5} />
                    {st.label}
                  </span>
                </div>

                <div className="tp-order-client">
                  <strong>{order.client_name || '—'}</strong>
                  <small>
                    {order.merchandise_type || ''}
                    {order.quantity_kg ? ` · ${order.quantity_kg} kg` : ''}
                  </small>
                </div>

                <div className="tp-order-addresses">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={12} color="var(--g-400)" />
                    {order.departure_city || order.departure_address || '—'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Flag size={12} color="var(--stone)" />
                    {order.destination_city || order.destination_address || '—'}
                  </span>
                </div>

                <div className="tp-order-meta">
                  <span className="tp-td-muted">{fmtDate(order.created_at)}</span>
                  {order.priority && order.priority !== 'standard' && (
                    <span className={`tp-badge ${order.priority === 'urgent' ? 'badge-red' : 'badge-orange'}`}>
                      {order.priority}
                    </span>
                  )}
                </div>

                <div className="tp-order-expand">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Détails dépliés */}
              {isExpanded && (
                <div className="tp-order-card-body">
                  <div className="tp-order-details-grid">
                    <div className="tp-od-item">
                      <span>Véhicule</span>
                      <strong>
                        {order.vehicle_plate
                          ? <span className="tp-code">{order.vehicle_plate}</span>
                          : '—'}
                      </strong>
                    </div>
                    <div className="tp-od-item">
                      <span>Chauffeur</span>
                      <strong>{order.driver_name || '—'}</strong>
                    </div>
                    <div className="tp-od-item">
                      <span>Créée le</span>
                      <strong>{fmtDate(order.created_at)}</strong>
                    </div>
                    {order.assigned_at && (
                      <div className="tp-od-item">
                        <span>Assignée le</span>
                        <strong>{fmtDate(order.assigned_at)}</strong>
                      </div>
                    )}
                    {order.started_at && (
                      <div className="tp-od-item">
                        <span>Démarrée le</span>
                        <strong>{fmtDate(order.started_at)}</strong>
                      </div>
                    )}
                    {order.delivered_at && (
                      <div className="tp-od-item">
                        <span>Livrée le</span>
                        <strong>{fmtDate(order.delivered_at)}</strong>
                      </div>
                    )}
                    {order.distance_km && (
                      <div className="tp-od-item">
                        <span>Distance</span>
                        <strong>{order.distance_km.toFixed(1)} km</strong>
                      </div>
                    )}
                    {order.notes && (
                      <div className="tp-od-item" style={{ gridColumn: '1/-1' }}>
                        <span>Notes</span>
                        <strong>{order.notes}</strong>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="tp-order-actions">
                    {order.status === 'assigned' && (
                      <button
                        className="tp-btn-primary"
                        disabled={isActioning}
                        onClick={() => startDelivery(order)}
                      >
                        <Play size={14} />
                        {isActioning ? 'Démarrage…' : 'Démarrer la livraison'}
                      </button>
                    )}

                    {order.status === 'in_transit' && (
                      <button
                        className="tp-btn-success"
                        disabled={isActioning}
                        onClick={() => markDelivered(order)}
                      >
                        <CheckCircle size={14} />
                        {isActioning ? 'Confirmation…' : 'Marquer comme livré'}
                      </button>
                    )}

                    {(order.status === 'in_transit' || order.status === 'assigned') && (
                      <button
                        className="tp-btn-secondary"
                        onClick={() => navigate(`/transporter/map?order=${order.id}`)}
                      >
                        <Navigation size={14} /> Voir sur la carte
                      </button>
                    )}

                    {order.status === 'delivered' && (
                      <button
                        className="tp-btn-secondary"
                        onClick={() => navigate(`/transporter/map?order=${order.id}`)}
                      >
                        <Map size={14} /> Voir le trajet
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}