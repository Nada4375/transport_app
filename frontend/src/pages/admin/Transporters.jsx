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
  Truck,
  Users,
} from 'lucide-react';

import {
  transportersAPI,
  vehiclesAPI,
  driversAPI,
} from '../../services/api';
import '../transporter/Transporter.css';

function getTransporterId(item) {
  const raw =
    item?.transporter_id ??
    item?.transporter ??
    item?.transporter?.id ??
    item?.owner_id ??
    item?.owner?.id;

  return raw == null ? null : Number(raw);
}

export default function AdminTransporters() {
  const [transporters, setTransporters] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    try {
      const [tRes, vRes, dRes] = await Promise.allSettled([
        transportersAPI.list(),
        vehiclesAPI.list(),
        driversAPI.list(),
      ]);

      if (tRes.status === 'fulfilled') {
        const data = tRes.value.data.results || tRes.value.data || [];
        setTransporters(Array.isArray(data) ? data : []);
      } else {
        console.error('LOAD TRANSPORTERS ERROR:', tRes.reason?.response?.data || tRes.reason?.message);
        toast.error('Impossible de charger les transporteurs.');
      }

      if (vRes.status === 'fulfilled') {
        const data = vRes.value.data.results || vRes.value.data || [];
        setVehicles(Array.isArray(data) ? data : []);
      }

      if (dRes.status === 'fulfilled') {
        const data = dRes.value.data.results || dRes.value.data || [];
        setDrivers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('LOAD ADMIN TRANSPORTERS ERROR:', err.response?.data || err.message);
      toast.error('Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const countVehicles = (t) => {
    const apiCount = t.vehicles_count ?? t.total_vehicles ?? t.vehicle_count;
    if (apiCount !== undefined && apiCount !== null) return apiCount;
    return vehicles.filter((v) => getTransporterId(v) === Number(t.id)).length;
  };

  const countDrivers = (t) => {
    const apiCount = t.drivers_count ?? t.total_drivers ?? t.driver_count;
    if (apiCount !== undefined && apiCount !== null) return apiCount;
    return drivers.filter((d) => getTransporterId(d) === Number(t.id)).length;
  };

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
          {transporters.map((t) => {
            const vehicleTotal = countVehicles(t);
            const driverTotal = countDrivers(t);

            return (
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

                <div className="tp-transporter-mini-stats">
                  <div>
                    <Truck size={16} />
                    <strong>{vehicleTotal}</strong>
                    <span>Véhicule{Number(vehicleTotal) > 1 ? 's' : ''}</span>
                  </div>

                  <div>
                    <Users size={16} />
                    <strong>{driverTotal}</strong>
                    <span>Chauffeur{Number(driverTotal) > 1 ? 's' : ''}</span>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
