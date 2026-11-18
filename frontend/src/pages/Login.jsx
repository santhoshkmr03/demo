import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Mail, Lock, ArrowUpRight, ShieldCheck, WarningTriangle } from 'iconoir-react';

export default function Login() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const easeOut = [0.23, 1, 0.32, 1];

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      addToast('Signed in successfully', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message || 'Login failed. Please verify your credentials.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalBypass = async () => {
    setError(null);
    setLoading(true);
    try {
      await login({ email, password }, { forceLocal: true });
      addToast('Signed in with local session', 'info');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message || 'Local login failed.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row bg-surface text-on-surface font-body antialiased selection:bg-secondary-container selection:text-on-secondary-container">

      {/* LEFT PANEL: Research Intelligence & Neural Kinetic Stage */}
      <div className="relative w-full lg:w-[54%] bg-surface-container-low border-r border-outline-variant/30 text-on-surface p-8 lg:p-14 flex flex-col justify-between overflow-hidden">
        {/* Subtle Ambient Depth Gradients */}
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 18% 24%, var(--color-secondary) 0%, transparent 45%), radial-gradient(circle at 82% 76%, var(--color-tertiary) 0%, transparent 50%)' }}></div>
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

        {/* Top Branding Rail */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary p-1 flex items-center justify-center font-bold text-lg shadow-sm">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl tracking-tight font-semibold text-on-surface">NeuroWrite AI</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-mono uppercase tracking-wider font-semibold">v1.0</span>
              </div>
              <p className="text-on-surface-variant text-sm font-body">Handwriting screening with visual explanations</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant/30 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping absolute"></span>
            <span className="w-2 h-2 rounded-full bg-secondary relative"></span>
            <span className="text-xs font-mono text-on-surface font-semibold">ConvNeXt-Tiny · 5-fold</span>
          </div>
        </div>

        {/* Center hero and illustrative analysis card */}
        <div className="relative z-10 my-10 lg:my-0 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/20 text-on-surface-variant text-xs font-semibold mb-4">
            <ShieldCheck size={16} className="text-secondary" />
            <span>Handwriting screening aid</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold leading-tight tracking-tight text-on-surface mb-4">
            AI-powered handwriting screening
          </h1>
          <p className="text-base sm:text-lg text-on-surface-variant mb-8 max-w-lg leading-relaxed">
            One page-level risk score from a five-fold ConvNeXt-Tiny ensemble, with attention and
            saliency overlays that show where the model looked.
          </p>

          {/* Illustrative analysis card */}
          <div className="relative p-6 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-md overflow-hidden">
            <div className="flex justify-between items-center text-xs font-mono text-on-surface-variant mb-3">
              <span className="flex items-center gap-1.5 font-semibold text-on-surface">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                ILLUSTRATIVE PAGE
              </span>
              <span className="text-on-surface-variant font-mono">one score · five folds</span>
            </div>

            {/* Stylized Handwriting Stroke + Neural Vector Bounding SVG */}
            <div className="relative w-full h-40 bg-surface-container-low border border-outline-variant/20 rounded-lg flex items-center justify-center p-2 overflow-hidden">
              <svg className="w-full h-full" fill="none" viewBox="0 0 420 130" xmlns="http://www.w3.org/2000/svg">
                <line opacity="0.3" stroke="currentColor" strokeDasharray="3 3" x1="20" x2="400" y1="95" y2="95"></line>
                <line opacity="0.2" stroke="currentColor" strokeDasharray="2 4" x1="20" x2="400" y1="45" y2="45"></line>
                <defs>
                  <linearGradient id="strokeGrad" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#2dd4bf"></stop>
                    <stop offset="45%" stopColor="#38bdf8"></stop>
                    <stop offset="80%" stopColor="#818cf8"></stop>
                    <stop offset="100%" stopColor="#14b8a6"></stop>
                  </linearGradient>
                </defs>
                <motion.path
                  initial={shouldReduceMotion ? {} : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, ease: easeOut }}
                  d="M 40 92 C 75 90, 85 28, 120 28 C 150 28, 138 98, 185 92 C 220 88, 230 40, 260 40 C 295 40, 290 102, 330 92 C 360 85, 385 68, 395 72"
                  stroke="url(#strokeGrad)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3.5"
                />
                <line stroke="#818cf8" strokeDasharray="2 2" strokeWidth="1.2" x1="110" x2="170" y1="20" y2="100"></line>
                <line stroke="#818cf8" strokeDasharray="2 2" strokeWidth="1.2" x1="245" x2="310" y1="30" y2="105"></line>
                <circle cx="120" cy="28" fill="#2dd4bf" r="4"></circle>
                <circle cx="120" cy="28" opacity="0.4" r="9" stroke="#2dd4bf" strokeWidth="1"></circle>
                <text className="font-mono font-bold" fill="#2dd4bf" fontSize="9" x="132" y="26">Apex [x:120, y:28]</text>
                <circle cx="185" cy="92" fill="#818cf8" r="3.5"></circle>
                <circle cx="260" cy="40" fill="#38bdf8" r="4.5"></circle>
                <circle cx="330" cy="92" fill="#2dd4bf" r="3"></circle>
                <rect fill="rgba(45, 212, 191, 0.05)" height="84" rx="4" stroke="#2dd4bf" strokeDasharray="4 3" strokeWidth="1.2" width="85" x="100" y="18"></rect>
                <rect fill="rgba(129, 140, 248, 0.05)" height="74" rx="4" stroke="#818cf8" strokeDasharray="4 3" strokeWidth="1.2" width="95" x="240" y="28"></rect>
              </svg>
              {/* Floating Scan Overlay Indicator */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-lowest/90 border border-outline-variant/30 rounded backdrop-blur-sm text-xs font-mono text-on-surface font-semibold shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                Illustration
              </div>
            </div>

            {/* Model facts */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <span className="block text-xs font-mono text-on-surface-variant truncate font-medium">Backbone</span>
                <span className="block text-sm font-semibold text-on-surface mt-0.5">ConvNeXt-Tiny</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <span className="block text-xs font-mono text-on-surface-variant truncate font-medium">Architecture</span>
                <span className="block text-sm font-semibold text-secondary mt-0.5">5-Fold MIL</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <span className="block text-xs font-mono text-on-surface-variant truncate font-medium">Explainability</span>
                <span className="block text-sm font-semibold text-on-surface mt-0.5">IG + Grad-CAM</span>
              </div>
            </div>

            {/* Classification Output Pills Row */}
            <div className="mt-4 pt-3 flex items-center justify-between text-xs font-mono border-t border-outline-variant/20">
              <span className="text-on-surface-variant font-medium">Outcome:</span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Typical pattern
                </span>
                <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-error"></span> Potential signal
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Institutional Trust Bottom Line */}
        <div className="relative z-10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between text-on-surface-variant text-sm gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-secondary" size={18} />
            <span className="font-medium text-on-surface">Educational screening aid</span>
          </div>
          <span className="text-xs font-mono text-on-surface-variant">Not a diagnostic tool</span>
        </div>
      </div>

      {/* RIGHT PANEL: Authentication Form & Interactive Controls */}
      <div className="w-full lg:w-[46%] bg-surface flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Top Utility Header */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-medium border border-outline-variant/20">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>NeuroWrite AI Platform</span>
          </div>
          <a href="#" className="text-secondary hover:underline transition-colors text-xs font-semibold flex items-center gap-1">
            <span>Help & Guides</span>
            <ArrowUpRight size={14} />
          </a>
        </div>

        {/* Centered Sign-In Workbench Form Area */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="mb-6">
            <h2 className="text-3xl font-semibold tracking-tight text-on-surface">Sign in</h2>
            <p className="text-sm text-on-surface-variant mt-1.5">Enter your credentials to open your screening workspace.</p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-error-container/20 border border-error/30 flex items-start gap-2.5 text-xs text-on-surface">
              <WarningTriangle size={18} className="text-error shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-error block mb-0.5">Sign In Notice</span>
                <span className="text-on-surface-variant block">{error}</span>

                {error.toLowerCase().includes('email not confirmed') && (
                  <div className="mt-3 pt-2.5 border-t border-error/20 flex flex-col gap-2">
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Supabase Cloud requires clicking the confirmation link sent to your inbox. You can either confirm via email, disable "Confirm email" in Supabase Auth settings, or continue instantly with a local session.
                    </p>
                    <button
                      type="button"
                      onClick={handleLocalBypass}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start"
                    >
                      Continue with Local Session →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              icon={Mail}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              icon={Lock}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 mt-2"
              isLoading={loading}
            >
              Sign in
            </Button>
          </form>

          <p className="text-center text-xs text-on-surface-variant mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-secondary font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        {/* Bottom Security Assurance Footnote */}
        <div className="w-full max-w-md mx-auto pt-6 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-secondary" />
            <span>Secure Authentication</span>
          </div>
          <span>v1.0</span>
        </div>
      </div>
    </div>
  );
}