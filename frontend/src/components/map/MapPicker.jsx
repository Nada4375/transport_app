import React, { useState, useEffect, useRef } from 'react';

let L = null;
function getLeaflet() {
  if (!L) L = require('leaflet');
  return L;
}

const BLUE_PIN = `<div style="width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#378ADD;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`;
const GREEN_PIN = `<div style="width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#1D9E75;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`;

async function nominatimSearch(query) {
  if (!query || query.length < 3) return [];
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' Maroc')}&format=json&limit=5&countrycodes=ma&addressdetails=1`,
      { headers: { 'User-Agent': 'TransportHub/1.0' } }
    );
    return await r.json();
  } catch { return []; }
}

// ── Search input with dropdown ──────────────────────────────────────
function SearchBox({ label, pinColor, value, onSelect }) {
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (value) setText(value.label);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const onChange = (e) => {
    const v = e.target.value;
    setText(v);
    clearTimeout(timer.current);
    if (v.length >= 3) {
      setLoading(true);
      timer.current = setTimeout(async () => {
        const res = await nominatimSearch(v);
        setResults(res);
        setLoading(false);
      }, 450);
    } else {
      setResults([]);
    }
  };

  const pick = (item) => {
    const parts = item.display_name.split(',');
    const shortLabel = parts.slice(0, 2).join(',').trim();
    const city =
      item.address?.city ||
      item.address?.town ||
      item.address?.village ||
      item.address?.municipality ||
      parts[0].trim();
    setText(shortLabel);
    setResults([]);
    onSelect({
      label: shortLabel,
      fullLabel: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      city,
    });
  };

  return (
    <div ref={wrapRef} style={{ flex: 1, minWidth: 200 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: pinColor, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', flexShrink: 0 }} />
        {label}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          value={text}
          onChange={onChange}
          placeholder={`Rechercher ${label.toLowerCase()}...`}
          style={{
            width: '100%', padding: '9px 10px 9px 34px',
            border: `1.5px solid ${value ? pinColor : '#E8EAED'}`,
            borderRadius: 8, fontSize: 13, outline: 'none',
            fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
        />
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>🔍</span>
        {loading && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#aaa' }}>...</span>
        )}
        {results.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0,
            background: 'white', border: '1px solid #E8EAED', borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 99999, overflow: 'hidden',
          }}>
            {results.map((item, i) => (
              <div
                key={i} onClick={() => pick(item)}
                style={{
                  padding: '9px 12px', cursor: 'pointer', fontSize: 12,
                  borderBottom: i < results.length - 1 ? '1px solid #F3F4F6' : 'none',
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0F7FF'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <span style={{ flexShrink: 0, marginTop: 1 }}>📍</span>
                <div>
                  <div style={{ fontWeight: 500, color: '#1A1D23' }}>{item.display_name.split(',')[0]}</div>
                  <div style={{ color: '#888', fontSize: 10, marginTop: 1 }}>{item.display_name.split(',').slice(1, 3).join(',').trim()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Leaflet map — isolated div that React never touches ─────────────
function LeafletMap({ departure, destination }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const depMarkerRef = useRef(null);
  const dstMarkerRef = useRef(null);
  const lineRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;
    const Lf = getLeaflet();
    delete Lf.Icon.Default.prototype._getIconUrl;
    Lf.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
    mapRef.current = Lf.map(containerRef.current, { zoomControl: true }).setView([31.7917, -7.0926], 5);
    Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const Lf = getLeaflet();
    if (!map) return;

    if (depMarkerRef.current) { depMarkerRef.current.remove(); depMarkerRef.current = null; }
    if (dstMarkerRef.current) { dstMarkerRef.current.remove(); dstMarkerRef.current = null; }
    if (lineRef.current) { lineRef.current.remove(); lineRef.current = null; }

    const blueIcon = Lf.divIcon({ html: BLUE_PIN, className: '', iconSize: [14, 14], iconAnchor: [7, 14] });
    const greenIcon = Lf.divIcon({ html: GREEN_PIN, className: '', iconSize: [14, 14], iconAnchor: [7, 14] });

    if (departure) {
      depMarkerRef.current = Lf.marker([departure.lat, departure.lng], { icon: blueIcon })
        .bindPopup(`<b>📍 Départ</b><br>${departure.label}`).addTo(map);
    }
    if (destination) {
      dstMarkerRef.current = Lf.marker([destination.lat, destination.lng], { icon: greenIcon })
        .bindPopup(`<b>🏁 Destination</b><br>${destination.label}`).addTo(map);
    }
    if (departure && destination) {
      lineRef.current = Lf.polyline(
        [[departure.lat, departure.lng], [destination.lat, destination.lng]],
        { color: '#378ADD', weight: 3, dashArray: '8 5', opacity: 0.85 }
      ).addTo(map);
      map.fitBounds([[departure.lat, departure.lng], [destination.lat, destination.lng]], { padding: [50, 50] });
    } else if (departure) {
      map.setView([departure.lat, departure.lng], 13);
    } else if (destination) {
      map.setView([destination.lat, destination.lng], 13);
    }
  }, [departure, destination]);

  return <div ref={containerRef} style={{ height: 320, width: '100%' }} />;
}

// ── Haversine ───────────────────────────────────────────────────────
function calcKm(p1, p2) {
  if (!p1 || !p2) return null;
  const R = 6371, toRad = x => x * Math.PI / 180;
  const dLat = toRad(p2.lat - p1.lat), dLng = toRad(p2.lng - p1.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ── Main export ─────────────────────────────────────────────────────
export default function MapPicker({ onConfirm }) {
  const [departure, setDeparture] = useState(null);
  const [destination, setDestination] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const km = calcKm(departure, destination);

  const handleConfirm = () => {
    if (!departure || !destination) return;
    setConfirmed(true);
    onConfirm({ departure, destination });
  };

  const handleReset = () => {
    setDeparture(null);
    setDestination(null);
    setConfirmed(false);
    onConfirm(null);
  };

  return (
    <div style={{ border: '1.5px solid #E8EAED', borderRadius: 12, overflow: 'hidden', background: 'white' }}>

      {/* Search row */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <SearchBox
            label="Point de départ"
            pinColor="#378ADD"
            value={departure}
            onSelect={p => { setDeparture(p); setConfirmed(false); onConfirm(null); }}
          />
          <SearchBox
            label="Destination"
            pinColor="#1D9E75"
            value={destination}
            onSelect={p => { setDestination(p); setConfirmed(false); onConfirm(null); }}
          />
        </div>

        {/* Info + confirm bar */}
        {departure && destination && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 10, padding: '8px 12px',
            background: confirmed ? '#F0FDF4' : '#F0F7FF',
            border: `1px solid ${confirmed ? '#A7F3D0' : '#BFDBFE'}`,
            borderRadius: 8, fontSize: 12, flexWrap: 'wrap', gap: 8,
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>📍 <strong>{departure.label}</strong></span>
              <span style={{ color: '#aaa' }}>→</span>
              <span>🏁 <strong>{destination.label}</strong></span>
              {km && <span style={{ color: '#378ADD', fontWeight: 700, background: '#DBEAFE', padding: '1px 8px', borderRadius: 10 }}>~{km} km</span>}
            </div>
            {!confirmed ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={handleReset}
                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E8EAED', background: 'white', fontSize: 11, cursor: 'pointer' }}>
                  Reset
                </button>
                <button type="button" onClick={handleConfirm}
                  style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#378ADD', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ✓ Confirmer le trajet
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#1D9E75', fontWeight: 600 }}>✅ Trajet confirmé</span>
                <button type="button" onClick={handleReset}
                  style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #E8EAED', background: 'white', fontSize: 11, cursor: 'pointer' }}>
                  Modifier
                </button>
              </div>
            )}
          </div>
        )}

        {departure && !destination && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
            🏁 Maintenant recherchez la destination...
          </div>
        )}
        {!departure && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
            💡 Tapez une adresse de départ pour commencer
          </div>
        )}
      </div>

      {/* Map */}
      <LeafletMap departure={departure} destination={destination} />
    </div>
  );
}
