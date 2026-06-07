import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Truck,
  User,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Flag,
  Package,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

import {
  ordersAPI,
  vehiclesAPI,
  driversAPI,
  transportersAPI,
} from '../../services/api';

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

const PRIORITY_BADGE = {
  standard: '',
  express: 'badge-orange',
  urgent: 'badge-red',
};

export default function AdminValidation() {
  const [pending, setPending] = useState([]);
  const [validated, setValidated] = useState([]);
  const [loading, setLoading] = useState(true);

  const [transporters, setTransporters] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [actionLoading, setActionLoading] = useState(null);
  const [expandedPending, setExpandedPending] = useState(null);
  const [expandedValidated, setExpandedValidated] = useState(null);
  const [assignForm, setAssignForm] = useState({});

  const load = async () => {
    setLoading(true);

    try {
      const [allRes, tRes, vRes, dRes] = await Promise.allSettled([
        ordersAPI.list(),
        transportersAPI.list(),
        vehiclesAPI.list(),
        driversAPI.list(),
      ]);

      if (allRes.status === 'fulfilled') {
        const data = allRes.value.data.results || allRes.value.data || [];
        const all = Array.isArray(data) ? data : [];

        setPending(all.filter((o) => o.status === 'pending'));
        setValidated(all.filter((o) => o.status === 'validated'));
      } else {
        console.error('ORDERS LOAD ERROR:', allRes.reason?.response?.data || allRes.reason?.message);
        toast.error('Impossible de charger les commandes.');
      }

      if (tRes.status === 'fulfilled') {
        const data = tRes.value.data.results || tRes.value.data || [];
        setTransporters(Array.isArray(data) ? data : []);
      }

      if (vRes.status === 'fulfilled') {
        const data = vRes.value.data.results || vRes.value.data || [];
        setVehicles(Array.isArray(data) ? data.filter((v) => v.status === 'available') : []);
      }

      if (dRes.status === 'fulfilled') {
        const data = dRes.value.data.results || dRes.value.data || [];
        setDrivers(Array.isArray(data) ? data.filter((d) => d.status === 'available') : []);
      }
    } catch (err) {
      console.error('ADMIN VALIDATION LOAD ERROR:', err.response?.data || err.message);
      toast.error('Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const vehiclesForTransporter = (transporterId) => {
    if (!transporterId) return vehicles;
    return vehicles.filter((v) => Number(v.transporter) === Number(transporterId));
  };

  const driversForTransporter = (transporterId) => {
    if (!transporterId) return drivers;
    return drivers.filter((d) => Number(d.transporter) === Number(transporterId));
  };

 const validateOrder = async (order) => {
  setActionLoading(`validate-${order.id}`);
  try {
    const res = await ordersAPI.validate(order.id);
    const data = res.data;
    
    // If auto-assigned successfully, remove from both lists
    if (data.status === 'assigned') {
      setPending((prev) => prev.filter((o) => o.id !== order.id));
      toast.success(data.message || 'Commande validée et assignée automatiquement ✅');
    } else {
      // Validated but not assigned — move to "À assigner"
      setPending((prev) => prev.filter((o) => o.id !== order.id));
      setValidated((prev) => [
        { ...order, status: 'validated', validated_at: new Date().toISOString() },
        ...prev,
      ]);
      toast.success('Commande validée. Assignation automatique échouée — assignez manuellement.');
    }
  } catch (err) {
    toast.error(err.response?.data?.error || 'Impossible de valider.');
  } finally {
    setActionLoading(null);
  }
};
  const assignManual = async (order) => {
    const form = assignForm[order.id] || {};

    if (!form.transporter_id || !form.vehicle_id) {
      toast.error('Sélectionnez un transporteur et un véhicule.');
      return;
    }

    setActionLoading(`assign-${order.id}`);

    try {
      const res = await ordersAPI.assign(order.id, {
        transporter_id: form.transporter_id,
        vehicle_id: form.vehicle_id,
        driver_id: form.driver_id || null,
      });

      setValidated((prev) => prev.filter((o) => o.id !== order.id));

      toast.success(
        `Commande assignée à ${res.data.order?.transporter_name || 'un transporteur'}.`
      );
    } catch (err) {
      toast.error(err.response?.data?.error || 'Impossible d’assigner.');
    } finally {
      setActionLoading(null);
    }
  };

const autoAssign = async (order) => {
  setActionLoading(`auto-${order.id}`);
  try {
    const res = await ordersAPI.retryAssign(order.id);
    setValidated((prev) => prev.filter((o) => o.id !== order.id));
    toast.success(res.data.message || 'Commande auto-assignée ✅');
  } catch (err) {
    toast.error(err.response?.data?.error || 'Aucun transporteur disponible.');
  } finally {
    setActionLoading(null);
  }
};

  const updateForm = (orderId, field, value) => {
    setAssignForm((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value,
        ...(field === 'transporter_id' ? { vehicle_id: '', driver_id: '' } : {}),
      },
    }));
  };

  if (loading) {
    return (
      <div className="tp-page">
        <div className="tp-empty">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title">Validation & Assignation</h1>
          <p className="tp-page-sub">
            {pending.length} en attente · {validated.length} à assigner
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
          {pending.map((order) => {
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

                    <div className="tp-order-actions">
                      <button
                        className="tp-btn-primary"
                        disabled={isActioning}
                        onClick={() => validateOrder(order)}
                      >
                        <ShieldCheck size={14} />
                        {isActioning ? 'Validation…' : 'Valider la commande'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="tp-section-header">
        <Truck size={18} />
        <h2>À assigner</h2>
        <span className="tp-badge badge-orange">{validated.length}</span>
      </div>

      {validated.length === 0 ? (
        <div className="tp-empty-small tp-card">
          <Package size={20} color="var(--g-400)" />
          Aucune commande validée en attente d'assignation.
        </div>
      ) : (
        <div className="tp-orders-list">
          {validated.map((order) => {
            const isExp = expandedValidated === order.id;
            const isAutoLoading = actionLoading === `auto-${order.id}`;
            const isManLoading = actionLoading === `assign-${order.id}`;
            const form = assignForm[order.id] || {};
            const filteredVehicles = vehiclesForTransporter(form.transporter_id);
            const filteredDrivers = driversForTransporter(form.transporter_id);

            return (
              <div key={order.id} className={`tp-order-card${isExp ? ' expanded' : ''}`}>
                <div
                  className="tp-order-card-header"
                  onClick={() => setExpandedValidated(isExp ? null : order.id)}
                >
                  <div className="tp-order-id">
                    <span className="tp-code">#{order.id}</span>
                    <span className="tp-badge badge-orange">
                      <ShieldCheck size={11} /> Validée
                    </span>
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
                        <strong>{order.departure_address || order.departure_city}</strong>
                      </div>

                      <div className="tp-od-item">
                        <span>Destination</span>
                        <strong>{order.destination_address || order.destination_city}</strong>
                      </div>

                      <div className="tp-od-item">
                        <span>Poids</span>
                        <strong>{order.quantity_kg} kg</strong>
                      </div>

                      <div className="tp-od-item">
                        <span>Validée le</span>
                        <strong>{fmtDate(order.validated_at)}</strong>
                      </div>
                    </div>

                    <div className="tp-assign-form">
                      <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Truck size={15} /> Assignation manuelle
                      </h4>

                      <div className="tp-form-row">
                        <div className="tp-form-group">
                          <label>Transporteur *</label>
                          <select
                            className="tp-select"
                            value={form.transporter_id || ''}
                            onChange={(e) => updateForm(order.id, 'transporter_id', e.target.value)}
                          >
                            <option value="">— Choisir —</option>
                            {transporters
                              .filter((t) => t.status === 'active' && t.is_available)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.company_name} — {t.city}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="tp-form-group">
                          <label>Véhicule *</label>
                          <select
                            className="tp-select"
                            value={form.vehicle_id || ''}
                            onChange={(e) => updateForm(order.id, 'vehicle_id', e.target.value)}
                            disabled={!form.transporter_id}
                          >
                            <option value="">— Choisir —</option>
                            {filteredVehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.plate_number} · {v.capacity_kg} kg
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="tp-form-group">
                          <label>Chauffeur</label>
                          <select
                            className="tp-select"
                            value={form.driver_id || ''}
                            onChange={(e) => updateForm(order.id, 'driver_id', e.target.value)}
                            disabled={!form.transporter_id}
                          >
                            <option value="">— Choisir —</option>
                            {filteredDrivers.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.first_name} {d.last_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="tp-order-actions">
                      <button
                        className="tp-btn-primary"
                        disabled={isManLoading || !form.transporter_id || !form.vehicle_id}
                        onClick={() => assignManual(order)}
                      >
                        <User size={14} />
                        {isManLoading ? 'Assignation…' : 'Assigner manuellement'}
                      </button>

                      <button
                        className="tp-btn-secondary"
                        disabled={isAutoLoading}
                        onClick={() => autoAssign(order)}
                      >
                        <Zap size={14} />
                        {isAutoLoading ? 'Recherche…' : 'Auto-assign intelligent'}
                      </button>
                    </div>

                    {filteredVehicles.length === 0 && form.transporter_id && (
                      <div className="tp-alert-warning" style={{ marginTop: 8 }}>
                        <AlertCircle size={14} />
                        Aucun véhicule disponible pour ce transporteur.
                      </div>
                    )}
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