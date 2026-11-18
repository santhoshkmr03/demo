import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getHistory } from '../utils/api';
import {
  Search,
  NavArrowDown,
  Download,
  ClockRotateRight,
  Check,
  CloudUpload,
  WarningTriangle,
  CheckCircle,
  GraphUp,
} from 'iconoir-react';

const OUTCOME_LABEL = {
  Elevated: 'Potential dyslexia signal',
  Typical: 'Typical pattern',
};

function formatDate(value) {
  if (!value) return { date: '—', time: '' };
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: String(value), time: '' };
  return {
    date: parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    time: parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

function resultFromRecord(row) {
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
    original_image_base64: row.originalImageBase64,
    preview_image_base64: row.previewImageBase64,
    attention_overlay_base64: row.attentionOverlayBase64,
    gradcam_overlay_base64: row.gradcamOverlayBase64,
    ig_overlay_base64: row.igOverlayBase64,
  };
}

function outcomeVariant(category) {
  return category === 'Elevated' ? 'elevated' : category === 'Typical' ? 'typical' : 'info';
}

export default function History() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [exported, setExported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHistory()
      .then((response) => {
        if (!cancelled) setHistory(response?.data || []);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return history.filter((row) => {
      const text = `${row.id || ''} ${row.subject || row.file || ''} ${
        OUTCOME_LABEL[row.category] || row.category || ''
      }`.toLowerCase();
      return (
        text.includes(query) &&
        (categoryFilter === 'All' || row.category === categoryFilter)
      );
    });
  }, [history, search, categoryFilter]);

  const summary = useMemo(() => {
    const scored = history.filter((row) => Number.isFinite(row.riskScore));
    return {
      total: history.length,
      elevated: history.filter((row) => row.category === 'Elevated').length,
      typical: history.filter((row) => row.category === 'Typical').length,
      meanRisk:
        scored.length === 0
          ? null
          : scored.reduce((sum, row) => sum + row.riskScore, 0) / scored.length,
    };
  }, [history]);

  const exportCsv = () => {
    const rows = filtered.map((row) =>
      [
        row.id || '',
        row.date || '',
        `"${(row.subject || row.file || 'Handwriting sample').replace(/"/g, '""')}"`,
        OUTCOME_LABEL[row.category] || row.category || '',
        row.riskPercentage ?? '',
        row.status || '',
      ].join(',')
    );
    const blob = new Blob([['ID,Date,Sample,Outcome,Risk percentage,Status', ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `screening-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const metrics = [
    ['Screenings', summary.total, 'Saved records', ClockRotateRight, 'text-on-surface'],
    ['Potential dyslexia signal', summary.elevated, 'Risk at or above 50%', WarningTriangle, 'text-error'],
    ['Typical pattern', summary.typical, 'Risk below 50%', CheckCircle, 'text-secondary'],
    [
      'Mean risk score',
      summary.meanRisk === null ? '—' : `${Math.round(summary.meanRisk * 1000) / 10}%`,
      summary.meanRisk === null ? 'No scored records' : 'Across saved screenings',
      GraphUp,
      'text-on-surface',
    ],
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 pt-4 font-body text-on-surface">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-secondary font-semibold">
            Screening records
          </span>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Screening history</h1>
          <p className="text-base text-on-surface-variant mt-1 max-w-2xl">
            Review saved page-level screenings, including the original handwriting image and model visualisations.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={exported ? Check : Download} onClick={exportCsv} disabled={!filtered.length}>
            {exported ? 'CSV exported' : 'Export CSV'}
          </Button>
          <Button variant="accent" icon={CloudUpload} onClick={() => navigate('/upload')}>
            New screening
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(([label, value, hint, Icon, tone]) => (
          <motion.div
            key={label}
            whileHover={reducedMotion ? {} : { transform: 'translateY(-2px)' }}
            className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30"
          >
            <div className="flex justify-between gap-3">
              <span className="text-xs text-on-surface-variant uppercase tracking-wide font-semibold">{label}</span>
              <Icon className="text-secondary shrink-0" size={20} />
            </div>
            <div className={`text-3xl font-bold mt-3 ${tone}`}>{loading ? '—' : value}</div>
            <span className="text-xs text-on-surface-variant">{hint}</span>
          </motion.div>
        ))}
      </div>

      <section className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-2.5 text-on-surface-variant" size={18} />
            <input
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-surface text-sm border border-outline-variant/30 focus:border-secondary focus:outline-none"
              placeholder="Search by record ID, sample name, or outcome..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="appearance-none h-10 pl-3.5 pr-9 rounded-lg bg-surface text-sm font-semibold border border-outline-variant/30"
            >
              <option value="All">All outcomes</option>
              <option value="Elevated">Potential dyslexia signal</option>
              <option value="Typical">Typical pattern</option>
            </select>
            <NavArrowDown size={16} className="absolute right-2.5 top-3 pointer-events-none" />
          </div>
        </div>
      </section>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Sample</th>
                <th className="py-3.5 px-6">Outcome</th>
                <th className="py-3.5 px-6">Risk score</th>
                <th className="py-3.5 px-6">Visuals</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-sm">
              {filtered.map((row) => {
                const date = formatDate(row.date);
                const percent = Number.isFinite(row.riskPercentage) ? row.riskPercentage : null;
                const previewImage = row.previewImageBase64 || row.originalImageBase64;
                const visualCount = [
                  previewImage,
                  row.attentionOverlayBase64,
                  row.gradcamOverlayBase64,
                  row.igOverlayBase64,
                ].filter(Boolean).length;
                return (
                  <tr key={row.id} className="hover:bg-surface-container-low/60">
                    <td className="py-4 px-6"><div className="flex flex-col"><span>{date.date}</span><span className="font-mono text-xs text-on-surface-variant">{date.time}</span></div></td>
                    <td className="py-4 px-6"><div className="flex flex-col"><span className="font-mono text-xs font-semibold">{row.id || '—'}</span><span className="text-xs text-on-surface-variant">{row.subject || row.file || 'Handwriting sample'}</span></div></td>
                    <td className="py-4 px-6"><Badge variant={outcomeVariant(row.category)} showDot>{OUTCOME_LABEL[row.category] || row.category || 'Outcome unavailable'}</Badge></td>
                    <td className="py-4 px-6"><span className="font-mono font-semibold">{percent === null ? '—' : `${percent}%`}</span></td>
                    <td className="py-4 px-6"><div className="flex items-center gap-2">{previewImage && <img src={previewImage} alt="Handwriting sample" className="w-12 h-9 object-contain rounded border border-outline-variant/30" />}<span className="text-xs text-on-surface-variant">{visualCount ? `${visualCount} saved` : 'None saved'}</span></div></td>
                    <td className="py-4 px-6 text-right"><button onClick={() => navigate('/result', { state: { result: resultFromRecord(row), previewUrl: row.previewImageBase64 || row.originalImageBase64 || null, filename: row.file || row.subject } })} disabled={!Number.isFinite(row.riskScore)} className="px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold disabled:opacity-40">View details</button></td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="py-14 px-6 text-center text-on-surface-variant">{history.length ? 'No screening records match your filter.' : 'No screenings saved yet.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
