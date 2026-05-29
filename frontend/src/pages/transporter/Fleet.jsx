import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { vehiclesAPI, driversAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Truck, User, Plus, Pencil, Trash2, Search, X, MapPin, RefreshCw
} from 'lucide-react';
import './Transporter.css';

const VEHICLE_STATUSES = ['available', 'on_mission', 'maintenance', 'idle'];
const DRIVER_STATUSES = ['available', 'on_delivery', 'offline'];
const VEHICLE_TYPES = ['truck', 'van', 'semi', 'pickup'];

const TYPE_LABEL = {
  truck: 'Camion',
  van: 'Van',
  semi: 'Semi-remorque',
  pickup: 'Pickup',
};

const BADGE = {
  available: 'badge-green',
  on_mission: 'badge-blue',
  on_delivery: 'badge-blue',
  maintenance: 'badge-red',
  idle: 'badge-gray',
  offline: 'badge-gray',
};

const LABEL = {
  available: 'Disponible',
  on_mission: 'En mission',
  on_delivery: 'En livraison',
  maintenance: 'Maintenance',
  idle: 'Inactif',
  offline: 'Hors ligne',
};

const emptyVehicle = {
  plate_number: '',
  brand: '',
  model: '',
  vehicle_type: 'van',
  capacity_kg: '',
  year: '',
  status: 'available',
};

const emptyDriver = {
  first_name: '',
  last_name: '',
  phone: '',
  license_number: '',
  status: 'available',
};

