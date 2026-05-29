import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { ordersAPI } from '../../services/api';
import { useLiveLocation } from '../../hooks/useLiveLocation';
import './Transporter.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const makeIcon = (emoji, size = 36) =>
  L.divIcon({
    className: '',
    html: `<div style="font-size:${size}px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));line-height:1">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });

const ICONS = {
  vehicle: makeIcon('🚐'),
  pickup: makeIcon('📦', 30),
  destination: makeIcon('🏁', 30),
};

function FlyTo({ coords }) {
  const map = useMap();

  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 14, { animate: true, duration: 1 });
    }
  }, [coords, map]);

  return null;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatEta(distKm, speedKmh = 40) {
  const mins = Math.round((distKm / speedKmh) * 60);

  if (mins < 60) return `~${mins} min`;

  return `~${Math.floor(mins / 60)}h ${mins % 60}min`;
}

function timeSince(iso) {
  if (!iso) return '—';

  const diff = Math.round((Date.now() - new Date(iso)) / 1000);

  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;

  return `il y a ${Math.floor(diff / 3600)}h`;
}

function getPointLat(point, fallback) {
  return point?.coordinates?.[1] || fallback;
}

function getPointLng(point, fallback) {
  return point?.coordinates?.[0] || fallback;
}

function mapOrderToVehicle(order) {
  const pickupLat = getPointLat(order.departure_point, 35.7595);
  const pickupLng = getPointLng(order.departure_point, -5.8340);

  const destLat = getPointLat(order.destination_point, pickupLat + 0.03);
  const destLng = getPointLng(order.destination_point, pickupLng + 0.03);

  return {
    vehicle_id: order.vehicle || order.id,
    plate: order.vehicle_plate || '—',
    latitude: pickupLat,
    longitude: pickupLng,
    driver: order.driver_name || 'Sans chauffeur',
    status: order.status,
    speed_kmh: order.status === 'in_transit' ? 35 : 0,
    heading: 0,
    last_seen: order.updated_at || order.created_at,
    order: {
      id: order.id,
      client: order.client_name || '—',
      eta: '—',
      distance_km: order.distance_km || null,
      pickup: {
        lat: pickupLat,
        lng: pickupLng,
        address: order.departure_address || order.departure_city || '—',
      },
      destination: {
        lat: destLat,
        lng: destLng,
        address: order.destination_address || order.destination_city || '—',
      },
    },
  };
}

export default function TransporterMap() {
  const [searchParams] = useSearchParams();
  const focusOrderId = searchParams.get('order');

  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const pollRef = useRef(null);

  const { status: gpsStatus, error: gpsError, position: gpsPos } = useLiveLocation({
    orderId: activeOrder?.id,
    vehicleId: activeOrder?.vehicle_id,
    enabled: gpsEnabled,
  });

  const fetchLive = useCallback(async () => {
    setLoading(true);

    try {
      const res = await ordersAPI.list();
      const data = res.data.results || res.data || [];

      const activeOrders = Array.isArray(data)
        ? data.filter((o) => ['assigned', 'in_transit'].includes(o.status))
        : [];

      const mapped = activeOrders.map(mapOrderToVehicle);

      setVehicles(mapped);

      if (focusOrderId) {
        const target = mapped.find((v) => v.order?.id === Number(focusOrderId));

        if (target) {
          setSelected(target);
          setActiveOrder(target.order);
          setFlyTo([target.latitude, target.longitude]);
        }
      }
    } catch (err) {
      console.error('LOAD MAP ORDERS ERROR:', err.response?.data || err.message);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [focusOrderId]);

  useEffect(() => {
    fetchLive();
    pollRef.current = setInterval(fetchLive, 10000);

    return () => clearInterval(pollRef.current);
  }, [fetchLive]);

  const selectVehicle = (v) => {
    setSelected(v);
    setActiveOrder(v.order);
    setFlyTo([v.latitude, v.longitude]);
  };

  const GPS_STATUS = {
    idle: { cls: 'badge-gray', label: 'GPS inactif' },
    locating: { cls: 'badge-orange', label: 'Localisation...' },
    tracking: { cls: 'badge-green', label: 'GPS actif' },
    ws_error: { cls: 'badge-orange', label: 'Mode REST' },
    denied: { cls: 'badge-red', label: 'Permission refusée' },
    no_order: { cls: 'badge-gray', label: 'Aucune commande active' },
  };

  const gpsBadge = GPS_STATUS[gpsStatus] || GPS_STATUS.idle;

  const defaultCenter = vehicles[0]
    ? [vehicles[0].latitude, vehicles[0].longitude]
    : [35.7595, -5.8340];

  return (
    <div className="tp-map-layout">
      <div className="tp-map-sidebar">
        <div className="tp-map-sidebar-header">
          <h2>Véhicules en direct</h2>
          <span className={`tp-badge ${vehicles.length > 0 ? 'badge-green' : 'badge-gray'}`}>
            {vehicles.length} actif{vehicles.length > 1 ? 's' : ''}
          </span>
        </div>

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
            onClick={() => setGpsEnabled((e) => !e)}
            disabled={!activeOrder}
            title={!activeOrder ? 'Sélectionnez une commande active' : ''}
          >
            {gpsEnabled ? '⏹ Arrêter le suivi' : '▶ Démarrer le suivi GPS'}
          </button>
        </div>

        <div className="tp-vehicle-list">
          {loading && vehicles.length === 0 ? (
            <div className="tp-empty-small">Chargement…</div>
          ) : vehicles.length === 0 ? (
            <div className="tp-empty-small">Aucun véhicule actif pour le moment.</div>
          ) : (
            vehicles.map((v) => {
              const distToDestination = v.order?.destination
                ? haversine(
                    v.latitude,
                    v.longitude,
                    v.order.destination.lat,
                    v.order.destination.lng
                  )
                : null;

              return (
                <div
                  key={`${v.vehicle_id}-${v.order?.id}`}
                  className={`tp-vehicle-item${selected?.order?.id === v.order?.id ? ' active' : ''}`}
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

                  <span className="tp-badge badge-blue">
                    #{v.order?.id}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {selected?.order && (() => {
          const dist = haversine(
            selected.latitude,
            selected.longitude,
            selected.order.destination.lat,
            selected.order.destination.lng
          );

          const totalDist = haversine(
            selected.order.pickup.lat,
            selected.order.pickup.lng,
            selected.order.destination.lat,
            selected.order.destination.lng
          );

          return (
            <div className="tp-order-detail">
              <div className="tp-order-detail-header">
                Commande #{selected.order.id}
              </div>

              <div className="tp-od-row">
                <span>Client</span>
                <strong>{selected.order.client}</strong>
              </div>

              <div className="tp-od-row">
                <span>📦 Départ</span>
                <small>{selected.order.pickup.address}</small>
              </div>

              <div className="tp-od-row">
                <span>🏁 Destination</span>
                <small>{selected.order.destination.address}</small>
              </div>

              <div className="tp-od-row">
                <span>Distance totale</span>
                <strong>{totalDist.toFixed(1)} km</strong>
              </div>

              <div className="tp-od-row">
                <span>Distance restante</span>
                <strong>{dist.toFixed(1)} km</strong>
              </div>

              <div className="tp-od-row">
                <span>ETA</span>
                <strong>{formatEta(dist, selected.speed_kmh || 40)}</strong>
              </div>

              <div className="tp-od-row">
                <span>Dernière MAJ</span>
                <span>{timeSince(selected.last_seen)}</span>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="tp-map-container">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
          zoomControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {flyTo && <FlyTo coords={flyTo} />}

          {vehicles.map((v) => (
            <React.Fragment key={`${v.vehicle_id}-${v.order?.id}-markers`}>
              <Marker
                position={[v.latitude, v.longitude]}
                icon={ICONS.vehicle}
                eventHandlers={{ click: () => selectVehicle(v) }}
              >
                <Popup>
                  <div className="tp-popup">
                    <div className="tp-popup-title">🚐 {v.plate}</div>

                    <div className="tp-popup-row">
                      <span>Chauffeur</span>
                      <strong>{v.driver}</strong>
                    </div>

                    <div className="tp-popup-row">
                      <span>Commande</span>
                      <strong>#{v.order.id}</strong>
                    </div>

                    <div className="tp-popup-row">
                      <span>Client</span>
                      <strong>{v.order.client}</strong>
                    </div>

                    <div className="tp-popup-row">
                      <span>Vitesse</span>
                      <strong>{Math.round(v.speed_kmh || 0)} km/h</strong>
                    </div>

                    <div className="tp-popup-row">
                      <span>Mise à jour</span>
                      <strong>{timeSince(v.last_seen)}</strong>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {v.order?.pickup && (
                <Marker
                  position={[v.order.pickup.lat, v.order.pickup.lng]}
                  icon={ICONS.pickup}
                >
                  <Popup>
                    <div className="tp-popup">
                      <div className="tp-popup-title">📦 Point de départ</div>
                      <div>{v.order.pickup.address}</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {v.order?.destination && (
                <Marker
                  position={[v.order.destination.lat, v.order.destination.lng]}
                  icon={ICONS.destination}
                >
                  <Popup>
                    <div className="tp-popup">
                      <div className="tp-popup-title">🏁 Destination</div>
                      <div>{v.order.destination.address}</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {v.order?.destination && (
                <Polyline
                  positions={[
                    [v.latitude, v.longitude],
                    [v.order.destination.lat, v.order.destination.lng],
                  ]}
                  pathOptions={{
                    color: '#2d6a4f',
                    weight: 3,
                    dashArray: '8 6',
                    opacity: 0.75,
                  }}
                />
              )}

              {v.order?.pickup && v.order?.destination && (
                <Polyline
                  positions={[
                    [v.order.pickup.lat, v.order.pickup.lng],
                    [v.order.destination.lat, v.order.destination.lng],
                  ]}
                  pathOptions={{
                    color: '#74c69d',
                    weight: 2,
                    dashArray: '4 8',
                    opacity: 0.4,
                  }}
                />
              )}

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

        <div className="tp-map-legend">
          <span>🚐 Véhicule</span>
          <span>📦 Départ</span>
          <span>🏁 Destination</span>
        </div>
      </div>
    </div>
  );
}