import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ordersAPI } from '../../services/api';

const initialForm = {
  departure_city: '', destination_city: '',
  departure_address: '', destination_address: '',
  merchandise_type: 'electronics', quantity_kg: '',
  priority: 'standard', desired_date: '', notes: '',
};

export default function NewOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ordersAPI.create(form);
      toast.success('Order submitted! Awaiting admin validation.');
      navigate('/client/orders');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">New delivery request</h1>
      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-row">
          <div className="form-group">
            <label>Departure city</label>
            <input required placeholder="e.g. Casablanca" value={form.departure_city} onChange={e => set('departure_city', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Destination city</label>
            <input required placeholder="e.g. Rabat" value={form.destination_city} onChange={e => set('destination_city', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Pickup address</label>
          <input required placeholder="Full address" value={form.departure_address} onChange={e => set('departure_address', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Delivery address</label>
          <input required placeholder="Full address" value={form.destination_address} onChange={e => set('destination_address', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Merchandise type</label>
            <select value={form.merchandise_type} onChange={e => set('merchandise_type', e.target.value)}>
              <option value="electronics">Electronics</option>
              <option value="furniture">Furniture</option>
              <option value="food">Food products</option>
              <option value="industrial">Industrial</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Quantity (kg)</label>
            <input type="number" required min="1" placeholder="e.g. 500" value={form.quantity_kg} onChange={e => set('quantity_kg', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Desired date</label>
            <input type="date" required value={form.desired_date} onChange={e => set('desired_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}>
              <option value="standard">Standard</option>
              <option value="express">Express</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea rows={3} placeholder="Additional information..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit request'}</button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/client/orders')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
