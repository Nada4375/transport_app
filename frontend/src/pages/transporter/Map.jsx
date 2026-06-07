import React, { useEffect, useState, useRef } from 'react';
import { trackingAPI } from '../../services/api';
import LiveMap from '../../components/map/LiveMap';

export default function TransporterMap() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await trackingAPI.livePositions();
      setPositions(res.data || []);
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

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Positions des véhicules 🗺️</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 12, color: '#888' }}>
            {positions.length} véhicule(s) actif(s) · {lastUpdate ? lastUpdate.toLocaleTimeString() : '...'}
          </span>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 12 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#378ADD' }}>{positions.length}</div>
          <div className="stat-label">En transit</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {positions.filter(p => p.eta_minutes != null && p.eta_minutes < 30).length}
          </div>
          <div className="stat-label">Arrivent bientôt</div>
        </div>
      </div>

      {loading ? (
        <div className="loading-text">Chargement...</div>
      ) : positions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚛</div>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>Aucun véhicule en mission</div>
          <div style={{ fontSize: 13, color: '#888' }}>Les véhicules apparaissent ici une fois en transit</div>
        </div>
      ) : (
        <>
          <LiveMap positions={positions} height="440px" />

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {positions.map((pos) => (
              <div key={pos.vehicle_id} className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      🚚 {pos.plate} &nbsp;·&nbsp;
                      <span style={{ color: '#378ADD' }}>{pos.order_number || '—'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>
                      📍 {pos.departure_city || '—'} → 🏁 {pos.destination_city || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      👤 {pos.driver_name || '—'} &nbsp;·&nbsp;
                      👥 Client: {pos.client_name || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {pos.eta_minutes != null ? (
                      <>
                        <div style={{ fontWeight: 700, fontSize: 16, color: pos.eta_minutes < 30 ? '#1D9E75' : '#378ADD' }}>
                          {pos.eta_minutes < 60
                            ? `${pos.eta_minutes} min`
                            : `${Math.floor(pos.eta_minutes / 60)}h ${pos.eta_minutes % 60}min`}
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>ETA destination</div>
                      </>
                    ) : (
                      <span className="badge badge-info">En transit</span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, background: '#E8EAED', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2, background: '#378ADD',
                      width: pos.eta_minutes != null ? `${Math.max(5, Math.min(95, 100 - (pos.eta_minutes / 120 * 100)))}%` : '50%',
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
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
