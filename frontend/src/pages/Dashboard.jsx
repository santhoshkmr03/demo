import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dropzone } from '../components/domain/Dropzone';
import { getHistory } from '../utils/api';
import {
  ShieldCheck,
  OpenBook,
  ClockRotateRight,
  CloudUpload,
  GraphUp,
  ScanBarcode,
  Filter,
  Network,
  ElectronicsChip,
  NavArrowRight,
  WarningTriangle,
  CheckCircle,
} from 'iconoir-react';
import { ProtocolModal } from '../components/domain/ProtocolModal';

const OUTCOME_LABEL = {
  Elevated: 'Potential dyslexia signal',
  Typical: 'Typical pattern',
};

function formatDate(value) {
  if (!value) return '—';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const easeOut = [0.23, 1, 0.32, 1];

  const [history, setHistory] = useState([]);
  const [isProtocolOpen, setIsProtocolOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHistory().then((res) => {
      if (!cancelled) setHistory(res?.data || []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const scored = history.filter((row) => Number.isFinite(row.riskScore));
    return {
      total: history.length,
      elevated: history.filter((row) => row.category === 'Elevated').length,
      typical: history.filter((row) => row.category === 'Typical').length,
      meanRisk:
        scored.length > 0
          ? scored.reduce((sum, row) => sum + row.riskScore, 0) / scored.length
          : null,
    };
  }, [history]);

  const recent = history.slice(0, 5);

  return (
    <div className="flex flex-col w-full gap-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-semibold text-on-surface">
              {user?.name ? `Welcome, ${user.name}` : 'Welcome back'}
            </span>
          </div>
          <p className="font-body text-base text-on-surface-variant mt-1">
            Screen a handwriting sample for a page-level dyslexia risk estimate, or review earlier
            screenings.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setIsProtocolOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-low shadow-sm transition-all font-medium text-sm border border-outline-variant/20 cursor-pointer"
          >
            <OpenBook size={18} className="text-secondary" />
            <span>Screening guide</span>
          </button>
          <Button variant="accent" icon={CloudUpload} onClick={() => navigate('/upload')}>
            New screening
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm p-6 lg:p-8">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-24 w-72 h-72 rounded-full bg-surface-container-high/40 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
          <div className="max-w-xl flex flex-col">
            <div className="inline-flex items-center gap-1.5 text-secondary font-medium text-xs uppercase tracking-wider mb-1">
              <ShieldCheck size={16} />
              <span>Handwriting screening</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-semibold text-on-surface tracking-tight">
              Start a screening
            </h2>
            <p className="text-base text-on-surface-variant mt-1 leading-relaxed">
              Upload a scanned or photographed page of handwriting. A five-fold ConvNeXt-Tiny
              ensemble scores the page from 0 to 1 and returns attention, Grad-CAM, and Integrated
              Gradients overlays for the same image.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start lg:self-auto px-4 py-2 rounded-lg bg-surface-container-low">
            <ScanBarcode className="text-secondary" size={20} />
            <div className="flex flex-col">
              <span className="font-mono text-sm text-on-surface font-semibold">
                Page-level risk score
              </span>
              <span className="font-medium text-xs text-on-surface-variant">
                Binary outcome at a 0.50 threshold
              </span>
            </div>
          </div>
        </div>

        <Dropzone className="w-full" onClick={() => navigate('/upload')} />

        <p className="mt-4 text-xs text-on-surface-variant leading-relaxed">
          A screening result is an aid for educational follow-up, not a diagnosis. Results are
          saved to your account when Supabase is configured, and to this browser otherwise.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Saved screenings',
            value: summary.total,
            hint: 'In this account or browser',
            icon: ClockRotateRight,
            tone: 'text-on-surface',
          },
          {
            label: 'Potential dyslexia signal',
            value: summary.elevated,
            hint: 'Risk score at or above 50%',
            icon: WarningTriangle,
            tone: 'text-error',
          },
          {
            label: 'Typical pattern',
            value: summary.typical,
            hint: 'Risk score below 50%',
            icon: CheckCircle,
            tone: 'text-secondary',
          },
        ].map((metric) => (
          <motion.div
            key={metric.label}
            whileHover={shouldReduceMotion ? {} : { transform: 'translateY(-2px)' }}
            transition={{ duration: 0.18, ease: easeOut }}
            className="rounded-xl bg-surface-container-lowest p-4 shadow-sm flex flex-col justify-between border border-outline-variant/20 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm text-on-surface-variant font-medium">{metric.label}</span>
                <span className={`text-3xl font-semibold mt-1 ${metric.tone}`}>
                  {metric.value}
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface">
                <metric.icon size={20} />
              </div>
            </div>
            <span className="text-xs font-medium text-on-surface-variant mt-4">{metric.hint}</span>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl bg-surface-container-lowest p-6 lg:p-8 shadow-sm flex flex-col border border-outline-variant/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-on-surface">How screening works</h3>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-mono text-xs font-medium border border-outline-variant/20">
                Five-fold ensemble
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              From uploaded page to a screening result and its explanation overlays.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 font-mono text-xs text-secondary">
            <Filter size={16} />
            <span>Binary outcome at 0.50</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {[
            {
              num: '01',
              icon: CloudUpload,
              title: 'Upload a page',
              desc: 'One scanned or photographed handwriting page (PNG or JPG).',
            },
            {
              num: '02',
              icon: ScanBarcode,
              title: 'Validate the image',
              desc: 'The service checks the file type, opens it, and resizes the page for the model.',
            },
            {
              num: '03',
              icon: ElectronicsChip,
              title: 'Five-fold inference',
              desc: 'ConvNeXt-Tiny scores the page in each fold; the mean is the risk score.',
            },
            {
              num: '04',
              icon: Network,
              title: 'Review the result',
              desc: 'Risk percentage, spread across folds, and attention / Grad-CAM / IG overlays.',
            },
          ].map((step) => (
            <motion.div
              key={step.num}
              whileHover={shouldReduceMotion ? {} : { transform: 'translateY(-2px)' }}
              transition={{ duration: 0.18, ease: easeOut }}
              className="flex flex-col p-4 rounded-lg bg-surface-container-low border border-outline-variant/20 hover:border-outline-variant/40 hover:shadow-xs transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-container-lowest text-on-surface font-semibold border border-outline-variant/20">
                  {step.num}
                </span>
                <step.icon className="text-secondary" size={20} />
              </div>
              <span className="font-semibold text-sm text-on-surface">{step.title}</span>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 pt-2 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-on-surface-variant text-sm">
            <ShieldCheck size={16} className="text-secondary" />
            <span>An educational screening aid, not a medical diagnostic device.</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
            <span>Backbone: ConvNeXt-Tiny</span>
            <span>•</span>
            <span>Pooling: Attention MIL</span>
            <span>•</span>
            <span>Ensemble: 5 folds</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col rounded-xl bg-surface-container-lowest shadow-sm p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex flex-col">
            <h3 className="text-xl font-semibold text-on-surface">Recent screenings</h3>
            <span className="text-sm text-on-surface-variant">
              The latest results saved for this account or browser.
            </span>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary text-sm font-semibold transition-colors cursor-pointer border border-outline-variant/20"
          >
            <span>View all screenings</span>
            <NavArrowRight size={16} />
          </button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="text-on-surface-variant text-xs border-b border-surface-container-low">
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Sample</th>
                <th className="pb-2 font-semibold">Outcome</th>
                <th className="pb-2 font-semibold">Risk score</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low text-sm">
              {recent.map((row) => {
                const percent = Number.isFinite(row.riskPercentage) ? row.riskPercentage : null;
                return (
                  <tr key={row.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 font-medium text-on-surface">{formatDate(row.date)}</td>
                    <td className="py-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-on-surface">
                          {row.id || '—'}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {row.subject || row.file || 'Handwriting sample'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={
                          row.category === 'Elevated'
                            ? 'elevated'
                            : row.category === 'Typical'
                            ? 'typical'
                            : 'info'
                        }
                        showDot
                      >
                        {OUTCOME_LABEL[row.category] || row.category || 'Outcome unavailable'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1 w-28">
                        <span className="font-mono text-xs font-semibold text-on-surface">
                          {percent !== null ? `${percent}%` : '—'}
                        </span>
                        <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              row.category === 'Elevated' ? 'bg-error' : 'bg-secondary'
                            }`}
                            style={{ width: `${percent !== null ? Math.min(Math.max(percent, 0), 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-[10px] font-semibold">
                        {row.status || 'Completed'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() =>
                          navigate('/result', {
                            state: { result: toResult(row), filename: row.file || row.subject },
                          })
                        }
                        disabled={!Number.isFinite(row.riskScore)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors text-xs font-semibold border border-outline-variant/20 hover:border-outline-variant cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <span>View details</span>
                        <NavArrowRight size={14} className="text-secondary" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {recent.length === 0 && (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                <GraphUp size={22} />
              </div>
              <span className="text-sm text-on-surface-variant">
                No screenings saved yet. Your first result will appear here.
              </span>
              <Button variant="accent" icon={CloudUpload} onClick={() => navigate('/upload')}>
                Screen a handwriting sample
              </Button>
            </div>
          )}

          <div className="mt-4 pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-medium text-on-surface-variant">
            <span>
              Showing {recent.length} of {history.length} saved screenings
            </span>
            <span className="font-mono text-xs text-secondary">Mean risk:{' '}
              {summary.meanRisk === null
                ? '—'
                : `${Math.round(summary.meanRisk * 1000) / 10}%`}
            </span>
          </div>
        </div>
      </div>

      <ProtocolModal isOpen={isProtocolOpen} onClose={() => setIsProtocolOpen(false)} />
    </div>
  );
}
