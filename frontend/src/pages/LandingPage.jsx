import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import './LandingPage.css';
import heroBg from './background.png';
import service1 from './service1.png';
import service2 from './service2.png';
import service3 from './service3.png';

const HERO_IMG = heroBg;

const SERVICE_CARDS = [
  {
    img: service1,
    tag: 'Suivi GPS',
    title: 'Tracking en Temps Réel',
    desc: 'Suivez chaque colis et chaque livreur sur la carte en direct, à la seconde près.',
  },
  {
    img: service2,
    tag: 'Gestion',
    title: 'Gestion des Commandes',
    desc: 'Créez, modifiez et supervisez toutes vos commandes depuis un tableau de bord centralisé.',
  },
  {
    img: service3,
    tag: 'Assignation',
    title: 'Assignation Automatique',
    desc: "L'administrateur valide et assigne chaque commande au transporteur disponible le plus adapté.",
  },
];

const STATS = [
  { val: '12K+', label: 'Utilisateurs actifs' },
  { val: '340K', label: 'Livraisons effectuées' },
  { val: '98%', label: 'Taux de ponctualité' },
  { val: '5K+', label: 'Véhicules gérés' },
];

const ROLES = [
  { id: 'client', label: 'Client', icon: '📦', desc: 'Créez & suivez vos demandes de livraison' },
  { id: 'transporter', label: 'Transporteur', icon: '🛵', desc: 'Gérez vos livraisons assignées' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { login, register, isLoading } = useAuthStore();

  const [authOpen, setAuthOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    phone: '',
  });

  const [navScrolled, setNavScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const resetForm = () => {
    setForm({
      username: '',
      email: '',
      password: '',
      password2: '',
      first_name: '',
      last_name: '',
      phone: '',
    });
  };

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const openAuth = (role = null) => {
    setSelectedRole(role);
    setMode('login');
    setAuthOpen(true);
    resetForm();
  };

  const closeAuth = () => {
    setAuthOpen(false);
    setSelectedRole(null);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === 'signup' && form.password !== form.password2) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      if (mode === 'login') {
        const res = await login({
          username: form.username,
          password: form.password,
        });

        const role = res?.role || res?.user?.role;

        toast.success('Bienvenue !');

        if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'transporter') {
          navigate('/transporter');
        } else {
          navigate('/client');
        }
      } else {
        await register({ ...form, role: 'client' });
        toast.success('Compte créé ! Connectez-vous.');
        setMode('login');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Une erreur est survenue.');
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    toast.success('Message envoyé !');
    setContactForm({ name: '', email: '', message: '' });
  };

  const selectedRoleInfo =
    selectedRole === 'admin'
      ? { icon: '🛡️', label: 'Admin' }
      : ROLES.find((r) => r.id === selectedRole);

  return (
    <div className="th-root">
      <nav className={`th-nav${navScrolled ? ' scrolled' : ''}`}>
        <div className="th-nav-inner">
          <div className="th-logo" onClick={() => scrollTo('hero')}>
            <span className="th-logo-text">
              Transport<strong>Hub</strong>
            </span>
          </div>

          <ul className={`th-nav-links${menuOpen ? ' open' : ''}`}>
            {[
              ['hero', 'Accueil'],
              ['services', 'Services'],
              ['statistics', 'Chiffres'],
              ['about', 'À propos'],
              ['contact', 'Contact'],
            ].map(([id, label]) => (
              <li key={id}>
                <button onClick={() => scrollTo(id)}>{label}</button>
              </li>
            ))}
          </ul>

          <div className="th-nav-actions">
            <button className="th-nav-login" onClick={() => openAuth()}>
              Connexion
            </button>
            <button className="th-nav-cta" onClick={() => openAuth()}>
              Commencer →
            </button>
          </div>

          <button className={`th-hamburger${menuOpen ? ' active' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <section id="hero" className="th-hero">
        <img
          className={`th-hero-photo${imgLoaded ? ' loaded' : ''}`}
          src={HERO_IMG}
          alt="Livraison urbaine"
          onLoad={() => setImgLoaded(true)}
        />
        <div className="th-hero-overlay" />

        <div className="th-hero-inner">
          <div className="th-hero-left">
            <p className="th-hero-eyebrow">Plateforme Logistique · 2026</p>
            <h1 className="th-hero-title">
              <span className="th-line">Transport</span>
              <span className="th-line accent">Simplifié.</span>
              <span className="th-line">Partout.</span>
            </h1>

            <p className="th-hero-sub">
              Créez vos commandes en quelques clics, l'administrateur les valide
              et les assigne au transporteur le plus adapté — il ne vous reste
              plus qu'à suivre votre livraison en temps réel sur la carte.
            </p>

            <div className="th-hero-btns">
              <button className="th-btn-fill" onClick={() => openAuth('client')}>
                Créer un compte Client
              </button>
              <button className="th-btn-outline" onClick={() => openAuth('transporter')}>
                Espace Transporteur
              </button>
            </div>
          </div>

          <div className="th-hero-right">
            <div className="th-hero-pill">
              <span className="th-pill-val">340K+</span>
              <span className="th-pill-label">Livraisons ce mois</span>
            </div>
            <div className="th-hero-pill delay">
              <span className="th-pill-val">98%</span>
              <span className="th-pill-label">Ponctualité</span>
            </div>
          </div>
        </div>

        <div className="th-ticker-wrap">
          <div className="th-ticker">
            {[
              'Suivi GPS',
              'Gestion de Flotte',
              'Assignation Intelligente',
              'Gestion des Commandes',
              'Analytiques',
              'Notifications',
              'Suivi GPS',
              'Gestion de Flotte',
              'Assignation Intelligente',
              'Gestion des Commandes',
              'Analytiques',
              'Notifications',
            ].map((t, i) => (
              <span key={i}>— {t} </span>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="th-services">
        <div className="th-container">
          <div className="th-services-header">
            <div className="th-services-title-block">
              <p className="th-eyebrow">Nos Services</p>
              <h2 className="th-section-title">
                Une plateforme,<br />
                <em>tout en un</em>
              </h2>
            </div>
            <p className="th-services-desc">
              De la création de commande à la livraison finale, TransportHub
              couvre chaque étape avec précision et transparence.
            </p>
          </div>

          <div className="th-service-grid">
            {SERVICE_CARDS.map((s, i) => (
              <div className="th-service-card" key={i}>
                <div className="th-service-img-wrap">
                  <img src={s.img} alt={s.title} loading="lazy" />
                  <span className="th-service-tag">{s.tag}</span>
                </div>
                <div className="th-service-body">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  <span className="th-service-arrow">↗</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="statistics" className="th-stats-section">
        <div className="th-container">
          <div className="th-stats-inner">
            <div className="th-stats-label">
              <p className="th-eyebrow light">Chiffres clés</p>
              <h2 className="th-section-title light">
                La plateforme<br />en <em>chiffres</em>
              </h2>
            </div>
            <div className="th-stats-grid">
              {STATS.map((s, i) => (
                <div className="th-stat" key={i}>
                  <span className="th-stat-val">{s.val}</span>
                  <span className="th-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="th-about">
        <div className="th-container">
          <div className="th-about-inner">
            <div className="th-about-img-col">
              <img src={heroBg} alt="Chauffeur livreur" loading="lazy" />
              <div className="th-about-badge">
                <span>🌍</span>
                <div>
                  <strong>Fait pour le terrain</strong>
                  <small>Conçu avec de vrais opérateurs</small>
                </div>
              </div>
            </div>

            <div className="th-about-text">
              <p className="th-eyebrow">À Propos</p>
              <h2 className="th-section-title">
                Née pour le<br />
                <em>dernier kilomètre</em>
              </h2>

              <p>
                En tant que client, vous créez vos demandes de livraison en quelques étapes.
                L'administrateur valide la commande et l'assigne au transporteur disponible le plus adapté.
              </p>

              <ul className="th-about-list">
                <li><span className="th-check">✓</span> Suivi des livraisons en temps réel</li>
                <li><span className="th-check">✓</span> Gestion centralisée des commandes</li>
                <li><span className="th-check">✓</span> Carte interactive avec Leaflet.js</li>
                <li><span className="th-check">✓</span> Communication fluide entre tous les acteurs</li>
                <li><span className="th-check">✓</span> Interface mobile-first et intuitive</li>
              </ul>

              <button className="th-btn-fill" onClick={() => openAuth('client')}>
                Créer un compte gratuit →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="th-contact">
        <div className="th-container">
          <div className="th-contact-inner">
            <div className="th-contact-left">
              <p className="th-eyebrow">Contact</p>
              <h2 className="th-section-title">
                Parlons de<br />
                <em>votre projet</em>
              </h2>
              <div className="th-contact-details">
                <a href="mailto:contact@transporthub.io">📧 contact@transporthub.io</a>
                <a href="tel:+212600000000">📞 +212 600 000 000</a>
                <span>📍 Tanger, Maroc 🇲🇦</span>
              </div>
            </div>

            <form className="th-contact-form" onSubmit={handleContactSubmit}>
              <div className="th-field-row">
                <div className="th-field">
                  <label>Nom</label>
                  <input
                    type="text"
                    placeholder="Votre nom"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  />
                </div>
                <div className="th-field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="vous@email.com"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="th-field">
                <label>Message</label>
                <textarea
                  placeholder="Décrivez votre besoin…"
                  rows={5}
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                />
              </div>

              <button type="submit" className="th-btn-fill">
                Envoyer le message →
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="th-footer">
        <div className="th-container">
          <div className="th-footer-top">
            <div className="th-logo">
              <span className="th-logo-text">
                Transport<strong>Hub</strong>
              </span>
            </div>

            <div className="th-footer-links">
              {['Services', 'Chiffres', 'À propos', 'Contact'].map((l, i) => (
                <button key={i} onClick={() => scrollTo(['services', 'statistics', 'about', 'contact'][i])}>
                  {l}
                </button>
              ))}
            </div>

            <div className="th-footer-access">
              <button onClick={() => openAuth('client')}>Accès Client</button>
              <button onClick={() => openAuth('transporter')}>Accès Transporteur</button>
            </div>
          </div>

          <div className="th-footer-bottom">
            <span>© 2025 TransportHub — Tous droits réservés.</span>
            <span>Tanger, Maroc 🇲🇦</span>
          </div>
        </div>
      </footer>

<button
  type="button"
  onClick={() => openAuth('admin')}
  style={{
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    opacity: 1,
    zIndex: 9999,
    background: '#111827',
    color: 'white',
    padding: '10px 18px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '700',
  }}
>
  Admin
</button>

      {authOpen && (
        <div className="th-overlay" onClick={(e) => e.target === e.currentTarget && closeAuth()}>
          <div className="th-modal">
            <button className="th-modal-x" onClick={closeAuth}>✕</button>

            {!selectedRole ? (
              <>
                <p className="th-modal-eyebrow">Bienvenue</p>
                <h2 className="th-modal-title">Choisissez votre rôle</h2>

                <div className="th-role-list">
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      className="th-role-item"
                      onClick={() => {
                        setSelectedRole(r.id);
                        setMode('login');
                      }}
                    >
                      <span className="th-role-icon">{r.icon}</span>
                      <div>
                        <strong>{r.label}</strong>
                        <small>{r.desc}</small>
                      </div>
                      <span className="th-role-arr">→</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="th-modal-eyebrow">
                  {selectedRoleInfo?.icon} {selectedRoleInfo?.label}
                </p>

                <h2 className="th-modal-title">
                  {mode === 'login' ? 'Se connecter' : 'Créer un compte'}
                </h2>

                <div className="th-tabs">
                  <button
                    type="button"
                    className={mode === 'login' ? 'on' : ''}
                    onClick={() => setMode('login')}
                  >
                    Connexion
                  </button>

                  {selectedRole === 'client' && (
                    <button
                      type="button"
                      className={mode === 'signup' ? 'on' : ''}
                      onClick={() => setMode('signup')}
                    >
                      Inscription
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="th-auth-form">
                  {mode === 'signup' && selectedRole === 'client' && (
                    <div className="th-row-2">
                      <input
                        placeholder="Prénom"
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      />
                      <input
                        placeholder="Nom"
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      />
                    </div>
                  )}

                  <input
                    placeholder="Nom d'utilisateur"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />

                  {mode === 'signup' && selectedRole === 'client' && (
                    <input
                      type="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  )}

                  <input
                    type="password"
                    placeholder="Mot de passe"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />

                  {mode === 'signup' && selectedRole === 'client' && (
                    <input
                      type="password"
                      placeholder="Confirmer le mot de passe"
                      value={form.password2}
                      onChange={(e) => setForm({ ...form, password2: e.target.value })}
                    />
                  )}

                  <button type="submit" className="th-btn-fill" disabled={isLoading}>
                    {isLoading
                      ? 'Chargement…'
                      : mode === 'login'
                        ? 'Se connecter →'
                        : 'Créer mon compte →'}
                  </button>
                </form>

                <button className="th-modal-back" onClick={() => setSelectedRole(null)}>
                  ← Changer de rôle
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}