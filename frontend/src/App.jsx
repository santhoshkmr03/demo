import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/layout/AppLayout';
import { Spinner } from './components/ui/Spinner';

// Route-level code splitting: the shell stays eager, every page loads on demand.
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Upload = lazy(() => import('./pages/Upload'));
const Processing = lazy(() => import('./pages/Processing'));
const Result = lazy(() => import('./pages/Result'));
const History = lazy(() => import('./pages/History'));
const Report = lazy(() => import('./pages/Report'));
const Settings = lazy(() => import('./pages/Settings'));

function PageFallback() {
  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-3 bg-surface text-on-surface font-body">
      <Spinner />
      <span className="text-sm text-on-surface-variant">Loading page…</span>
    </div>
  );
}

function RequireAuth({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface text-on-surface font-body">
        <Spinner />
        <span className="text-sm text-on-surface-variant">Restoring your session…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const easeOut = [0.23, 1, 0.32, 1];

  const isPublicAuth = ['/', '/login', '/signup'].includes(location.pathname);

  return (
    <Suspense fallback={<PageFallback />}>
      <AnimatePresence mode="wait" initial={false}>
      {isPublicAuth ? (
        <motion.div
          key={location.pathname}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "scale(0.99)" }}
          animate={{ opacity: 1, transform: "scale(1)" }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "scale(0.99)" }}
          transition={{ duration: 0.18, ease: easeOut }}
          className="w-full min-h-screen"
        >
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </motion.div>
      ) : (
        <Routes location={location}>
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/processing" element={<Processing />} />
            <Route path="/result" element={<Result />} />
            <Route path="/history" element={<History />} />
            <Route path="/report" element={<Report />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AnimatedRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
