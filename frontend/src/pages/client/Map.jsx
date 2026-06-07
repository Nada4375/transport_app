import React, { useEffect, useState, useRef } from 'react';
import { trackingAPI, ordersAPI } from '../../services/api';
import LiveMap from '../../components/map/LiveMap';

export default function ClientMap() {
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const [posRes, ordersRes] = await Promise.all([
        trackingAPI.livePositions(),
        ordersAPI.list({ status: 'in_transit' }),
      ]);
      setPositions(posRes.data || []);
      setOrders(ordersRes.data.results || ordersRes.data || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Map fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const assignedOrders = orders.filter(o => o.status === 'in_transit');

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Suivi en temps réel 🗺️</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 12, color: '#888' }}>
            {lastUpdate ? `Mis à jour ${lastUpdate.toLocaleTimeString()}` : 'Connexion...'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="loading-text">Chargement de la carte...</div>
      ) : positions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚚</div>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>Aucune livraison en cours</div>
          <div style={{ fontSize: 13, color: '#888' }}>
            La carte s'animera dès que votre commande sera en transit
          </div>
        </div>
      ) : (
        <>
          <LiveMap positions={positions} height="440px" />

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {positions.map((pos) => (
              <div key={pos.vehicle_id || pos.order_id} className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {pos.order_number} — {pos.departure_city} → {pos.destination_city}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>
                      🚚 {pos.plate} &nbsp;·&nbsp;
                      👤 {pos.driver_name || '—'} &nbsp;·&nbsp;
                      🏢 {pos.transporter_name || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {pos.eta_minutes != null && (
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#378ADD' }}>
                        {pos.eta_minutes < 60
                          ? `${pos.eta_minutes} min`
                          : `${Math.floor(pos.eta_minutes / 60)}h ${pos.eta_minutes % 60}min`}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#aaa' }}>Temps restant estimé</div>
                  </div>
                </div>

                {/* Progress bar based on remaining distance */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 4 }}>
                    <span>📍 {pos.departure_city}</span>
                    <span style={{ color: '#378ADD' }}>🚚 En transit</span>
                    <span>🏁 {pos.destination_city}</span>
                  </div>
                  <div style={{ height: 5, background: '#E8EAED', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3, background: '#378ADD',
                      width: pos.eta_minutes != null ? `${Math.max(10, Math.min(90, 100 - (pos.eta_minutes / 120 * 100)))}%` : '50%',
                      transition: 'width 1s ease',
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
