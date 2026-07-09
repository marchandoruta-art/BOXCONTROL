import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import VehicleDetail from '@/pages/VehicleDetail';
import PortalView from '@/pages/PortalView';
import Settings from '@/pages/Settings';
import Team from '@/pages/Team';
import Analytics from '@/pages/Analytics';
import AcceptInvite from '@/pages/AcceptInvite';
import Appointments from '@/pages/Appointments';
import History from '@/pages/History';
import Privacidad from '@/pages/legal/Privacidad';
import Terminos from '@/pages/legal/Terminos';
import Cookies from '@/pages/legal/Cookies';
import AvisoLegal from '@/pages/legal/AvisoLegal';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster richColors position="top-right" />
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/portal/:token" element={<PortalView />} />
          <Route path="/invite/:token" element={<AcceptInvite />} />

          {/* Onboarding: requiere login pero no taller previo */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute requireOrg={false}>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          {/* App protegida */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicles/:id"
            element={
              <ProtectedRoute>
                <VehicleDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute>
                <Team />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />

          {/* Páginas legales */}
          <Route path="/legal/privacidad" element={<Privacidad />} />
          <Route path="/legal/terminos" element={<Terminos />} />
          <Route path="/legal/cookies" element={<Cookies />} />
          <Route path="/legal/aviso-legal" element={<AvisoLegal />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
