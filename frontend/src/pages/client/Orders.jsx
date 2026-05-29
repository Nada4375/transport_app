import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ordersAPI } from '../../services/api';

const STATUS_BADGE = {
  pending: { label: 'En attente', cls: 'badge-warning' },
  validated: { label: 'Validée', cls: 'badge-info' },
  assigned: { label: 'Assignée', cls: 'badge-info' },
  in_transit: { label: 'En cours', cls: 'badge-info' },
  delivered: { label: 'Livrée', cls: 'badge-success' },
  cancelled: { label: 'Annulée', cls: 'badge-danger' },
};

export default function ClientOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchOrders = async () => {
    setLoading(true);

    try {
      const res = await ordersAPI.list(filter ? { status: filter } : {});
      setOrders(res.data.results || res.data);
    } catch (err) {
      console.error('LOAD ORDERS ERROR:', err.response?.data || err.message);

      toast.error(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Impossible de charger les commandes.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette commande ?')) return;

    try {
      await ordersAPI.delete(id);
      toast.success('Commande supprimée.');
      fetchOrders();
    } catch (err) {
      console.error('DELETE ORDER ERROR:', err.response?.data || err.message);

      toast.error(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Impossible de supprimer cette commande.'
      );
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '—';

    try {
      return new Date(dateValue).toLocaleString('fr-MA');
    } catch {
      return dateValue;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Mes commandes</h1>

        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="validated">Validée</option>
            <option value="assigned">Assignée</option>
            <option value="in_transit">En cours</option>
            <option value="delivered">Livrée</option>
            <option value="cancelled">Annulée</option>
          </select>

          <Link to="/client/orders/new" className="btn-primary">
            + Nouvelle commande
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="loading-text">Chargement des commandes...</div>
      ) : (
        <div className="order-list">
          {orders.length === 0 && (
            <div className="empty-text">Aucune commande trouvée.</div>
          )}

          {orders.map((order) => {
            const badge = STATUS_BADGE[order.status] || {
              label: order.status,
              cls: 'badge-info',
            };

            return (
              <div key={order.id} className="order-card">
                <div className="order-card-left">
                  <div className="order-number">
                    {order.order_number}
                  </div>

                  <div className="order-route">
                    {order.departure_city} → {order.destination_city}
                  </div>

                  <div className="order-meta">
                    {order.merchandise_type} · {order.quantity_kg} kg · Créée le :{' '}
                    {formatDate(order.created_at || order.desired_date)}
                  </div>

                  {order.transporter_name && (
                    <div className="order-meta">
                      Transporteur : {order.transporter_name}
                    </div>
                  )}

                  {order.vehicle_plate && (
                    <div className="order-meta">
                      Véhicule : {order.vehicle_plate}
                    </div>
                  )}

                  {order.driver_name && (
                    <div className="order-meta">
                      Chauffeur : {order.driver_name}
                    </div>
                  )}
                </div>

                <div className="order-card-right">
                  <span className={`badge ${badge.cls}`}>
                    {badge.label}
                  </span>

                  <div className="order-actions">
                    {order.status === 'pending' && (
                      <>
                        <Link
                          to={`/client/orders/new?edit=${order.id}`}
                          className="btn-sm"
                        >
                          Modifier
                        </Link>

                        <button
                          onClick={() => handleDelete(order.id)}
                          className="btn-sm btn-danger"
                        >
                          Supprimer
                        </button>
                      </>
                    )}

                    {(order.status === 'in_transit' || order.status === 'assigned') && (
                      <Link to="/client/map" className="btn-sm">
                        Suivre
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}