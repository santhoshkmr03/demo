import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Mail, Lock, User, City, ArrowRight, WarningTriangle } from 'iconoir-react';

export default function Signup() {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', institution: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await register({ email: form.email, password: form.password, name: form.name, institution: form.institution });
      if (res?.requiresEmailConfirmation) {
        addToast('Account created! Please check your email to confirm, or continue exploring.', 'info');
      } else {
        addToast('Account created successfully!', 'success');
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message || 'Registration failed. Please check your information.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center p-6 sm:p-10 font-body text-on-surface">
      <div className="w-full max-w-md mx-auto py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-on-primary font-bold text-xl mb-4 shadow-sm">
            N
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-on-surface">Create an account</h2>          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
            Sign up to screen handwriting samples and keep a history of results.
          </p>
        </div>

        <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-outline-variant/40 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-error-container/20 border border-error/30 flex items-start gap-2.5 text-xs text-on-surface">
              <WarningTriangle size={16} className="text-error shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-error block">Registration Notice</span>
                <span className="text-on-surface-variant">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              icon={User}
              placeholder="Your Name"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              required
            />
            <Input
              label="Organization / School (Optional)"
              type="text"
              icon={City}
              placeholder="School or Organization"
              value={form.institution}
              onChange={e => setForm({...form, institution: e.target.value})}
            />
            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              required
            />
            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="••••••••••••"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required
            />
            <Button type="submit" variant="primary" className="w-full py-2.5 mt-2" isLoading={loading}>
              <span>Create account</span>
              <ArrowRight size={16} />
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-on-surface-variant mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-secondary font-semibold hover:underline transition-colors ml-1">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}