import React, { useEffect, useRef } from 'react';

let L = null;
function getL() {
  if (!L) L = require('leaflet');
  return L;
}

const ICONS = {
  truck: (plate) => `
    <div style="
      background:#378ADD;color:white;border-radius:8px;
      padding:3px 8px;font-size:10px;font-weight:600;
      border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);
      white-space:nowrap;display:flex;align-items:center;gap:4px;
    ">🚚 ${plate}</div>`,
  pickup: `<div style="width:13px;height:13px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#378ADD;border:2.5px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3)"></div>`,
  destination: `<div style="width:13px;height:13px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#1D9E75;border:2.5px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3)"></div>`,
};

function buildPopup(pos) {
  const etaText = pos.eta_minutes != null
    ? pos.eta_minutes < 60
      ? `${pos.eta_minutes} min`
      : `${Math.floor(pos.eta_minutes / 60)}h ${pos.eta_minutes % 60}min`
    : '—';

  return `
    <div style="font-family:DM Sans,sans-serif;min-width:180px;font-size:12px">
      <div style="font-weight:700;font-size:13px;margin-bottom:6px">🚚 ${pos.plate || '—'}</div>
      ${pos.order_number ? `<div style="color:#555;margin-bottom:2px">📋 ${pos.order_number}</div>` : ''}
      ${pos.transporter_name ? `<div style="color:#555;margin-bottom:2px">🏢 ${pos.transporter_name}</div>` : ''}
      ${pos.driver_name ? `<div style="color:#555;margin-bottom:2px">👤 ${pos.driver_name}</div>` : ''}
      ${pos.client_name ? `<div style="color:#555;margin-bottom:2px">👥 ${pos.client_name}</div>` : ''}
      ${pos.departure_city ? `<div style="color:#555;margin-bottom:6px">📍 ${pos.departure_city} → 🏁 ${pos.destination_city}</div>` : ''}
      ${pos.distance_km ? `<div style="color:#555;margin-bottom:2px">📏 ${pos.distance_km} km (route)</div>` : ''}
      <div style="color:#378ADD;font-weight:700;font-size:13px">⏱ ETA: ${etaText}</div>
      ${pos.last_seen ? `<div style="color:#aaa;font-size:10px;margin-top:4px">GPS: ${new Date(pos.last_seen).toLocaleTimeString()}</div>` : ''}
    </div>
  `;
}

export default function LiveMap({
  positions = [],
  height = '420px',
  center = [31.7917, -7.0926],
  zoom = 6
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({});

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;
    const Lf = getL();
    delete Lf.Icon.Default.prototype._getIconUrl;

    mapRef.current = Lf.map(containerRef.current, { zoomControl: true }).setView(center, zoom);
    Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Update when positions change
  useEffect(() => {
    const map = mapRef.current;
    const Lf = getL();
    if (!map) return;

    // Clear old layers
    Object.values(layersRef.current).forEach(layer => {
      try { layer.remove(); } catch (e) {}
    });
    layersRef.current = {};

    if (!positions.length) return;

    const allLatLngs = [];

    positions.forEach((pos, idx) => {
      const key = pos.vehicle_id || pos.order_id || idx;

      // ── Truck marker ──
      const truckIcon = Lf.divIcon({
        html: ICONS.truck(pos.plate || '—'),
        className: '',
        iconSize: [90, 28],
        iconAnchor: [45, 14],
      });

      const truckMarker = Lf.marker([pos.latitude, pos.longitude], { icon: truckIcon })
        .bindPopup(buildPopup(pos), { maxWidth: 220 })
        .addTo(map);

      layersRef.current[`truck-${key}`] = truckMarker;
      allLatLngs.push([pos.latitude, pos.longitude]);

      // ── OSRM road route ──
      if (pos.route_geometry && pos.route_geometry.length >= 2) {
        // route_geometry is [[lat,lng], [lat,lng], ...]
        const routeLine = Lf.polyline(pos.route_geometry, {
          color: '#378ADD',
          weight: 4,
          opacity: 0.75,
        }).addTo(map);
        layersRef.current[`route-${key}`] = routeLine;

        // Add all route points to bounds
        pos.route_geometry.forEach(p => allLatLngs.push(p));
      } else {
        // Fallback: dashed straight line
        const points = [];
        if (pos.departure_lat && pos.departure_lng)
          points.push([pos.departure_lat, pos.departure_lng]);
        points.push([pos.latitude, pos.longitude]);
        if (pos.destination_lat && pos.destination_lng)
          points.push([pos.destination_lat, pos.destination_lng]);

        if (points.length >= 2) {
          const fallbackLine = Lf.polyline(points, {
            color: '#378ADD', weight: 2.5, dashArray: '7 5', opacity: 0.6,
          }).addTo(map);
          layersRef.current[`fallback-${key}`] = fallbackLine;
        }
      }

      // ── Pickup pin (blue) ──
      if (pos.departure_lat && pos.departure_lng) {
        const depIcon = Lf.divIcon({
          html: ICONS.pickup, className: '', iconSize: [13, 13], iconAnchor: [6, 13],
        });
        const depMarker = Lf.marker([pos.departure_lat, pos.departure_lng], { icon: depIcon })
          .bindPopup(`<b>📍 Pickup</b><br>${pos.departure_city || ''}`)
          .addTo(map);
        layersRef.current[`dep-${key}`] = depMarker;
        allLatLngs.push([pos.departure_lat, pos.departure_lng]);
      }

      // ── Destination pin (green) ──
      if (pos.destination_lat && pos.destination_lng) {
        const dstIcon = Lf.divIcon({
          html: ICONS.destination, className: '', iconSize: [13, 13], iconAnchor: [6, 13],
        });
        const dstMarker = Lf.marker([pos.destination_lat, pos.destination_lng], { icon: dstIcon })
          .bindPopup(`<b>🏁 Destination</b><br>${pos.destination_city || ''}`)
          .addTo(map);
        layersRef.current[`dst-${key}`] = dstMarker;
        allLatLngs.push([pos.destination_lat, pos.destination_lng]);
      }
    });

    // Fit map to show everything
    if (allLatLngs.length > 0) {
      try {
        if (allLatLngs.length === 1) {
          map.setView(allLatLngs[0], 13);
        } else {
          map.fitBounds(allLatLngs, { padding: [40, 40] });
        }
      } catch (e) {}
    }
  }, [positions]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}
    />
  );
}
