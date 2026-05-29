import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function ClientDashboard() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, in_transit: 0, delivered: 0 });

  useEffect(() => {
    ordersAPI.list().then(res => {
      const data = res.data.results || res.data;
      setOrders(data.slice(0, 5));
      setStats({
        total: data.length,
        pending: data.filter(o => o.status === 'pending').length,
        in_transit: data.filter(o => o.status === 'in_transit').length,
        delivered: data.filter(o => o.status === 'delivered').length,
      });
    }).catch(() => {});
  }, []);

  const STATUS_COLOR = { pending: '#EF9F27', in_transit: '#378ADD', delivered: '#1D9E75', assigned: '#378ADD', validated: '#378ADD', cancelled: '#E05050' };

  return (
    <div className="page-container">
      <h1 className="page-title">Welcome, {user?.first_name || user?.username} 👋</h1>

      <div className="stats-grid">
        {[
          { label: 'Total orders', value: stats.total, color: '#333' },
          { label: 'Pending', value: stats.pending, color: '#EF9F27' },
          { label: 'In transit', value: stats.in_transit, color: '#378ADD' },
          { label: 'Delivered', value: stats.delivered, color: '#1D9E75' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="section-header">
        <h2 className="section-title">Recent orders</h2>
        <Link to="/client/orders/new" className="btn-primary btn-sm">+ New order</Link>
      </div>

      <div className="order-list">
        {orders.length === 0 && <div className="empty-text">No orders yet. <Link to="/client/orders/new">Create your first one →</Link></div>}
        {orders.map(o => (
          <div key={o.id} className="order-card">
            <div className="order-card-left">
              <div className="order-number">{o.order_number}</div>
              <div className="order-route">{o.departure_city} → {o.destination_city}</div>
              <div className="order-meta">{o.merchandise_type} · {o.quantity_kg} kg</div>
            </div>
            <span className="badge" style={{ background: STATUS_COLOR[o.status] + '22', color: STATUS_COLOR[o.status] }}>{o.status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
