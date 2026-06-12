import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheck, ChevronDown, ChevronUp,
  Clock, MapPin, Flag, RefreshCcw, CheckCircle,
} from 'lucide-react';
import { ordersAPI } from '../../services/api';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-MA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const PRIORITY_BADGE = {
  standard: '',
  express: 'badge-orange',
  urgent: 'badge-red',
};

export default function AdminValidation() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedPending, setExpandedPending] = useState(null);
  const [resultMsg, setResultMsg] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.list();
      const data = res.data.results || res.data || [];
      const all = Array.isArray(data) ? data : [];
      setPending(all.filter(o => o.status === 'pending'));
    } catch (err) {
      console.error('VALIDATION LOAD ERROR:', err.response?.data || err.message);
      toast.error('Impossible de charger les commandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const validateOrder = async (order) => {
    setActionLoading(`validate-${order.id}`);
    setResultMsg(r => ({ ...r, [order.id]: null }));
    try {
      const res = await ordersAPI.validate(order.id);
      const data = res.data;
      if (data.status === 'assigned') {
        setPending(prev => prev.filter(o => o.id !== order.id));
        toast.success(data.message || '✅ Commande validée et assignée automatiquement');
      } else {
        setPending(prev => prev.filter(o => o.id !== order.id));
        setResultMsg(r => ({ ...r, [order.id]: { text: data.message, success: false } }));
        toast.error('Validée mais assignation automatique échouée.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Impossible de valider.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="tp-page"><div className="tp-empty">Chargement…</div></div>;
  }

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title">Validation des commandes</h1>
          <p className="tp-page-sub">
            {pending.length} commande{pending.length !== 1 ? 's' : ''} en attente de validation
          </p>
        </div>
        <button className="tp-btn-secondary" onClick={load} title="Actualiser">
          <RefreshCcw size={15} />
        </button>
      </div>

     

      <div className="tp-section-header">
        <Clock size={18} />
        <h2>À valider</h2>
        <span className="tp-badge badge-gray">{pending.length}</span>
      </div>

      {pending.length === 0 ? (
        <div className="tp-empty-small tp-card" style={{ marginBottom: 24 }}>
          <CheckCircle size={20} color="var(--g-400)" />
           Aucune commande en attente de validation.
        </div>
      ) : (
        <div className="tp-orders-list" style={{ marginBottom: 32 }}>
          {pending.map(order => {
            const isExp = expandedPending === order.id;
            const isActioning = actionLoading === `validate-${order.id}`;

            return (
              <div key={order.id} className={`tp-order-card${isExp ? ' expanded' : ''}`}>
                <div
                  className="tp-order-card-header"
                  onClick={() => setExpandedPending(isExp ? null : order.id)}
                >
                  <div className="tp-order-id">
                    <span className="tp-code">#{order.id}</span>
                    <span className="tp-badge badge-gray">
                      <Clock size={11} /> En attente
                    </span>
                    {order.priority && order.priority !== 'standard' && (
                      <span className={`tp-badge ${PRIORITY_BADGE[order.priority]}`}>
                        {order.priority}
                      </span>
                    )}
                  </div>

                  <div className="tp-order-client">
                    <strong>{order.client_name || '—'}</strong>
                    <small>{order.merchandise_type} · {order.quantity_kg} kg</small>
                  </div>

                  <div className="tp-order-addresses">
                    <span><MapPin size={12} /> {order.departure_city || '—'}</span>
                    <span><Flag size={12} /> {order.destination_city || '—'}</span>
                  </div>

                  <div className="tp-order-meta">
                    <span className="tp-td-muted">{fmtDate(order.created_at)}</span>
                  </div>

                  <div className="tp-order-expand">
                    {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {isExp && (
                  <div className="tp-order-card-body">
                    <div className="tp-order-details-grid">
                      <div className="tp-od-item">
                        <span>Départ</span>
                        <strong>{order.departure_address || order.departure_city || '—'}</strong>
                      </div>
                      <div className="tp-od-item">
                        <span>Destination</span>
                        <strong>{order.destination_address || order.destination_city || '—'}</strong>
                      </div>
                      <div className="tp-od-item">
                        <span>Date souhaitée</span>
                        <strong>{order.desired_date || '—'}</strong>
                      </div>
                      <div className="tp-od-item">
                        <span>Poids</span>
                        <strong>{order.quantity_kg} kg</strong>
                      </div>
                      {order.notes && (
                        <div className="tp-od-item" style={{ gridColumn: '1/-1' }}>
                          <span>Notes</span>
                          <strong>{order.notes}</strong>
                        </div>
                      )}
                    </div>

                    {resultMsg[order.id] && (
                      <div style={{
                        background: '#FEF3C7', border: '1px solid #FCD34D',
                        borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12,
                      }}>
                        ⚠️ {resultMsg[order.id].text}
                      </div>
                    )}

                    <div className="tp-order-actions">
                      <button
                        className="tp-btn-primary"
                        disabled={isActioning}
                        onClick={() => validateOrder(order)}
                      >
                        <ShieldCheck size={14} />
                        {isActioning ? '⏳ Validation & recherche du transporteur…' : 'Valider & Auto-assigner'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}