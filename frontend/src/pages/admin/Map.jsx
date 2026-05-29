import React, { useEffect, useState } from 'react';
import '../transporter/Transporter.css';
import { trackingAPI, ordersAPI } from '../../services/api';
import MapView from '../../components/map/MapView';
import '../transporter/Transporter.css';

export default function AdminMap() {
  const [positions, setPositions] = useState([]);
  const [geoOrders, setGeoOrders] = useState([]);

  const load = async () => {
    try {
      const posRes = await trackingAPI.livePositions();
      const posData = posRes.data || [];

      setPositions(
        Array.isArray(posData)
          ? posData.map((p) => ({
              lat: p.latitude,
              lng: p.longitude,
              plate: p.plate,
              speed: p.speed || 0,
            }))
          : []
      );
    } catch {
      setPositions([]);
    }

    try {
      const ordersRes = await ordersAPI.list();
      const data = ordersRes.data.results || ordersRes.data || [];

      setGeoOrders(
        Array.isArray(data)
          ? data.filter((o) => ['assigned', 'in_transit'].includes(o.status))
          : []
      );
    } catch {
      setGeoOrders([]);
    }
  };

  useEffect(() => {
    load();

    const interval = setInterval(load, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title">Map Overview</h1>
          <p className="tp-page-sub">Suivi global des livraisons actives</p>
        </div>
      </div>

      <div className="tp-stats-grid" style={{ marginBottom: 14 }}>
        <div className="tp-stat-card accent-blue">
          <div className="tp-stat-val">{positions.length}</div>
          <div className="tp-stat-label">Véhicules GPS</div>
        </div>

        <div className="tp-stat-card accent-orange">
          <div className="tp-stat-val">{geoOrders.length}</div>
          <div className="tp-stat-label">Livraisons actives</div>
        </div>
      </div>

      <div className="tp-card" style={{ padding: 0, overflow: 'hidden' }}>
        <MapView
          height="560px"
          center={[33.9716, -6.8498]}
          zoom={6}
          livePositions={positions}
        />
      </div>
    </div>
  );
}