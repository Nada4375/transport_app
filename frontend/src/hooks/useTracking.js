import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

export function useTracking(orderId) {
  const ws = useRef(null);
  const [position, setPosition] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    ws.current = new WebSocket(`${WS_BASE}/tracking/${orderId}/`);

    ws.current.onopen = () => setConnected(true);
    ws.current.onclose = () => setConnected(false);
    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'location_update') {
        setPosition({ lat: data.latitude, lng: data.longitude, speed: data.speed_kmh, heading: data.heading });
      }
    };

    return () => { ws.current?.close(); };
  }, [orderId]);

  const sendLocation = useCallback((lat, lng, speed = 0, heading = 0) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'location_update', latitude: lat, longitude: lng, speed_kmh: speed, heading }));
    }
  }, []);

  return { position, connected, sendLocation };
}
