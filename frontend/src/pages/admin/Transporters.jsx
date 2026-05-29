import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import './Transporter.css';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  Star,
  RefreshCcw,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import { transportersAPI } from '../../services/api';
import '../transporter/Transporter.css';

export default function AdminTransporters() {
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    try {
      const res = await transportersAPI.list();
      const data = res.data.results || res.data || [];
      setTransporters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('LOAD TRANSPORTERS ERROR:', err.response?.data || err.message);
      toast.error('Impossible de charger les transporteurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title">Gestion des Transporteurs</h1>
          <p className="tp-page-sub">
            {transporters.length} transporteur{transporters.length !== 1 ? 's' : ''} enregistré{transporters.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button className="tp-btn-secondary" onClick={load}>
          <RefreshCcw size={15} />
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="tp-empty">Chargement des transporteurs...</div>
      ) : transporters.length === 0 ? (
        <div className="tp-empty">Aucun transporteur trouvé.</div>
      ) : (
        <div className="tp-transporters-grid">
          {transporters.map((t) => (
            <div key={t.id} className="tp-transporter-card">
              <div className="tp-transporter-top">
                <div className="tp-transporter-icon">
                  <Building2 size={26} />
                </div>

                <div>
                  <h2>{t.company_name || '—'}</h2>
                  <p>@{t.username || t.user || '—'}</p>
                </div>
              </div>

              <div className="tp-transporter-info">
                <div>
                  <User size={15} />
                  <span>{t.responsable_name || '—'}</span>
                </div>

                <div>
                  <Phone size={15} />
                  <span>{t.phone || '—'}</span>
                </div>

                <div>
                  <Mail size={15} />
                  <span>{t.email || '—'}</span>
                </div>

                <div>
                  <MapPin size={15} />
                  <span>
                    {t.city || '—'}
                    {t.local_address ? ` · ${t.local_address}` : ''}
                  </span>
                </div>

                <div>
                  <Star size={15} />
                  <span>Note : {t.rating || '—'} / 5</span>
                </div>
              </div>

              <div className="tp-transporter-footer">
                <span className={`tp-badge ${t.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                  {t.status === 'active' ? 'Actif' : t.status || '—'}
                </span>

                <span className={`tp-badge ${t.is_available ? 'badge-green' : 'badge-red'}`}>
                  {t.is_available ? (
                    <>
                      <CheckCircle size={12} /> Disponible
                    </>
                  ) : (
                    <>
                      <XCircle size={12} /> Indisponible
                    </>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}