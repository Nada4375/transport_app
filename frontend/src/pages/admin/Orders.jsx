import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCcw, Map, Filter } from 'lucide-react';
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
      (o.destination_city || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
            {orders.length} commande{orders.length !== 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="tp-header-actions">
          <button className="tp-btn-secondary" onClick={load} title="Actualiser">
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>

      {/* Status pills */}
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

      {/* Search */}
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

      {/* Table */}
      {loading ? (
        <div className="tp-empty">Chargement des commandes…</div>
      ) : filtered.length === 0 ? (
        <div className="tp-empty">
          <strong>Aucune commande trouvée</strong>
          <span>Modifiez vos filtres de recherche.</span>
        </div>
      ) : (
        <div className="tp-card" style={{ padding: 0 }}>
          <div className="tp-table-wrap">
            <table className="tp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client</th>
                  <th>Départ</th>
                  <th>Destination</th>
                  <th>Marchandise</th>
                  <th>Poids</th>
                  <th>Transporteur</th>
                  <th>Chauffeur</th>
                  <th>Véhicule</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}>
                    <td><span className="tp-code">#{o.id}</span></td>
                    <td><strong>{o.client_name || '—'}</strong></td>
                    <td className="tp-td-muted">{o.departure_city || '—'}</td>
                    <td className="tp-td-muted">{o.destination_city || '—'}</td>
                    <td className="tp-td-muted">{o.merchandise_type || '—'}</td>
                    <td className="tp-td-muted">{o.quantity_kg ? `${o.quantity_kg} kg` : '—'}</td>
                    <td>{o.transporter_name || <span className="tp-td-muted">—</span>}</td>
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
      )}
    </div>
  );
}