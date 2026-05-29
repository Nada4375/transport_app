import { useEffect, useRef, useCallback, useState } from 'react';
import axios from 'axios';

/**
 * useLiveLocation
 * Sends GPS position to backend via WebSocket (primary) or REST fallback.
 * Gracefully handles permission denial, WS failures, and missing order/vehicle.
 *
 * @param {object} opts
 *   orderId   {number|null}  - active order being delivered
 *   vehicleId {number|null}  - driver's vehicle
 *   enabled   {boolean}      - start/stop tracking
 */
export function useLiveLocation({ orderId, vehicleId, enabled = true } = {}) {
  const wsRef        = useRef(null);
  const watchIdRef   = useRef(null);
  const intervalRef  = useRef(null);
  const lastPosRef   = useRef(null);

  const [status, setStatus]   = useState('idle'); // idle | locating | tracking | ws_error | denied | no_order
  const [error, setError]     = useState(null);
  const [position, setPosition] = useState(null);

  /* ─── Send via REST fallback ─── */
  const sendRest = useCallback(async (payload) => {
    try {
      await axios.post('/api/tracking/update/', payload);
    } catch (err) {
      console.warn('[useLiveLocation] REST fallback failed:', err.message);
    }
  }, []);

  /* ─── Send position ─── */
  const sendPosition = useCallback((coords) => {
    if (!orderId || !vehicleId) {
      setStatus('no_order');
      return;
    }
    const payload = {
      type: 'location_update',
      order_id: orderId,
      vehicle_id: vehicleId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      speed_kmh: coords.speed ? coords.speed * 3.6 : 0,   // m/s → km/h
      heading: coords.heading ?? 0,
    };

    /* Try WebSocket first */
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      /* REST fallback */
      sendRest(payload);
    }
  }, [orderId, vehicleId, sendRest]);

  /* ─── Open WebSocket ─── */
  const openWs = useCallback(() => {
    if (!orderId) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url   = `${proto}://${window.location.host}/ws/tracking/${orderId}/`;
    const ws    = new WebSocket(url);

    ws.onopen  = () => setStatus('tracking');
    ws.onerror = () => { setStatus('ws_error'); setError('WebSocket indisponible — mode REST actif'); };
    ws.onclose = () => setStatus(prev => prev === 'tracking' ? 'ws_error' : prev);

    wsRef.current = ws;
    return ws;
  }, [orderId]);

  /* ─── Start ─── */
  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setStatus('denied');
      setError('La géolocalisation n\'est pas disponible sur cet appareil.');
      return;
    }

    setStatus('locating');
    openWs();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPosRef.current = pos.coords;
        setPosition(pos.coords);
        setStatus(prev => prev === 'locating' ? 'tracking' : prev);
        sendPosition(pos.coords);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setError('Permission de localisation refusée. Activez-la dans les paramètres du navigateur.');
        } else {
          setError(`Erreur GPS : ${err.message}`);
          /* Continue with mock in dev mode */
          if (process.env.NODE_ENV === 'development') {
            startMockFallback();
          }
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (wsRef.current) wsRef.current.close();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  
  }, [enabled, orderId, vehicleId]);

  /* ─── Mock fallback for dev / demo ─── */
  function startMockFallback() {
    let lat = 35.7595 + Math.random() * 0.05;
    let lng = -5.8340 + Math.random() * 0.05;
    setStatus('tracking');
    intervalRef.current = setInterval(() => {
      lat += (Math.random() - 0.5) * 0.0008;
      lng += (Math.random() - 0.5) * 0.0008;
      const mockCoords = { latitude: lat, longitude: lng, speed: 30 / 3.6, heading: Math.random() * 360 };
      lastPosRef.current = mockCoords;
      setPosition(mockCoords);
      sendPosition(mockCoords);
    }, 4000);
  }

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (wsRef.current) wsRef.current.close();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus('idle');
  }, []);

  return { status, error, position, stopTracking };
}

export default useLiveLocation;