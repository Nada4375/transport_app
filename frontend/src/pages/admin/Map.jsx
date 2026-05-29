import React, { useEffect, useState } from 'react';
import { trackingAPI, ordersAPI } from '../../services/api';
import MapView from '../../components/map/MapView';

export default function AdminMap() {
  const [positions, setPositions] = useState([]);
  const [geoOrders, setGeoOrders] = useState([]);

  useEffect(() => {
    trackingAPI.livePositions().then(r => setPositions(r.data.map(p => ({ lat: p.latitude, lng: p.longitude, plate: p.plate, speed: p.speed || 0 })))).catch(() => {});
    ordersAPI.list({ status: 'in_transit' }).then(r => setGeoOrders(r.data.results || r.data)).catch(() => {});
    const interval = setInterval(() => {
      trackingAPI.livePositions().then(r => setPositions(r.data.map(p => ({ lat: p.latitude, lng: p.longitude, plate: p.plate, speed: p.speed || 0 })))).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      <h1 className="page-title">Map overview 🗺️</h1>
      <div className="stats-grid" style={{ marginBottom: 12 }}>
        <div className="stat-card"><div className="stat-value" style={{ color: '#378ADD' }}>{positions.length}</div><div className="stat-label">Trucks en route</div></div>
        <div className="stat-card"><div className="stat-value">{geoOrders.length}</div><div className="stat-label">Active deliveries</div></div>
      </div>
      <MapView height="500px" center={[33.9716, -6.8498]} zoom={6} livePositions={positions} />
    </div>
  );
}
