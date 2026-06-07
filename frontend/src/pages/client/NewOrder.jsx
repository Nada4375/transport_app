import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ordersAPI } from '../../services/api';
import MapPicker from '../../components/map/MapPicker';

const initialForm = {
  merchandise_type: 'electronics',
  quantity_kg: '',
  priority: 'standard',
  desired_date: '',
  notes: '',
};

export default function NewOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleMapConfirm = (data) => {
    setMapData(data);
    if (data) toast.success('Trajet confirmé ✅');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mapData) {
      toast.error('Veuillez confirmer le trajet sur la carte.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        departure_city: mapData.departure.label,
        destination_city: mapData.destination.label,
        departure_address: mapData.departure.fullLabel || mapData.departure.label,
        destination_address: mapData.destination.fullLabel || mapData.destination.label,
        departure_point: {
          type: 'Point',
          coordinates: [mapData.departure.lng, mapData.departure.lat],
        },
        destination_point: {
          type: 'Point',
          coordinates: [mapData.destination.lng, mapData.destination.lat],
        },
      };

      await ordersAPI.create(payload);
      toast.success('Commande soumise! En attente de validation admin.');
      navigate('/client/orders');
    } catch (err) {
      const errors = err.response?.data;
      const msg = typeof errors === 'object'
        ? Object.entries(errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        : 'Erreur lors de la création.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Nouvelle demande de livraison</h1>
      <form onSubmit={handleSubmit}>

        {/* Step 1 — Map picker */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
            📍 Étape 1 — Choisir le trajet sur la carte
          </div>
          <MapPicker onConfirm={handleMapConfirm} />
          {!mapData && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#EF9F27' }}>
              ⚠️ Confirmez le trajet avant de soumettre
            </div>
          )}
          {mapData && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#1D9E75', fontWeight: 500 }}>
              ✅ {mapData.departure.label} → {mapData.destination.label}
            </div>
          )}
        </div>

        {/* Step 2 — Cargo details */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
            📦 Étape 2 — Détails de la marchandise
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Type de marchandise</label>
              <select value={form.merchandise_type} onChange={e => set('merchandise_type', e.target.value)}>
                <option value="electronics">Électronique</option>
                <option value="furniture">Mobilier</option>
                <option value="food">Produits alimentaires</option>
                <option value="industrial">Industriel</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div className="form-group">
              <label>Quantité (kg)</label>
              <input
                type="number" required min="1" placeholder="ex: 500"
                value={form.quantity_kg}
                onChange={e => set('quantity_kg', e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date souhaitée</label>
              <input
                type="date" required
                value={form.desired_date}
                onChange={e => set('desired_date', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Priorité</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="standard">Standard</option>
                <option value="express">Express</option>
                <option value="urgent">Urgent 🔴</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              rows={3}
              placeholder="Instructions spéciales, fragile, température..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>

        {/* Summary */}
        {mapData && form.quantity_kg && (
          <div className="card" style={{ marginBottom: 16, background: '#F0FDF4', border: '1px solid #A7F3D0' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>📋 Récapitulatif</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
              <div>📍 <strong>{mapData.departure.label}</strong></div>
              <div>🏁 <strong>{mapData.destination.label}</strong></div>
              <div>📦 <strong>{form.merchandise_type} — {form.quantity_kg} kg</strong></div>
              <div>📅 <strong>{form.desired_date}</strong></div>
              <div>⚡ Priorité: <strong>{form.priority}</strong></div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            style={{ flex: 1, padding: 11, fontSize: 14 }}
            disabled={loading || !mapData}
          >
            {loading ? '⏳ Envoi en cours...' : '🚀 Soumettre la demande'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/client/orders')}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
