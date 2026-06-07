import React, { useEffect, useRef } from 'react';

let L = null;

function getL() {
  if (!L) L = require('leaflet');
  return L;
}

const TRUCK_SVG_WHITE = `
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
    viewBox="0 0 24 24" fill="none" stroke="white"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 17h4V5H2v12h3"/>
    <path d="M14 17h1"/>
    <path d="M14 8h4l4 4v5h-3"/>
    <circle cx="7" cy="17" r="2"/>
    <circle cx="17" cy="17" r="2"/>
  </svg>
`;

const TRUCK_SVG_BLUE = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    viewBox="0 0 24 24" fill="none" stroke="#2563eb"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 17h4V5H2v12h3"/>
    <path d="M14 17h1"/>
    <path d="M14 8h4l4 4v5h-3"/>
    <circle cx="7" cy="17" r="2"/>
    <circle cx="17" cy="17" r="2"/>
  </svg>
`;

const ICONS = {
  truck: (plate) => `
    <div style="
      background:#378ADD;
      color:white;
      border-radius:9px;
      padding:4px 10px;
      font-size:11px;
      font-weight:700;
      border:2px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      white-space:nowrap;
      display:flex;
      align-items:center;
      gap:6px;
      font-family:DM Sans,sans-serif;
    ">
      ${TRUCK_SVG_WHITE}
      ${plate}
    </div>`,

  pickup: `
    <div style="
      width:15px;
      height:15px;
      border-radius:50%;
      background:#378ADD;
      border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,

  destination: `
    <div style="
      width:15px;
      height:15px;
      border-radius:50%;
      background:#1D9E75;
      border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
};

function row(label, value) {
  if (!value) return '';
  return `
    <div style="
      display:flex;
      gap:6px;
      margin-bottom:4px;
      color:#4b5563;
      line-height:1.35;
    ">
      <span style="font-weight:700;color:#111827;min-width:86px">${label}</span>
      <span>${value}</span>
    </div>
  `;
}

function buildPopup(pos) {
  const etaText = pos.eta_minutes != null
    ? pos.eta_minutes < 60
      ? `${pos.eta_minutes} min`
      : `${Math.floor(pos.eta_minutes / 60)}h ${pos.eta_minutes % 60}min`
    : '—';

  const routeText = pos.departure_city
    ? `${pos.departure_city} → ${pos.destination_city || '—'}`
    : '';

  return `
    <div style="
      font-family:DM Sans,sans-serif;
      min-width:230px;
      font-size:12px;
      color:#111827;
    ">
      <div style="
        display:flex;
        align-items:center;
        gap:8px;
        font-weight:800;
        font-size:14px;
        margin-bottom:8px;
      ">
        <span style="
          width:28px;
          height:28px;
          border-radius:9px;
          background:#dbeafe;
          color:#2563eb;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          font-weight:900;
        ">${TRUCK_SVG_BLUE}</span>
        <span>${pos.plate || '—'}</span>
      </div>

      ${row('Commande', pos.order_number)}
      ${row('Transporteur', pos.transporter_name)}
      ${row('Chauffeur', pos.driver_name)}
      ${row('Client', pos.client_name)}
      ${row('Trajet', routeText)}
      ${row('Distance', pos.distance_km ? `${pos.distance_km} km` : '')}

      <div style="
        margin-top:8px;
        padding:8px 10px;
        border-radius:10px;
        background:#eff6ff;
        color:#2563eb;
        font-weight:800;
        font-size:13px;
      ">
        ETA : ${etaText}
      </div>

      ${pos.last_seen ? `
        <div style="color:#9ca3af;font-size:10px;margin-top:6px">
          GPS : ${new Date(pos.last_seen).toLocaleTimeString()}
        </div>
      ` : ''}
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
  const firstFitDoneRef = useRef(false);

  useEffect(() => {
    if (mapRef.current) return;

    const Lf = getL();
    delete Lf.Icon.Default.prototype._getIconUrl;

    mapRef.current = Lf.map(containerRef.current, {
      zoomControl: true,
    }).setView(center, zoom);

    Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const Lf = getL();

    if (!map) return;

    Object.values(layersRef.current).forEach((layer) => {
      try {
        layer.remove();
      } catch (e) {}
    });

    layersRef.current = {};

    if (!positions.length) return;

    const allLatLngs = [];

    positions.forEach((pos, idx) => {
      const key = pos.vehicle_id || pos.order_id || idx;
      const truckLatLng = [pos.latitude, pos.longitude];

      const truckIcon = Lf.divIcon({
        html: ICONS.truck(pos.plate || '—'),
        className: '',
        iconSize: [100, 30],
        iconAnchor: [50, 15],
      });

      const truckMarker = Lf.marker(truckLatLng, { icon: truckIcon })
        .bindPopup(buildPopup(pos), { maxWidth: 260 })
        .addTo(map);

      layersRef.current[`truck-${key}`] = truckMarker;
      allLatLngs.push(truckLatLng);

      let departureLatLng = null;
      let destinationLatLng = null;

      if (pos.departure_lat && pos.departure_lng) {
        departureLatLng = [pos.departure_lat, pos.departure_lng];

        const depIcon = Lf.divIcon({
          html: ICONS.pickup,
          className: '',
          iconSize: [15, 15],
          iconAnchor: [7, 7],
        });

        const depMarker = Lf.marker(departureLatLng, { icon: depIcon })
          .bindPopup(`<b>Départ</b><br>${pos.departure_city || ''}`)
          .addTo(map);

        layersRef.current[`dep-${key}`] = depMarker;
        allLatLngs.push(departureLatLng);
      }

      if (pos.destination_lat && pos.destination_lng) {
        destinationLatLng = [pos.destination_lat, pos.destination_lng];

        const dstIcon = Lf.divIcon({
          html: ICONS.destination,
          className: '',
          iconSize: [15, 15],
          iconAnchor: [7, 7],
        });

        const dstMarker = Lf.marker(destinationLatLng, { icon: dstIcon })
          .bindPopup(`<b>Destination</b><br>${pos.destination_city || ''}`)
          .addTo(map);

        layersRef.current[`dst-${key}`] = dstMarker;
        allLatLngs.push(destinationLatLng);
      }

      if (departureLatLng) {
        const lineStartToVehicle = Lf.polyline([departureLatLng, truckLatLng], {
          color: '#16a34a',
          weight: 4,
          opacity: 0.85,
        }).addTo(map);

        layersRef.current[`line-start-vehicle-${key}`] = lineStartToVehicle;
      }

      if (destinationLatLng) {
        const lineVehicleToDestination = Lf.polyline([truckLatLng, destinationLatLng], {
          color: '#2563eb',
          weight: 4,
          opacity: 0.9,
          dashArray: '8 6',
        }).addTo(map);

        layersRef.current[`line-vehicle-destination-${key}`] = lineVehicleToDestination;
      }
    });

    if (!firstFitDoneRef.current && allLatLngs.length > 0) {
      try {
        if (allLatLngs.length === 1) {
          map.setView(allLatLngs[0], 13);
        } else {
          map.fitBounds(allLatLngs, { padding: [40, 40] });
        }

        firstFitDoneRef.current = true;
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