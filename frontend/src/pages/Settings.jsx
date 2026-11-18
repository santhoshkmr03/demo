import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from '../components/ui/Button';
import {
  NavArrowRight,
  Shield,
  PageEdit,
  HalfMoon,
  SunLight,
  Lock,
  Page,
  LogOut,
  Database,
  Trash,
  Check,
} from 'iconoir-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured } from '../utils/supabase';

const LOCAL_HISTORY_KEY = 'neurowrite_local_history';

function readLocalCount() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]').length;
  } catch {
    return 0;
  }
}

export default function Settings() {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const easeOut = [0.23, 1, 0.32, 1];

  const [activeTab, setActiveTab] = useState('profile');
  const [localCount, setLocalCount] = useState(readLocalCount);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClearLocal = () => {
    if (!window.confirm('Delete the screenings saved in this browser? This cannot be undone.')) {
      return;
    }
    localStorage.removeItem(LOCAL_HISTORY_KEY);
    setLocalCount(0);
    addToast('Local screening history cleared', 'success');
  };

  const tabs = [
    { id: 'profile', name: 'Account', icon: PageEdit },
    { id: 'storage', name: 'Storage', icon: Database },
    { id: 'preferences', name: 'Preferences', icon: Shield },
    { id: 'data', name: 'Data', icon: Page },
  ];

  return (
    <div className="flex flex-col w-full pb-16 gap-8 pt-4 font-body text-on-surface max-w-[1200px] mx-auto">
      <section className="flex flex-col gap-2 pb-2">
        <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-mono text-xs w-fit">
          <Shield size={14} className="text-secondary" />
          <span>ACCOUNT</span>
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-on-surface">Settings</h1>
        <p className="text-base text-on-surface-variant max-w-2xl">
          Your account, where screenings are stored, and display preferences.
        </p>
      </section>

      <div className="flex items-center gap-6 border-b border-outline-variant/30 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-3 px-1 text-sm font-semibold transition-colors cursor-pointer select-none whitespace-nowrap flex items-center gap-2 ${
                isActive ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <tab.icon
                size={16}
                className={isActive ? 'text-secondary' : 'text-on-surface-variant'}
              />
              <span>{tab.name}</span>
              {isActive && (
                <motion.div
                  layoutId="activeSettingsTabLine"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-secondary"
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 500, damping: 35 }
                  }
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={
            shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }
          }
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          exit={
            shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-6px)' }
          }
          transition={{ duration: 0.16, ease: easeOut }}
          className="flex flex-col gap-6"
        >
          {activeTab === 'profile' && (
            <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm flex flex-col gap-6 border border-outline-variant/30">
              <div className="flex flex-col gap-1 border-b border-outline-variant/20 pb-4">
                <h2 className="text-2xl text-on-surface font-semibold tracking-tight">Account</h2>
                <p className="text-sm text-on-surface-variant">
                  The identity this session is signed in with.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 rounded-xl bg-surface-container-low border border-outline-variant/20">
                <div className="w-20 h-20 rounded-full shadow-sm bg-primary text-on-primary flex items-center justify-center text-2xl font-bold">
                  {user?.name
                    ? user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                    : 'U'}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold text-on-surface">
                    {user?.name || 'Signed-in user'}
                  </span>
                  <span className="text-sm text-on-surface-variant">{user?.email || 'No email'}</span>
                  <span className="text-xs font-mono text-on-surface-variant">
                    {isSupabaseConfigured()
                      ? 'Supabase account'
                      : 'Local session (no Supabase configured)'}
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Lock size={18} className="text-secondary" />
                  <h3 className="text-base font-semibold text-on-surface">Password</h3>
                </div>
                <p className="text-sm text-on-surface-variant">
                  {isSupabaseConfigured()
                    ? 'Your password is managed by Supabase Auth. Change it from the Supabase dashboard or a password reset flow.'
                    : 'Supabase Auth is not configured, so this build uses the local demo session. There is no password to change here.'}
                </p>
              </div>

              <div className="flex justify-end">
                <Button variant="secondary" icon={LogOut} onClick={handleLogout}>
                  Sign out
                </Button>
              </div>
            </section>
          )}

          {activeTab === 'storage' && (
            <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm flex flex-col gap-6 border border-outline-variant/30">
              <div className="flex flex-col gap-1 border-b border-outline-variant/20 pb-4">
                <h2 className="text-2xl text-on-surface font-semibold tracking-tight">Storage</h2>
                <p className="text-sm text-on-surface-variant">
                  Where completed screenings are written.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-surface-container-low flex flex-col gap-4 border border-outline-variant/20">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-on-surface text-lg font-semibold">
                    <Database size={20} className="text-secondary" />
                    <span>Supabase</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-semibold ${
                      isSupabaseConfigured()
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSupabaseConfigured() ? 'bg-secondary' : 'bg-outline'
                      }`}
                    />
                    {isSupabaseConfigured() ? 'Configured' : 'Not configured'}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {isSupabaseConfigured()
                    ? 'Screening records are written to public.screenings with row-level security, scoped to the signed-in user.'
                    : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to sync screenings across devices. Without them, records stay in this browser.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20">
                    <span className="text-on-surface-variant block text-[10px]">TABLE</span>
                    <span className="text-on-surface font-semibold">public.screenings</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20">
                    <span className="text-on-surface-variant block text-[10px]">LOCAL RECORDS</span>
                    <span className="text-on-surface font-semibold">{localCount}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-4 border border-outline-variant/20">
                <div>
                  <h3 className="text-base font-semibold text-on-surface">
                    Screenings saved in this browser
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {localCount === 0
                      ? 'No local records.'
                      : `${localCount} record${localCount === 1 ? '' : 's'} stored in localStorage.`}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  icon={Trash}
                  onClick={handleClearLocal}
                  disabled={localCount === 0}
                  className="text-error border-error/30 hover:bg-error-container/20 hover:border-error/40"
                >
                  Clear local history
                </Button>
              </div>
            </section>
          )}

          {activeTab === 'preferences' && (
            <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm flex flex-col gap-6 border border-outline-variant/30">
              <div className="flex flex-col gap-1 border-b border-outline-variant/20 pb-4">
                <h2 className="text-2xl text-on-surface font-semibold tracking-tight">Preferences</h2>
                <p className="text-sm text-on-surface-variant">Display settings for this browser.</p>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/20">
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">Theme</h4>
                  <p className="text-xs text-on-surface-variant">
                    Currently using the {theme} theme. The choice is remembered in this browser.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={theme === 'dark' ? SunLight : HalfMoon}
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
                </Button>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed flex items-center gap-1.5">
                <Check size={14} className="text-secondary" />
                Results use the threshold and fields returned by the screening service; there are
                no local display overrides.
              </p>
            </section>
          )}

          {activeTab === 'data' && (
            <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm flex flex-col gap-6 border border-outline-variant/30">
              <div className="flex flex-col gap-1 border-b border-outline-variant/20 pb-4">
                <h2 className="text-2xl text-on-surface font-semibold tracking-tight">
                  Data & privacy
                </h2>
                <p className="text-sm text-on-surface-variant">
                  What a screening stores, and what it does not.
                </p>
              </div>
              <ul className="text-sm text-on-surface-variant leading-relaxed space-y-2 list-disc pl-5">
                <li>
                  A record stores the generated ID, date, sample filename, binary outcome, risk
                  score and percentage, the uncertainty band, per-fold scores, ensemble size, ink
                  mass fraction, and backbone.
                </li>
                <li>
                  The uploaded image itself is sent to the screening service for inference and is
                  not stored with the record.
                </li>
                <li>
                  No student identifiers are required. The optional student ID and examiner name on
                  the report page are only used for the PDF.
                </li>
                <li>
                  Deleting browser records is immediate. Supabase records can be deleted from the
                  Supabase dashboard or by the account owner through row-level security.
                </li>
              </ul>
              <div className="p-4 rounded-xl bg-error-container/20 border border-error/30 text-xs text-on-surface-variant leading-relaxed">
                A screening result is an educational aid. It is not a diagnosis and must not be
                used as the sole basis for placement or support decisions.
              </div>
              <div className="flex justify-between items-center">
                <button
                  onClick={() => navigate('/history')}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:underline cursor-pointer"
                >
                  Open screening history <NavArrowRight size={14} />
                </button>
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
