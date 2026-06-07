import React, { useEffect, useState, useRef } from 'react';
import { trackingAPI, ordersAPI } from '../../services/api';
import LiveMap from '../../components/map/LiveMap';

export default function AdminMap() {
  const [positions, setPositions] = useState([]);
  const [stats, setStats] = useState({ in_transit: 0, assigned: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [filter, setFilter] = useState('all');
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const [posRes, statsRes] = await Promise.all([
        trackingAPI.livePositions(),
        ordersAPI.stats(),
      ]);
      setPositions(posRes.data || []);

      const byStatus = statsRes.data.by_status || [];
      setStats({
        in_transit: byStatus.find(s => s.status === 'in_transit')?.count || 0,
        assigned: byStatus.find(s => s.status === 'assigned')?.count || 0,
        pending: byStatus.find(s => s.status === 'pending')?.count || 0,
      });
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Admin map error:', err);
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
        <h1 className="page-title" style={{ margin: 0 }}>Vue globale — Toutes les livraisons 🗺️</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 12, color: '#888' }}>
            {positions.length} camion(s) actif(s) · {lastUpdate ? lastUpdate.toLocaleTimeString() : '...'}
          </span>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 12 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#378ADD' }}>{positions.length}</div>
          <div className="stat-label">En transit</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#EF9F27' }}>{stats.assigned}</div>
          <div className="stat-label">Assignées</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#E05050' }}>{stats.pending}</div>
          <div className="stat-label">En attente</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {positions.filter(p => p.eta_minutes != null && p.eta_minutes < 30).length}
          </div>
          <div className="stat-label">Arrivent bientôt</div>
        </div>
      </div>

      {loading ? (
        <div className="loading-text">Chargement de la carte...</div>
      ) : positions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>Aucune livraison active</div>
          <div style={{ fontSize: 13, color: '#888' }}>
            Les camions apparaissent ici une fois que les transporteurs démarrent les livraisons
          </div>
        </div>
      ) : (
        <>
          <LiveMap positions={positions} height="480px" zoom={6} />

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              Détails des livraisons actives
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {positions.map((pos) => (
                <div key={pos.vehicle_id} className="card" style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>
                        🚚 {pos.plate} &nbsp;·&nbsp;
                        <span style={{ color: '#378ADD' }}>{pos.order_number}</span> &nbsp;·&nbsp;
                        🏢 {pos.transporter_name}
                      </div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                        📍 {pos.departure_city} → 🏁 {pos.destination_city} &nbsp;·&nbsp;
                        👤 {pos.driver_name || '—'} &nbsp;·&nbsp;
                        👥 {pos.client_name || '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      {pos.eta_minutes != null ? (
                        <div style={{
                          fontWeight: 700, fontSize: 14,
                          color: pos.eta_minutes < 30 ? '#1D9E75' : '#378ADD'
                        }}>
                          {pos.eta_minutes < 60
                            ? `${pos.eta_minutes} min`
                            : `${Math.floor(pos.eta_minutes / 60)}h${pos.eta_minutes % 60}min`}
                        </div>
                      ) : (
                        <span className="badge badge-info" style={{ fontSize: 10 }}>En transit</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
