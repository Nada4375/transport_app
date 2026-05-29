import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import LandingPage from './pages/LandingPage';
import ClientDashboard from './pages/client/Dashboard';
import ClientOrders from './pages/client/Orders';
import ClientNewOrder from './pages/client/NewOrder';
import ClientMap from './pages/client/Map';
import TransporterDashboard from './pages/transporter/Dashboard';
import TransporterOrders from './pages/transporter/Orders';
import TransporterFleet from './pages/transporter/Fleet';
import TransporterMap from './pages/transporter/Map';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/Orders';
import AdminValidation from './pages/admin/Validation';
import AdminMap from './pages/admin/Map';
import Layout from './components/common/Layout';

function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <div>Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
export default function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Client routes */}
        <Route path="/client" element={<ProtectedRoute role="client"><Layout role="client" /></ProtectedRoute>}>
          <Route index element={<ClientDashboard />} />
          <Route path="orders" element={<ClientOrders />} />
          <Route path="orders/new" element={<ClientNewOrder />} />
          <Route path="map" element={<ClientMap />} />
        </Route>

        {/* Transporter routes */}
        <Route path="/transporter" element={<ProtectedRoute role="transporter"><Layout role="transporter" /></ProtectedRoute>}>
          <Route index element={<TransporterDashboard />} />
          <Route path="orders" element={<TransporterOrders />} />
          <Route path="fleet" element={<TransporterFleet />} />
          <Route path="map" element={<TransporterMap />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute role="admin"><Layout role="admin" /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="validation" element={<AdminValidation />} />
          <Route path="map" element={<AdminMap />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
