import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Search,
  ViewGrid,
  PageUp,
  ClockRotateRight,
  Page,
  Settings,
  HalfMoon,
  SunLight,
  LogOut,
  ArrowRight,
  ScanBarcode,
} from 'iconoir-react';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getHistory } from '../../utils/api';

const OUTCOME_LABEL = {
  Elevated: 'Potential dyslexia signal',
  Typical: 'Typical pattern',
};

function toResult(row) {
  return {
    risk_score: row.riskScore,
    risk_percentage: row.riskPercentage,
    risk_category: row.category,
    screening_classification: row.screeningClassification,
    uncertainty_band: row.uncertaintyBand,
    per_fold_predictions: row.perFoldPredictions,
    models_in_ensemble: row.modelsInEnsemble,
    ink_mass_fraction: row.inkMassFraction,
    backbone: row.backbone,
  };
}

export function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);

  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const easeOut = [0.23, 1, 0.32, 1];

  useEffect(() => {
    let cancelled = false;
    getHistory()
      .then((res) => {
        if (!cancelled && Array.isArray(res?.data)) {
          setHistory(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);

      return () => {
        clearTimeout(focusTimer);
        document.body.style.overflow = '';
      };
    }

    document.body.style.overflow = '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const actions = [
    {
      id: 'nav-dash',
      title: 'Go to dashboard',
      category: 'Navigation',
      icon: ViewGrid,
      run: () => navigate('/dashboard'),
    },
    {
      id: 'nav-upload',
      title: 'Screen a new handwriting sample',
      category: 'Navigation',
      icon: PageUp,
      run: () => navigate('/upload'),
    },
    {
      id: 'nav-history',
      title: 'Open screening history',
      category: 'Navigation',
      icon: ClockRotateRight,
      run: () => navigate('/history'),
    },
    {
      id: 'nav-reports',
      title: 'Open the report page',
      category: 'Navigation',
      icon: Page,
      run: () => navigate('/report'),
    },
    {
      id: 'nav-settings',
      title: 'Account settings',
      category: 'Navigation',
      icon: Settings,
      run: () => navigate('/settings'),
    },
    {
      id: 'act-theme',
      title: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
      category: 'Actions',
      icon: theme === 'dark' ? SunLight : HalfMoon,
      run: () => toggleTheme(),
    },
    {
      id: 'act-logout',
      title: 'Sign out',
      category: 'Account',
      icon: LogOut,
      run: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const historyItems = history
    .filter((row) => Number.isFinite(row.riskScore))
    .map((row) => {
    const percent = Number.isFinite(row.riskPercentage) ? `${row.riskPercentage}%` : 'no score';
    return {
      id: `record-${row.id}`,
      title: `${row.id || 'Saved screening'} — ${
        OUTCOME_LABEL[row.category] || row.category || 'Outcome unavailable'
      } (${percent})`,
      category: 'Saved screenings',
      icon: ScanBarcode,
      run: () =>
        navigate('/result', {
          state: { result: toResult(row), filename: row.file || row.subject },
        }),
    };
  });

  const allItems = [...actions, ...historyItems];

  const filtered = allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const closePalette = () => {
    setQuery('');
    setSelectedIndex(0);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run();
        closePalette();
      }
    } else if (e.key === 'Escape') {
      closePalette();
    }
  };

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={closePalette}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
        >
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: easeOut }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-2xl overflow-hidden font-body text-on-surface"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-outline-variant/20 bg-surface-container-low">
              <Search size={20} className="text-on-surface-variant shrink-0" />

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search commands or saved screenings..."
                className="flex-1 bg-transparent border-none text-base text-on-surface placeholder:text-outline focus:outline-none"
              />

              <kbd className="px-2 py-0.5 rounded bg-surface-container text-xs font-mono text-on-surface-variant border border-outline-variant/20">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-outline-variant/10">
              {filtered.map((item, index) => {
                const isSelected = index === selectedIndex;
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => {
                      item.run();
                      closePalette();
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-surface-container-high text-on-surface'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isSelected
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        <Icon size={16} />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold truncate text-on-surface">
                          {item.title}
                        </span>

                        <span className="text-[10px] text-on-surface-variant font-medium">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    {isSelected && <ArrowRight size={14} className="text-secondary shrink-0" />}
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="py-12 text-center text-sm text-on-surface-variant">
                  No matching commands or screenings.
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-surface-container-low border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
              <span>
                Navigate:{' '}
                <kbd className="px-1 py-0.5 rounded bg-surface-container">↑</kbd>{' '}
                <kbd className="px-1 py-0.5 rounded bg-surface-container">↓</kbd>
              </span>

              <span>
                Select: <kbd className="px-1.5 py-0.5 rounded bg-surface-container">ENTER</kbd>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
