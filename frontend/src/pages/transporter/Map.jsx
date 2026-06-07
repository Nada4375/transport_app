import React, { useEffect, useState, useRef } from 'react';
import {
  Truck,
  MapPin,
  Flag,
  User,
  Users,
  Radio,
  Navigation,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react';

import { trackingAPI } from '../../services/api';
import LiveMap from '../../components/map/LiveMap';

export default function TransporterMap() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [gpsError, setGpsError] = useState('');

  const intervalRef = useRef(null);
  const watchRef = useRef(null);

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

    return () => {
      clearInterval(intervalRef.current);

      if (watchRef.current) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  const startLiveTracking = (orderId) => {
    setGpsError('');

    if (!orderId) {
      setGpsError('Commande introuvable.');
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('La géolocalisation n’est pas supportée par ce navigateur.');
      return;
    }

    if (watchRef.current) {
      navigator.geolocation.clearWatch(watchRef.current);
    }

    setTrackingOrderId(orderId);

    watchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const speedKmh = position.coords.speed
          ? Math.round(position.coords.speed * 3.6)
          : 0;

        try {
          await trackingAPI.updatePosition({
            order_id: orderId,
            latitude,
            longitude,
            speed_kmh: speedKmh,
          });

          fetchData();
        } catch (err) {
          console.error('GPS update error:', err.response?.data || err.message);
          setGpsError(err.response?.data?.error || 'Erreur lors de l’envoi GPS.');
        }
      },
      (error) => {
        console.error('GPS error:', error);

        if (error.code === 1) {
          setGpsError('Autorise la localisation dans le navigateur.');
        } else if (error.code === 2) {
          setGpsError('Position GPS indisponible.');
        } else {
          setGpsError('Erreur GPS.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  };

  const stopLiveTracking = () => {
    if (watchRef.current) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }

    setTrackingOrderId(null);
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Positions des véhicules</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 12, color: '#888' }}>
            {positions.length} véhicule(s) actif(s) · {lastUpdate ? lastUpdate.toLocaleTimeString() : '...'}
          </span>
        </div>
      </div>

      {gpsError && (
        <div className="card" style={{ padding: 12, marginBottom: 12, color: '#991b1b', background: '#fee2e2', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} />
          {gpsError}
        </div>
      )}

      {trackingOrderId && (
        <div className="card" style={{ padding: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={17} color="#16a34a" />
            Suivi GPS actif pour la commande #{trackingOrderId}
          </strong>

          <button
            onClick={stopLiveTracking}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              background: '#dc2626',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <XCircle size={15} />
            Arrêter
          </button>
        </div>
      )}

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
          <div style={{ marginBottom: 12 }}>
            <Truck size={42} color="#378ADD" strokeWidth={1.7} />
          </div>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>Aucun véhicule en mission</div>
          <div style={{ fontSize: 13, color: '#888' }}>Les véhicules apparaissent ici une fois en transit</div>
        </div>
      ) : (
        <>
          <LiveMap positions={positions} height="440px" />

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {positions.map((pos) => (
              <div key={pos.vehicle_id} className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Truck size={16} color="#378ADD" strokeWidth={1.8} />
                      <span>{pos.plate}</span>
                      <span style={{ color: '#aaa' }}>·</span>
                      <span style={{ color: '#378ADD' }}>{pos.order_number || '—'}</span>
                    </div>

                    <div style={{ fontSize: 12, color: '#888', marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={13} color="#378ADD" strokeWidth={1.8} />
                      <span>{pos.departure_city || '—'}</span>
                      <span>→</span>
                      <Flag size={13} color="#1D9E75" strokeWidth={1.8} />
                      <span>{pos.destination_city || '—'}</span>
                    </div>

                    <div style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <User size={13} color="#666" strokeWidth={1.8} />
                        {pos.driver_name || '—'}
                      </span>

                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Users size={13} color="#666" strokeWidth={1.8} />
                        Client: {pos.client_name || '—'}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {pos.eta_minutes != null ? (
                      <>
                        <div style={{ fontWeight: 700, fontSize: 16, color: pos.eta_minutes < 30 ? '#1D9E75' : '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                          <Clock size={15} strokeWidth={1.8} />
                          {pos.eta_minutes < 60
                            ? `${pos.eta_minutes} min`
                            : `${Math.floor(pos.eta_minutes / 60)}h ${pos.eta_minutes % 60}min`}
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>ETA destination</div>
                      </>
                    ) : (
                      <span className="badge badge-info">En transit</span>
                    )}

                    <button
                      onClick={() => startLiveTracking(pos.order_id)}
                      disabled={trackingOrderId === pos.order_id}
                      style={{
                        marginTop: 8,
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        background: trackingOrderId === pos.order_id ? '#16a34a' : '#2563eb',
                        color: 'white',
                        cursor: trackingOrderId === pos.order_id ? 'default' : 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {trackingOrderId === pos.order_id ? (
                        <>
                          <Radio size={14} />
                          Suivi actif
                        </>
                      ) : (
                        <>
                          <Navigation size={14} />
                          Suivre en temps réel
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, background: '#E8EAED', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 2,
                      background: '#378ADD',
                      width: pos.eta_minutes != null
                        ? `${Math.max(5, Math.min(95, 100 - (pos.eta_minutes / 120 * 100)))}%`
                        : '50%',
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