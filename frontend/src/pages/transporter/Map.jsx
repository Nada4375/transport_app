import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useLiveLocation } from '../../hooks/useLiveLocation';
import useAuthStore from '../../store/authStore';
import './Transporter.css';

/* ─── Fix default leaflet icons ─── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/* ─── Custom SVG icons ─── */
const makeIcon = (emoji, size = 36) => L.divIcon({
  className: '',
  html: `<div style="font-size:${size}px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));line-height:1">${emoji}</div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size],
  popupAnchor: [0, -size],
});

const ICONS = {
  vehicle:     makeIcon('🚐'),
  pickup:      makeIcon('📦', 30),
  destination: makeIcon('🏁', 30),
};

/* ─── Mock data ─── */
const MOCK_VEHICLES = [
  {
    vehicle_id: 1, plate: '14529-A-4', latitude: 35.7720, longitude: -5.8100,
    driver: 'Youssef Alami', status: 'on_mission', speed_kmh: 32, heading: 45,
    last_seen: new Date().toISOString(),
    order: { id: 12, client: 'Karim Bennani', eta: '14:30', distance_km: 8.4,
      pickup: { lat: 35.7760, lng: -5.8150, address: 'Rue Ibn Batouta, Tanger' },
      destination: { lat: 35.5479, lng: -5.3694, address: 'Av. Mohammed V, Tétouan' },
    },
  },
  {
    vehicle_id: 2, plate: '32190-C-2', latitude: 33.5900, longitude: -7.6200,
    driver: 'Rachid Tazi', status: 'on_mission', speed_kmh: 18, heading: 120,
    last_seen: new Date().toISOString(),
    order: { id: 15, client: 'Sara Idrissi', eta: '15:15', distance_km: 3.1,
      pickup: { lat: 33.5950, lng: -7.6280, address: 'Hay Hassani, Casablanca' },
      destination: { lat: 33.5880, lng: -7.6150, address: 'Bd Zerktouni, Casablanca' },
    },
  },
];

/* ─── Fly to helper component ─── */
function FlyTo({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 14, { animate: true, duration: 1 });
  }, [coords, map]);
  return null;
}

/* ─── Distance & ETA helpers ─── */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function formatEta(distKm, speedKmh = 40) {
  const mins = Math.round((distKm / speedKmh) * 60);
  if (mins < 60) return `~${mins} min`;
  return `~${Math.floor(mins/60)}h ${mins%60}min`;
}
function timeSince(iso) {
  const diff = Math.round((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff/60)}min`;
  return `il y a ${Math.floor(diff/3600)}h`;
}

export default function TransporterMap() {
  const [searchParams] = useSearchParams();
  const focusOrderId = searchParams.get('order');
  const { user } = useAuthStore();

  const [vehicles, setVehicles]         = useState(MOCK_VEHICLES);
  const [selected, setSelected]         = useState(null);
  const [flyTo, setFlyTo]               = useState(null);
  const [loading, setLoading]           = useState(false);
  const [gpsEnabled, setGpsEnabled]     = useState(false);
  const [activeOrder, setActiveOrder]   = useState(null);
  const pollRef = useRef(null);

  /* ─── GPS tracking hook (driver mode) ─── */
  const { status: gpsStatus, error: gpsError, position: gpsPos } = useLiveLocation({
    orderId:   activeOrder?.id,
    vehicleId: activeOrder?.vehicle_id,
    enabled:   gpsEnabled,
  });

  /* ─── Poll live positions every 5s ─── */
  const fetchLive = useCallback(async () => {
    try {
      const res = await axios.get('/api/tracking/live/');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setVehicles(prev => {
          const updated = [...prev];
          res.data.forEach(live => {
            const idx = updated.findIndex(v => v.vehicle_id === live.vehicle_id);
            if (idx >= 0) updated[idx] = { ...updated[idx], ...live };
          });
          return updated;
        });
      }
    } catch (_) { /* keep mock */ }
  }, []);

  useEffect(() => {
    fetchLive();
    pollRef.current = setInterval(fetchLive, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchLive]);

  /* ─── Focus on order from URL param ─── */
  useEffect(() => {
    if (focusOrderId) {
      const v = vehicles.find(v => v.order?.id === Number(focusOrderId));
      if (v) { setSelected(v); setFlyTo([v.latitude, v.longitude]); }
    }
  }, [focusOrderId, vehicles]);

  const selectVehicle = (v) => {
    setSelected(v);
    setFlyTo([v.latitude, v.longitude]);
  };

  /* ─── GPS status badge ─── */
  const GPS_STATUS = {
    idle:      { cls: 'badge-gray',   label: 'GPS inactif' },
    locating:  { cls: 'badge-orange', label: 'Localisation...' },
    tracking:  { cls: 'badge-green',  label: 'GPS actif' },
    ws_error:  { cls: 'badge-orange', label: 'Mode REST' },
    denied:    { cls: 'badge-red',    label: 'Permission refusée' },
    no_order:  { cls: 'badge-gray',   label: 'Aucune commande active' },
  };
  const gpsBadge = GPS_STATUS[gpsStatus] || GPS_STATUS.idle;

  /* ─── Center map ─── */
  const defaultCenter = vehicles[0]
    ? [vehicles[0].latitude, vehicles[0].longitude]
    : [33.9716, -6.8498]; // Rabat

  return (
    <div className="tp-map-layout">
      {/* ─ Sidebar ─ */}
      <div className="tp-map-sidebar">
        <div className="tp-map-sidebar-header">
          <h2>Véhicules en direct</h2>
          <span className={`tp-badge ${vehicles.length > 0 ? 'badge-green' : 'badge-gray'}`}>
            {vehicles.length} actif{vehicles.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* GPS Panel */}
        <div className="tp-gps-panel">
          <div className="tp-gps-header">
            <span>📡 Mode chauffeur GPS</span>
            <span className={`tp-badge ${gpsBadge.cls}`}>{gpsBadge.label}</span>
          </div>
          {gpsError && <p className="tp-gps-error">{gpsError}</p>}
          {gpsPos && (
            <div className="tp-gps-coords">
              {gpsPos.latitude?.toFixed(5)}, {gpsPos.longitude?.toFixed(5)}
              {gpsPos.speed ? ` · ${(gpsPos.speed * 3.6).toFixed(0)} km/h` : ''}
            </div>
          )}
          <button
            className={gpsEnabled ? 'tp-btn-danger' : 'tp-btn-primary'}
            onClick={() => setGpsEnabled(e => !e)}
          >
            {gpsEnabled ? '⏹ Arrêter le suivi' : '▶ Démarrer le suivi GPS'}
          </button>
        </div>

        {/* Vehicle list */}
        <div className="tp-vehicle-list">
          {vehicles.map(v => {
            const distToDestination = v.order?.destination
              ? haversine(v.latitude, v.longitude, v.order.destination.lat, v.order.destination.lng)
              : null;

            return (
              <div
                key={v.vehicle_id}
                className={`tp-vehicle-item${selected?.vehicle_id === v.vehicle_id ? ' active' : ''}`}
                onClick={() => selectVehicle(v)}
              >
                <div className="tp-vehicle-icon">🚐</div>
                <div className="tp-vehicle-info">
                  <strong>{v.plate}</strong>
                  <span>{v.driver}</span>
                  <div className="tp-vehicle-meta">
                    {v.speed_kmh > 0 && <span>⚡ {Math.round(v.speed_kmh)} km/h</span>}
                    {distToDestination && <span>📍 {distToDestination.toFixed(1)} km</span>}
                    {v.last_seen && <span className="tp-td-muted">{timeSince(v.last_seen)}</span>}
                  </div>
                </div>
                <span className={`tp-badge badge-blue`}>
                  {v.order ? `#${v.order.id}` : '—'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Selected order details */}
        {selected?.order && (() => {
          const dist = haversine(
            selected.latitude, selected.longitude,
            selected.order.destination.lat, selected.order.destination.lng
          );
          const totalDist = haversine(
            selected.order.pickup.lat, selected.order.pickup.lng,
            selected.order.destination.lat, selected.order.destination.lng
          );
          return (
            <div className="tp-order-detail">
              <div className="tp-order-detail-header">
                Commande #{selected.order.id}
              </div>
              <div className="tp-od-row"><span>Client</span><strong>{selected.order.client}</strong></div>
              <div className="tp-od-row"><span>📦 Départ</span><small>{selected.order.pickup.address}</small></div>
              <div className="tp-od-row"><span>🏁 Dest.</span><small>{selected.order.destination.address}</small></div>
              <div className="tp-od-row"><span>Distance totale</span><strong>{totalDist.toFixed(1)} km</strong></div>
              <div className="tp-od-row"><span>Distance restante</span><strong>{dist.toFixed(1)} km</strong></div>
              <div className="tp-od-row"><span>ETA</span><strong>{formatEta(dist, selected.speed_kmh || 40)}</strong></div>
              <div className="tp-od-row"><span>Dernière MAJ</span><span>{timeSince(selected.last_seen)}</span></div>
            </div>
          );
        })()}
      </div>

      {/* ─ Map ─ */}
      <div className="tp-map-container">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {flyTo && <FlyTo coords={flyTo} />}

          {vehicles.map(v => (
            <React.Fragment key={v.vehicle_id}>
              {/* Vehicle marker */}
              <Marker
                position={[v.latitude, v.longitude]}
                icon={ICONS.vehicle}
                eventHandlers={{ click: () => selectVehicle(v) }}
              >
                <Popup>
                  <div className="tp-popup">
                    <div className="tp-popup-title">🚐 {v.plate}</div>
                    <div className="tp-popup-row"><span>Chauffeur</span><strong>{v.driver}</strong></div>
                    {v.order && <div className="tp-popup-row"><span>Commande</span><strong>#{v.order.id}</strong></div>}
                    {v.order && <div className="tp-popup-row"><span>Client</span><strong>{v.order.client}</strong></div>}
                    <div className="tp-popup-row"><span>Vitesse</span><strong>{Math.round(v.speed_kmh || 0)} km/h</strong></div>
                    {v.order?.destination && (
                      <div className="tp-popup-row">
                        <span>ETA</span>
                        <strong>{formatEta(
                          haversine(v.latitude, v.longitude, v.order.destination.lat, v.order.destination.lng),
                          v.speed_kmh || 40
                        )}</strong>
                      </div>
                    )}
                    <div className="tp-popup-row"><span>Mise à jour</span><strong>{timeSince(v.last_seen)}</strong></div>
                  </div>
                </Popup>
              </Marker>

              {/* Pickup marker */}
              {v.order?.pickup && (
                <Marker position={[v.order.pickup.lat, v.order.pickup.lng]} icon={ICONS.pickup}>
                  <Popup>
                    <div className="tp-popup">
                      <div className="tp-popup-title">📦 Point de départ</div>
                      <div>{v.order.pickup.address}</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Destination marker */}
              {v.order?.destination && (
                <Marker position={[v.order.destination.lat, v.order.destination.lng]} icon={ICONS.destination}>
                  <Popup>
                    <div className="tp-popup">
                      <div className="tp-popup-title">🏁 Destination</div>
                      <div>{v.order.destination.address}</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Route line: vehicle → destination */}
              {v.order?.destination && (
                <Polyline
                  positions={[
                    [v.latitude, v.longitude],
                    [v.order.destination.lat, v.order.destination.lng],
                  ]}
                  pathOptions={{ color: '#2d6a4f', weight: 3, dashArray: '8 6', opacity: 0.75 }}
                />
              )}

              {/* Full route: pickup → destination */}
              {v.order?.pickup && v.order?.destination && (
                <Polyline
                  positions={[
                    [v.order.pickup.lat, v.order.pickup.lng],
                    [v.order.destination.lat, v.order.destination.lng],
                  ]}
                  pathOptions={{ color: '#74c69d', weight: 2, dashArray: '4 8', opacity: 0.4 }}
                />
              )}

              {/* Live GPS position (driver mode) */}
              {gpsEnabled && gpsPos && (
                <Marker
                  position={[gpsPos.latitude, gpsPos.longitude]}
                  icon={makeIcon('📍', 28)}
                >
                  <Popup>Ma position GPS en direct</Popup>
                </Marker>
              )}
            </React.Fragment>
          ))}
        </MapContainer>

        {/* Map legend */}
        <div className="tp-map-legend">
          <span>🚐 Véhicule</span>
          <span>📦 Départ</span>
          <span>🏁 Destination</span>
        </div>
      </div>
    </div>
  );
}