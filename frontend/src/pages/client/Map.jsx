import React, { useEffect, useState } from 'react';
import { ordersAPI } from '../../services/api';
import { useTracking } from '../../hooks/useTracking';
import MapView from '../../components/map/MapView';

export default function ClientMap() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const { position, connected } = useTracking(selected?.id);

  useEffect(() => {
    ordersAPI.list({ status: 'in_transit' }).then(res => {
      const data = res.data.results || res.data;
      setOrders(data);
      if (data.length > 0) setSelected(data[0]);
    }).catch(() => {});
  }, []);

  return (
    <div className="page-container">
      <h1 className="page-title">Live tracking 🗺️</h1>
      {orders.length === 0 ? (
        <div className="empty-text">No active deliveries in transit right now.</div>
      ) : (
        <>
          <div className="filter-row" style={{ marginBottom: 12 }}>
            {orders.map(o => (
              <button key={o.id} className={`btn-sm ${selected?.id === o.id ? 'btn-primary' : ''}`} onClick={() => setSelected(o)}>
                {o.order_number}
              </button>
            ))}
          </div>
          {selected && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 500 }}>{selected.order_number} — {selected.departure_city} → {selected.destination_city}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                Driver: {selected.driver_name || 'N/A'} · Truck: {selected.vehicle_plate || 'N/A'} ·
                <span style={{ color: connected ? '#1D9E75' : '#E05050', marginLeft: 6 }}>
                  {connected ? '● Live' : '○ Offline'}
                </span>
              </div>
            </div>
          )}
          <MapView
            height="420px"
            center={[33.9716, -6.8498]}
            zoom={7}
            truckPosition={position}
            departure={selected ? { lat: 33.5731, lng: -7.5898, label: selected.departure_city } : null}
            destination={selected ? { lat: 34.0209, lng: -6.8416, label: selected.destination_city } : null}
          />
        </>
      )}
    </div>
  );
}