export default function Fleet() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'vehicles');

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editTarget, setEditTarget] = useState(null);

  const [vForm, setVForm] = useState(emptyVehicle);
  const [dForm, setDForm] = useState(emptyDriver);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);

    try {
      const [vRes, dRes] = await Promise.allSettled([
        vehiclesAPI.list(),
        driversAPI.list(),
      ]);

      if (vRes.status === 'fulfilled') {
        const data = vRes.value.data.results || vRes.value.data;
        setVehicles(Array.isArray(data) ? data : []);
      } else {
        console.error('LOAD VEHICLES ERROR:', vRes.reason?.response?.data || vRes.reason?.message);
        toast.error('Impossible de charger les véhicules.');
      }

      if (dRes.status === 'fulfilled') {
        const data = dRes.value.data.results || dRes.value.data;
        setDrivers(Array.isArray(data) ? data : []);
      } else {
        console.error('LOAD DRIVERS ERROR:', dRes.reason?.response?.data || dRes.reason?.message);
        toast.error('Impossible de charger les chauffeurs.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setModalMode('add');
    setEditTarget(null);

    if (tab === 'vehicles') {
      setVForm(emptyVehicle);
    } else {
      setDForm(emptyDriver);
    }

    setShowModal(true);
  };

  const openEdit = (item) => {
    setModalMode('edit');
    setEditTarget(item);

    if (tab === 'vehicles') {
      setVForm({ ...emptyVehicle, ...item });
    } else {
      setDForm({ ...emptyDriver, ...item });
    }

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    setSaving(false);
  };

  const filteredVehicles = vehicles.filter((v) => {
    const q = search.toLowerCase();

    return (
      (
        (v.plate_number || '').toLowerCase().includes(q) ||
        (v.vehicle_type || '').toLowerCase().includes(q) ||
        (v.brand || '').toLowerCase().includes(q) ||
        (v.model || '').toLowerCase().includes(q)
      ) &&
      (statusFilter === 'all' || v.status === statusFilter)
    );
  });

  const filteredDrivers = drivers.filter((d) => {
    const q = search.toLowerCase();

    return (
      (
        `${d.first_name || ''} ${d.last_name || ''}`.toLowerCase().includes(q) ||
        (d.phone || '').includes(q) ||
        (d.license_number || '').toLowerCase().includes(q)
      ) &&
      (statusFilter === 'all' || d.status === statusFilter)
    );
  });

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...vForm,
        capacity_kg: Number(vForm.capacity_kg),
        year: vForm.year ? Number(vForm.year) : null,
      };

      if (modalMode === 'add') {
        const res = await vehiclesAPI.create(payload);
        setVehicles((prev) => [res.data, ...prev]);
        toast.success('Véhicule ajouté avec succès.');
      } else {
        const res = await vehiclesAPI.update(editTarget.id, payload);
        setVehicles((prev) =>
          prev.map((x) => (x.id === editTarget.id ? res.data : x))
        );
        toast.success('Véhicule modifié.');
      }

      closeModal();
    } catch (err) {
      console.error('SAVE VEHICLE ERROR:', err.response?.data || err.message);

      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(' ')
        : 'Erreur lors de la sauvegarde.';

      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDriver = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = { ...dForm };

      if (modalMode === 'add') {
        const res = await driversAPI.create(payload);
        setDrivers((prev) => [res.data, ...prev]);
        toast.success('Chauffeur ajouté avec succès.');
      } else {
        const res = await driversAPI.update(editTarget.id, payload);
        setDrivers((prev) =>
          prev.map((x) => (x.id === editTarget.id ? res.data : x))
        );
        toast.success('Chauffeur modifié.');
      }

      closeModal();
    } catch (err) {
      console.error('SAVE DRIVER ERROR:', err.response?.data || err.message);

      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(' ')
        : 'Erreur lors de la sauvegarde.';

      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Supprimer ce véhicule définitivement ?')) return;

    try {
      await vehiclesAPI.delete(id);
      setVehicles((prev) => prev.filter((x) => x.id !== id));
      toast.success('Véhicule supprimé.');
    } catch (err) {
      console.error('DELETE VEHICLE ERROR:', err.response?.data || err.message);
      toast.error('Impossible de supprimer ce véhicule.');
    }
  };

  const handleDeleteDriver = async (id) => {
    if (!window.confirm('Supprimer ce chauffeur définitivement ?')) return;

    try {
      await driversAPI.delete(id);
      setDrivers((prev) => prev.filter((x) => x.id !== id));
      toast.success('Chauffeur supprimé.');
    } catch (err) {
      console.error('DELETE DRIVER ERROR:', err.response?.data || err.message);
      toast.error('Impossible de supprimer ce chauffeur.');
    }
  };

  const handleStatusVehicle = async (id, newStatus) => {
    try {
      await vehiclesAPI.update(id, { status: newStatus });

      setVehicles((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: newStatus } : x))
      );

      toast.success('Statut véhicule mis à jour.');
    } catch (err) {
      console.error('STATUS VEHICLE ERROR:', err.response?.data || err.message);
      toast.error('Impossible de modifier le statut.');
    }
  };

  const handleStatusDriver = async (id, newStatus) => {
    try {
      await driversAPI.update(id, { status: newStatus });

      setDrivers((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: newStatus } : x))
      );

      toast.success('Statut chauffeur mis à jour.');
    } catch (err) {
      console.error('STATUS DRIVER ERROR:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || 'Impossible de modifier le statut.');
    }
  };

  return (
    <div className="tp-page">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title">Flotte & Chauffeurs</h1>
          <p className="tp-page-sub">
            {vehicles.length} véhicule{vehicles.length !== 1 ? 's' : ''} ·{' '}
            {drivers.length} chauffeur{drivers.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="tp-header-actions">
          <button className="tp-btn-secondary" onClick={loadData} title="Actualiser">
            <RefreshCw size={15} />
          </button>

          <button className="tp-btn-primary" onClick={openAdd}>
            <Plus size={16} />
            {tab === 'vehicles' ? 'Ajouter un véhicule' : 'Ajouter un chauffeur'}
          </button>
        </div>
      </div>

      <div className="tp-tabs">
        <button
          className={tab === 'vehicles' ? 'active' : ''}
          onClick={() => setTab('vehicles')}
        >
          <Truck size={15} strokeWidth={1.8} /> Véhicules
          <span className="tp-tab-count">{vehicles.length}</span>
        </button>

        <button
          className={tab === 'drivers' ? 'active' : ''}
          onClick={() => setTab('drivers')}
        >
          <User size={15} strokeWidth={1.8} /> Chauffeurs
          <span className="tp-tab-count">{drivers.length}</span>
        </button>
      </div>

      <div className="tp-filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--mist)',
              pointerEvents: 'none',
            }}
          />

          <input
            className="tp-search"
            style={{ paddingLeft: 40 }}
            placeholder={tab === 'vehicles' ? 'Matricule, type…' : 'Nom, téléphone…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="tp-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tous les statuts</option>

          {(tab === 'vehicles' ? VEHICLE_STATUSES : DRIVER_STATUSES).map((s) => (
            <option key={s} value={s}>
              {LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {tab === 'vehicles' && (
        <div className="tp-card">
          <div className="tp-table-wrap">
            <table className="tp-table">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Marque / Modèle</th>
                  <th>Type</th>
                  <th>Capacité</th>
                  <th>Année</th>
                  <th>Statut</th>
                  <th>Dernière position</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="tp-td-center">Chargement…</td>
                  </tr>
                ) : filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="tp-td-center tp-td-muted">
                      Aucun véhicule trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => (
                    <tr key={v.id}>
                      <td><span className="tp-code">{v.plate_number}</span></td>
                      <td>{v.brand || '—'} {v.model || ''}</td>
                      <td>{TYPE_LABEL[v.vehicle_type] || v.vehicle_type}</td>
                      <td>{v.capacity_kg ? `${v.capacity_kg} kg` : '—'}</td>
                      <td>{v.year || '—'}</td>

                      <td>
                        <span className={`tp-badge ${BADGE[v.status] || 'badge-gray'}`}>
                          {LABEL[v.status] || v.status}
                        </span>
                      </td>

                      <td className="tp-td-muted">
                        {v.current_latitude && v.current_longitude ? (
                          <span><MapPin size={12} /> GPS disponible</span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td>
                        <div className="tp-actions">
                          <button className="tp-action-btn edit" onClick={() => openEdit(v)}>
                            <Pencil size={14} />
                          </button>

                          <select
                            className="tp-status-select"
                            value={v.status}
                            onChange={(e) => handleStatusVehicle(v.id, e.target.value)}
                            disabled={v.status === 'on_mission'}
                          >
                            {VEHICLE_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {LABEL[s]}
                              </option>
                            ))}
                          </select>

                          <button
                            className="tp-action-btn delete"
                            onClick={() => handleDeleteVehicle(v.id)}
                            disabled={v.status === 'on_mission'}
                            title={v.status === 'on_mission' ? 'Véhicule en mission' : 'Supprimer'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'drivers' && (
        <div className="tp-card">
          <div className="tp-table-wrap">
            <table className="tp-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Téléphone</th>
                  <th>N° Permis</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="tp-td-center">Chargement…</td>
                  </tr>
                ) : filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="tp-td-center tp-td-muted">
                      Aucun chauffeur trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <div className="tp-user-cell">
                          <div className="tp-avatar">
                            {(d.first_name || 'C')[0].toUpperCase()}
                          </div>
                          <strong>{d.first_name} {d.last_name}</strong>
                        </div>
                      </td>

                      <td className="tp-td-muted">{d.phone || '—'}</td>

                      <td className="tp-td-muted">
                        {d.license_number ? (
                          <span className="tp-code">{d.license_number}</span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td>
                        <span className={`tp-badge ${BADGE[d.status] || 'badge-gray'}`}>
                          {LABEL[d.status] || d.status}
                        </span>
                      </td>

                      <td>
                        <div className="tp-actions">
                          <button className="tp-action-btn edit" onClick={() => openEdit(d)}>
                            <Pencil size={14} />
                          </button>

                          <select
                            className="tp-status-select"
                            value={d.status}
                            onChange={(e) => handleStatusDriver(d.id, e.target.value)}
                            disabled={d.status === 'on_delivery'}
                          >
                            {DRIVER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {LABEL[s]}
                              </option>
                            ))}
                          </select>

                          <button
                            className="tp-action-btn delete"
                            onClick={() => handleDeleteDriver(d.id)}
                            disabled={d.status === 'on_delivery'}
                            title={d.status === 'on_delivery' ? 'Chauffeur en livraison' : 'Supprimer'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="tp-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="tp-modal">
            <button className="tp-modal-x" onClick={closeModal}>
              <X size={14} />
            </button>

            <h2 className="tp-modal-title">
              {modalMode === 'add'
                ? tab === 'vehicles'
                  ? 'Nouveau véhicule'
                  : 'Nouveau chauffeur'
                : tab === 'vehicles'
                  ? 'Modifier le véhicule'
                  : 'Modifier le chauffeur'}
            </h2>

            {tab === 'vehicles' ? (
              <form onSubmit={handleSaveVehicle} className="tp-form">
                <div className="tp-form-group">
                  <label>Matricule *</label>
                  <input
                    required
                    placeholder="ex: 12345-A-6"
                    value={vForm.plate_number}
                    onChange={(e) => setVForm({ ...vForm, plate_number: e.target.value })}
                  />
                </div>

                <div className="tp-form-group">
                  <label>Marque *</label>
                  <input
                    required
                    placeholder="ex: Mercedes"
                    value={vForm.brand || ''}
                    onChange={(e) => setVForm({ ...vForm, brand: e.target.value })}
                  />
                </div>

                <div className="tp-form-group">
                  <label>Modèle *</label>
                  <input
                    required
                    placeholder="ex: Sprinter"
                    value={vForm.model || ''}
                    onChange={(e) => setVForm({ ...vForm, model: e.target.value })}
                  />
                </div>

                <div className="tp-form-group">
                  <label>Type *</label>
                  <select
                    value={vForm.vehicle_type}
                    onChange={(e) => setVForm({ ...vForm, vehicle_type: e.target.value })}
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tp-form-group">
                  <label>Capacité (kg) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="ex: 1500"
                    value={vForm.capacity_kg}
                    onChange={(e) => setVForm({ ...vForm, capacity_kg: e.target.value })}
                  />
                </div>

                <div className="tp-form-group">
                  <label>Année</label>
                  <input
                    type="number"
                    min="1990"
                    max="2030"
                    placeholder="ex: 2022"
                    value={vForm.year || ''}
                    onChange={(e) => setVForm({ ...vForm, year: e.target.value })}
                  />
                </div>

                <button type="submit" className="tp-btn-primary full" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSaveDriver} className="tp-form">
                <div className="tp-form-group">
                  <label>Prénom *</label>
                  <input
                    required
                    value={dForm.first_name}
                    onChange={(e) => setDForm({ ...dForm, first_name: e.target.value })}
                  />
                </div>

                <div className="tp-form-group">
                  <label>Nom *</label>
                  <input
                    required
                    value={dForm.last_name}
                    onChange={(e) => setDForm({ ...dForm, last_name: e.target.value })}
                  />
                </div>

                <div className="tp-form-group">
                  <label>Téléphone</label>
                  <input
                    placeholder="ex: +212 600 000 000"
                    value={dForm.phone}
                    onChange={(e) => setDForm({ ...dForm, phone: e.target.value })}
                  />
                </div>

                <div className="tp-form-group">
                  <label>N° Permis *</label>
                  <input
                    required
                    placeholder="ex: P-12345-6"
                    value={dForm.license_number || ''}
                    onChange={(e) => setDForm({ ...dForm, license_number: e.target.value })}
                  />
                </div>

                <button type="submit" className="tp-btn-primary full" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}