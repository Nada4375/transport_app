import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const TRUCK_ICON = L.divIcon({
  html: '<div style="font-size:22px;line-height:1">🚚</div>',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const PIN_BLUE = L.divIcon({
  html: '<div style="width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#378ADD;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>',
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 14],
});

const PIN_GREEN = L.divIcon({
  html: '<div style="width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#1D9E75;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>',
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 14],
});

export default function MapView({
  center = [33.9716, -6.8498],
  zoom = 8,
  departure,
  destination,
  truckPosition,
  waypoints = [],
  routeCoords = [],
  livePositions = [],
  height = '400px',
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const truckMarker = useRef(null);

  useEffect(() => {
    if (mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInstance.current);
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (departure) {
      L.marker([departure.lat, departure.lng], { icon: PIN_BLUE })
        .bindPopup(`<b>Pickup:</b> ${departure.label || ''}`)
        .addTo(map);
    }
    if (destination) {
      L.marker([destination.lat, destination.lng], { icon: PIN_GREEN })
        .bindPopup(`<b>Delivery:</b> ${destination.label || ''}`)
        .addTo(map);
    }

    waypoints.forEach((wp) => {
      L.circleMarker([wp.lat, wp.lng], { radius: 6, color: '#EF9F27', fillColor: '#EF9F27', fillOpacity: 1 })
        .bindPopup(wp.label || 'Waypoint')
        .addTo(map);
    });

    if (routeCoords.length > 1) {
      L.polyline(routeCoords, { color: '#378ADD', weight: 3, dashArray: '8 4' }).addTo(map);
    }

    livePositions.forEach((pos) => {
      L.marker([pos.lat, pos.lng], { icon: TRUCK_ICON })
        .bindPopup(`<b>${pos.plate}</b><br>Speed: ${pos.speed} km/h`)
        .addTo(map);
    });
  }, [departure, destination, waypoints, routeCoords, livePositions]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !truckPosition) return;
    if (!truckMarker.current) {
      truckMarker.current = L.marker([truckPosition.lat, truckPosition.lng], { icon: TRUCK_ICON }).addTo(map);
    } else {
      truckMarker.current.setLatLng([truckPosition.lat, truckPosition.lng]);
    }
    map.panTo([truckPosition.lat, truckPosition.lng]);
  }, [truckPosition]);

  return <div ref={mapRef} style={{ height, width: '100%', borderRadius: '12px' }} />;
}
