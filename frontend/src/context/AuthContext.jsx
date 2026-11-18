import React, { createContext, useState, useContext, useEffect } from 'react';
import { login as apiLogin, register as apiRegister } from '../utils/api';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!isSupabaseConfigured() || !supabase) {
      localStorage.removeItem('neurowrite_user');
      localStorage.removeItem('neurowrite_token');
      return null;
    }
    try {
      const saved = localStorage.getItem('neurowrite_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(
    () => Boolean(isSupabaseConfigured() && supabase)
  );

  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      // Restore active Supabase session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data: prof }) => {
              const u = prof || {
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
                email: session.user.email,
              };
              setUser(u);
              localStorage.setItem('neurowrite_user', JSON.stringify(u));
            });
        }
      }).finally(() => {
        setInitializing(false);
      });

      // Subscribe to real-time auth state events
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            let profile = null;
            try {
              const { data: prof } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              profile = prof;
            } catch {
              // Profile rows are best-effort; fall back to auth metadata.
            }

            const u = profile || {
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
              email: session.user.email,
            };
            setUser(u);
            localStorage.setItem('neurowrite_user', JSON.stringify(u));
            if (session.access_token) {
              localStorage.setItem('neurowrite_token', session.access_token);
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            localStorage.removeItem('neurowrite_user');
            localStorage.removeItem('neurowrite_token');
          }
        }
      );

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  const login = async (credentials, options = {}) => {
    setLoading(true);
    try {
      const res = await apiLogin(credentials, options);
      if (res.success && res.user) {
        setUser(res.user);
        localStorage.setItem('neurowrite_user', JSON.stringify(res.user));
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await apiRegister(userData);
      if (res.success && res.user) {
        setUser(res.user);
        localStorage.setItem('neurowrite_user', JSON.stringify(res.user));
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Signing out locally still clears the session below.
      }
    }
    localStorage.removeItem('neurowrite_user');
    localStorage.removeItem('neurowrite_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        loading,
        initializing,
        isAuthenticated: !!user,
        isSupabaseEnabled: isSupabaseConfigured(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
