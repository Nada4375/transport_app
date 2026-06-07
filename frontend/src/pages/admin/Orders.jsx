import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCcw, Map, CalendarDays, MapPin, Flag } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import '../transporter/Transporter.css';

const STATUS_CONFIG = {
  pending:    { label: 'En attente',   cls: 'badge-gray'   },
  validated:  { label: 'Validée',      cls: 'badge-orange' },
  assigned:   { label: 'Assignée',     cls: 'badge-orange' },
  in_transit: { label: 'En transit',   cls: 'badge-blue'   },
  delivered:  { label: 'Livrée',       cls: 'badge-green'  },
  cancelled:  { label: 'Annulée',      cls: 'badge-red'    },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status || '—', cls: 'badge-gray' };
  return <span className={`tp-badge ${cfg.cls}`}>{cfg.label}</span>;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-MA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDay(iso) {
  if (!iso) return 'Date non définie';
  return new Date(iso).toLocaleDateString('fr-MA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function normalize(value) {
  return String(value || '—').trim().toLowerCase();
}

function groupOrders(list) {
  const map = new window.Map();

  list.forEach((o) => {
    // On regroupe par même date + même ville départ + même destination.
    // desired_date est prioritaire si elle existe, sinon created_at.
    const dateValue = o.desired_date || o.pickup_date || o.created_at;
    const dayKey = dateValue ? new window.Date(dateValue).toISOString().slice(0, 10) : 'no-date';
    const dep = normalize(o.departure_city || o.departure_address);
    const dest = normalize(o.destination_city || o.destination_address);
    const key = `${dayKey}__${dep}__${dest}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        dateValue,
        departure: o.departure_city || o.departure_address || '—',
        destination: o.destination_city || o.destination_address || '—',
        orders: [],
      });
    }

    map.get(key).orders.push(o);
  });

  return Array.from(map.values()).sort((a, b) => {
    const da = a.dateValue ? new window.Date(a.dateValue).getTime() : 0;
    const db = b.dateValue ? new window.Date(b.dateValue).getTime() : 0;
    return db - da;
  });
}

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.list();
      const data = res.data.results || res.data || [];
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('ADMIN ORDERS ERROR:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      String(o.id).includes(q) ||
      (o.client_name || '').toLowerCase().includes(q) ||
      (o.transporter_name || '').toLowerCase().includes(q) ||
      (o.driver_name || '').toLowerCase().includes(q) ||
      (o.departure_city || '').toLowerCase().includes(q) ||
      (o.destination_city || '').toLowerCase().includes(q) ||
      (o.departure_address || '').toLowerCase().includes(q) ||
      (o.destination_address || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const grouped = groupOrders(filtered);

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title">Toutes les commandes</h1>
          <p className="tp-page-sub">
            {orders.length} commande{orders.length !== 1 ? 's' : ''} au total · regroupement par date, départ et destination
          </p>
        </div>
        <div className="tp-header-actions">
          <button className="tp-btn-secondary" onClick={load} title="Actualiser">
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>

      <div className="tp-status-pills">
        <button
          className={`tp-status-pill ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          Toutes
          <span className="tp-status-count">{orders.length}</span>
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            className={`tp-status-pill ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
          >
            {STATUS_CONFIG[s].label}
            {counts[s] > 0 && <span className="tp-status-count">{counts[s]}</span>}
          </button>
        ))}
      </div>

      <div className="tp-filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--g-400)', pointerEvents: 'none' }} />
          <input
            className="tp-search"
            style={{ paddingLeft: 40 }}
            placeholder="Rechercher par client, ville, transporteur, #id..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="tp-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">Tous les statuts</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="tp-empty">Chargement des commandes…</div>
      ) : grouped.length === 0 ? (
        <div className="tp-empty">
          <strong>Aucune commande trouvée</strong>
          <span>Modifiez vos filtres de recherche.</span>
        </div>
      ) : (
        <div className="tp-grouped-orders">
          {grouped.map((group) => (
            <div key={group.key} className="tp-order-group">
              <div className="tp-order-group-header">
                <div>
                  <h2>
                    <CalendarDays size={17} />
                    {fmtDay(group.dateValue)}
                  </h2>
                  <p>
                    <MapPin size={14} /> {group.departure}
                    <span>→</span>
                    <Flag size={14} /> {group.destination}
                  </p>
                </div>

                <span className="tp-badge badge-blue">
                  {group.orders.length} commande{group.orders.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="tp-table-wrap">
                <table className="tp-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Client</th>
                      <th>Marchandise</th>
                      <th>Poids</th>
                      <th>Transporteur</th>
                      <th>Chauffeur</th>
                      <th>Véhicule</th>
                      <th>Date création</th>
                      <th>Statut</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.orders.map(o => (
                      <tr key={o.id}>
                        <td><span className="tp-code">#{o.id}</span></td>
                        <td><strong>{o.client_name || '—'}</strong></td>
                        <td className="tp-td-muted">{o.merchandise_type || '—'}</td>
                        <td className="tp-td-muted">{o.quantity_kg ? `${o.quantity_kg} kg` : '—'}</td>
                        <td>{o.transporter_name || <span className="tp-td-muted">Non assigné</span>}</td>
                        <td>{o.driver_name || <span className="tp-td-muted">—</span>}</td>
                        <td>{o.vehicle_plate ? <span className="tp-code">{o.vehicle_plate}</span> : <span className="tp-td-muted">—</span>}</td>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
