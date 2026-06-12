import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ordersAPI } from '../../services/api';
import {
  Clock, ClipboardList, RefreshCw, CheckCircle, XCircle,
  MapPin, Flag, Map, Play, Search, ChevronDown, ChevronUp,
  Navigation, Package, RefreshCcw
} from 'lucide-react';
import './Transporter.css';

const STATUS_CONFIG = {
  pending:    { label: 'En attente', cls: 'badge-gray',   Icon: Clock         },
  validated:  { label: 'Validée',    cls: 'badge-orange', Icon: ClipboardList  },
  assigned:   { label: 'Assignée',   cls: 'badge-orange', Icon: ClipboardList  },
  in_transit: { label: 'En transit', cls: 'badge-blue',   Icon: RefreshCw      },
  delivered:  { label: 'Livrée',     cls: 'badge-green',  Icon: CheckCircle    },
  cancelled:  { label: 'Annulée',    cls: 'badge-red',    Icon: XCircle        },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-MA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function DeadlineBadge({ desired_date }) {
  if (!desired_date) return null;
  const deadline = new Date(desired_date);
  const now = new Date();
  const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  const overdue = daysLeft < 0;
  const urgent = daysLeft >= 0 && daysLeft <= 2;
  return (
    <strong style={{ color: overdue ? '#E05050' : urgent ? '#EF9F27' : '#1D9E75' }}>
      {deadline.toLocaleDateString('fr-MA', { day: '2-digit', month: 'long', year: 'numeric' })}
      {overdue ? ' ⚠️ Dépassée' : urgent ? ` ⚡ Dans ${daysLeft} jour(s)` : ` ✅ Dans ${daysLeft} jour(s)`}
    </strong>
  );
}

function groupOrders(ordersList) {
  const groups = {};
  ordersList.forEach(o => {
    const key = `${(o.departure_city||'').toLowerCase()}__${(o.destination_city||'').toLowerCase()}__${o.desired_date}`;
    if (!groups[key]) {
      groups[key] = { key, departure_city: o.departure_city, destination_city: o.destination_city, desired_date: o.desired_date, orders: [], total_kg: 0 };
    }
    groups[key].orders.push(o);
    groups[key].total_kg += parseFloat(o.quantity_kg || 0);
  });
  return Object.values(groups).sort((a, b) => new Date(a.desired_date||0) - new Date(b.desired_date||0));
}

export default function TransporterOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.list();
      const data = res.data.results || res.data || [];
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Impossible de charger les commandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const startDelivery = async (order) => {
    setActionLoading(order.id);
    try {
      const res = await ordersAPI.start(order.id);
      setOrders(prev => prev.map(x => x.id === order.id ? res.data.order : x));
      toast.success(`Livraison #${order.id} démarrée.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Impossible de démarrer.');
    } finally { setActionLoading(null); }
  };

  const markDelivered = async (order) => {
    setActionLoading(order.id);
    try {
      const res = await ordersAPI.deliver(order.id);
      setOrders(prev => prev.map(x => x.id === order.id ? res.data.order : x));
      toast.success(`Commande #${order.id} livrée.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Impossible de confirmer.');
    } finally { setActionLoading(null); }
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (
      ((o.client_name||'').toLowerCase().includes(q) ||
       (o.departure_city||'').toLowerCase().includes(q) ||
       (o.destination_city||'').toLowerCase().includes(q) ||
       String(o.id).includes(q)) &&
      (statusFilter === 'all' || o.status === statusFilter)
    );
  });

  const counts = ALL_STATUSES.reduce((acc, s) => { acc[s] = orders.filter(o => o.status === s).length; return acc; }, {});
  const grouped = groupOrders(filtered);

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title">Mes Commandes</h1>
          <p className="tp-page-sub">{orders.length} commande{orders.length !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="tp-header-actions">
          <button className="tp-btn-secondary" onClick={loadOrders}><RefreshCcw size={15} /></button>
          <button className="tp-btn-secondary" onClick={() => navigate('/transporter/map')}><Map size={15} /> Voir sur la carte</button>
        </div>
      </div>

      <div className="tp-status-pills">
        <button className={`tp-status-pill ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
          <Package size={13} /> Toutes <span className="tp-status-count">{orders.length}</span>
        </button>
        {ALL_STATUSES.map(s => {
          const { label, Icon } = STATUS_CONFIG[s];
          return (
            <button key={s} className={`tp-status-pill ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}>
              {React.createElement(Icon, { size: 13, strokeWidth: 2 })}
              {label}
              {counts[s] > 0 && <span className="tp-status-count">{counts[s]}</span>}
            </button>
          );
        })}
      </div>

      <div className="tp-filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--mist)', pointerEvents: 'none' }} />
          <input className="tp-search" style={{ paddingLeft: 40 }} placeholder="Rechercher par client, ville ou #commande…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="tp-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Tous les statuts</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </select>
      </div>

      <div className="tp-orders-list">
        {loading ? (
          <div className="tp-empty">Chargement des commandes…</div>
        ) : filtered.length === 0 ? (
          <div className="tp-empty"><strong>Aucune commande trouvée</strong><span>Modifiez vos filtres ou attendez une assignation.</span></div>
        ) : (
          grouped.map(group => (
            <div key={group.key} style={{ marginBottom: 20 }}>

              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 14px', marginBottom: 6, background: '#F7F8FA', borderRadius: 8, fontSize: 12, border: '0.5px solid #E8EAED' }}>
                <span style={{ fontWeight: 600 }}>📍 {group.departure_city || '—'} → 🏁 {group.destination_city || '—'}</span>
                <span style={{ color: '#aaa' }}>·</span>
                <span style={{ color: '#888' }}>
                  📅 {group.desired_date ? new Date(group.desired_date).toLocaleDateString('fr-MA', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                </span>
                <span style={{ color: '#aaa' }}>·</span>
                <span style={{ color: '#378ADD', fontWeight: 600 }}>{group.orders.length} commande{group.orders.length > 1 ? 's' : ''}</span>
                <span style={{ color: '#aaa' }}>·</span>
                <span style={{ color: '#1D9E75', fontWeight: 600 }}>{group.total_kg} kg total</span>
              </div>

              {/* Orders in group */}
              {group.orders.map(order => {
                const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const isExpanded = expandedId === order.id;
                const isActioning = actionLoading === order.id;

                return (
                  <div key={order.id} className={`tp-order-card${isExpanded ? ' expanded' : ''}`} style={{ marginLeft: 12, marginBottom: 4, borderLeft: '3px solid #E8EAED' }}>
                    <div className="tp-order-card-header" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                      <div className="tp-order-id">
                        <span className="tp-code">#{order.id}</span>
                        <span className={`tp-badge ${st.cls}`}>
                          {React.createElement(st.Icon, { size: 11, strokeWidth: 2.5 })}
                          {st.label}
                        </span>
                      </div>
                      <div className="tp-order-client">
                        <strong>{order.client_name || '—'}</strong>
                        <small>{order.merchandise_type || ''}{order.quantity_kg ? ` · ${order.quantity_kg} kg` : ''}</small>
                      </div>
                      <div className="tp-order-addresses">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={12} color="var(--g-400)" />{order.departure_city || '—'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Flag size={12} color="var(--stone)" />{order.destination_city || '—'}</span>
                      </div>
                      <div className="tp-order-meta">
                        <span className="tp-td-muted">{fmtDate(order.created_at)}</span>
                        {order.priority && order.priority !== 'standard' && (
                          <span className={`tp-badge ${order.priority === 'urgent' ? 'badge-red' : 'badge-orange'}`}>{order.priority}</span>
                        )}
                      </div>
                      <div className="tp-order-expand">
                        {isExpanded ? React.createElement(ChevronUp, { size: 16 }) : React.createElement(ChevronDown, { size: 16 })}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="tp-order-card-body">
                        <div className="tp-order-details-grid">
                          <div className="tp-od-item"><span>Véhicule</span><strong>{order.vehicle_plate ? <span className="tp-code">{order.vehicle_plate}</span> : '—'}</strong></div>
                          <div className="tp-od-item"><span>Chauffeur</span><strong>{order.driver_name || '—'}</strong></div>
                          <div className="tp-od-item"><span>Créée le</span><strong>{fmtDate(order.created_at)}</strong></div>
                          {order.assigned_at && <div className="tp-od-item"><span>Assignée le</span><strong>{fmtDate(order.assigned_at)}</strong></div>}
                          {order.desired_date && (
                            <div className="tp-od-item">
                              <span>📅 Date limite de livraison</span>
                              <DeadlineBadge desired_date={order.desired_date} />
                            </div>
                          )}
                          {order.started_at && <div className="tp-od-item"><span>Démarrée le</span><strong>{fmtDate(order.started_at)}</strong></div>}
                          {order.delivered_at && <div className="tp-od-item"><span>Livrée le</span><strong>{fmtDate(order.delivered_at)}</strong></div>}
                          {order.notes && <div className="tp-od-item" style={{ gridColumn: '1/-1' }}><span>Notes</span><strong>{order.notes}</strong></div>}
                        </div>

                        <div className="tp-order-actions">
                          {order.status === 'assigned' && (
                            <button className="tp-btn-primary" disabled={isActioning} onClick={() => startDelivery(order)}>
                              {React.createElement(Play, { size: 14 })}
                              {isActioning ? 'Démarrage…' : 'Démarrer la livraison'}
                            </button>
                          )}
                          {order.status === 'in_transit' && (
                            <button className="tp-btn-success" disabled={isActioning} onClick={() => markDelivered(order)}>
                              {React.createElement(CheckCircle, { size: 14 })}
                              {isActioning ? 'Confirmation…' : 'Marquer comme livré'}
                            </button>
                          )}
                          {(order.status === 'in_transit' || order.status === 'assigned') && (
                            <button className="tp-btn-secondary" onClick={() => navigate(`/transporter/map?order=${order.id}`)}>
                              {React.createElement(Navigation, { size: 14 })} Voir sur la carte
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}