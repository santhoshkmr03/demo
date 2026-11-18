import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  ShieldCheck,
  Download,
  ScanBarcode,
  BrainElectricity,
  WarningTriangle,
  FireFlame,
  Expand,
  Eye,
  CloudUpload,
  InfoCircle,
} from 'iconoir-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const THRESHOLD = 0.5;

function toPercent(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number((n * 100).toFixed(digits));
}

/**
 * Result page.
 *
 * Renders exactly what POST /api/v1/screen returned: one page-level risk score,
 * the spread across the five folds, and the explanation overlays. It never
 * invents a result when opened without one.
 */
export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const result = location.state?.result || null;
  const previewUrl =
    location.state?.previewUrl ||
    result?.preview_image_base64 ||
    result?.original_image_base64 ||
    null;
  const filename = location.state?.filename || null;
  const sourceFile = location.state?.file || null;
  const completedAt = location.state?.completedAt || null;

  const [activeLayer, setActiveLayer] = useState('optical');
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const riskScore = Number(result?.risk_score);
  const hasRisk = Number.isFinite(riskScore);
  const riskPercentage = hasRisk
    ? Number.isFinite(Number(result.risk_percentage))
      ? Number(result.risk_percentage)
      : Math.round(riskScore * 1000) / 10
    : null;

  const isElevated = hasRisk && riskScore >= THRESHOLD;

  const folds = Array.isArray(result?.per_fold_predictions)
    ? result.per_fold_predictions.map(Number).filter(Number.isFinite)
    : [];

  const band = result?.uncertainty_band || null;
  const stdPoints = band && Number.isFinite(Number(band.std))
    ? Number((Number(band.std) * 100).toFixed(1))
    : null;
  const lowPoints = band && Number.isFinite(Number(band.low)) ? toPercent(band.low) : null;
  const highPoints = band && Number.isFinite(Number(band.high)) ? toPercent(band.high) : null;

  const inkFraction = Number.isFinite(Number(result?.ink_mass_fraction))
    ? Number(result.ink_mass_fraction)
    : null;

  const layers = [
    { id: 'optical', label: 'Original', icon: Eye, src: previewUrl },
    { id: 'attention', label: 'Attention', icon: ScanBarcode, src: result?.attention_overlay_base64 },
    { id: 'gradcam', label: 'Grad-CAM', icon: FireFlame, src: result?.gradcam_overlay_base64 },
    { id: 'ig', label: 'Integrated Gradients', icon: BrainElectricity, src: result?.ig_overlay_base64 },
  ].filter((layer) => Boolean(layer.src));

  const effectiveLayer = layers.some((layer) => layer.id === activeLayer)
    ? activeLayer
    : layers[0]?.id || 'optical';
  const effectiveSrc = layers.find((layer) => layer.id === effectiveLayer)?.src || previewUrl;

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  if (!result) {
    return (
      <div className="flex flex-col w-full pb-16 pt-10 font-body text-on-surface">
        <Card className="max-w-xl mx-auto p-10 text-center border border-outline-variant/30">
          <div className="w-14 h-14 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center mx-auto mb-5">
            <ScanBarcode size={26} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">No screening result loaded</h1>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
            This page displays the response from a screening you just ran. Opening it directly does
            not produce a result, and nothing is generated to fill the page.
          </p>
          <Button variant="accent" icon={CloudUpload} className="mt-6" onClick={() => navigate('/upload')}>
            Screen a handwriting sample
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12 w-full max-w-[1600px] mx-auto pt-4 font-body text-on-surface">
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-mono text-xs mb-1">
            <ShieldCheck size={14} className="text-secondary" />
            <span>SCREENING RESULT</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-on-surface">
            {isElevated ? 'Potential dyslexia signal' : 'Typical pattern'}
          </h1>
          <p className="text-base text-on-surface-variant max-w-2xl">
            Mean risk across a five-fold ConvNeXt-Tiny ensemble, with attention, Grad-CAM, and
            Integrated Gradients overlays for the same page.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {filename && (
            <span className="font-mono text-xs text-on-surface-variant bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 truncate max-w-[220px]">
              {filename}
            </span>
          )}
          <button
            onClick={() =>
              navigate('/report', {
                state: { result, file: sourceFile, previewUrl, filename, completedAt },
              })
            }
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-medium text-sm hover:bg-surface-container transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Download size={16} />
            <span>Generate screening report</span>
          </button>
          <Button variant="accent" icon={CloudUpload} onClick={() => navigate('/upload')}>
            New screening
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Card className="p-6 border border-outline-variant/30">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2 mb-4 bg-surface-container-low px-4 py-2.5 rounded-lg border border-outline-variant/20">
              <div className="flex items-center gap-3">
                <ScanBarcode size={24} className="text-secondary" />
                <div>
                  <h2 className="text-lg font-semibold text-on-surface">Handwriting sample</h2>
                  <p className="text-xs text-on-surface-variant">
                    Original page and the model's explanation maps
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex items-center bg-surface-container border border-outline-variant/30 rounded-lg p-0.5 shadow-sm">
                  {layers.map((layer) => (
                    <button
                      key={layer.id}
                      onClick={() => setActiveLayer(layer.id)}
                      title={layer.label}
                      className={`px-2 py-1.5 rounded text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                        effectiveLayer === layer.id
                          ? 'bg-surface-container-lowest text-secondary shadow-sm font-bold'
                          : 'text-on-surface hover:bg-surface-container-lowest'
                      }`}
                    >
                      <layer.icon size={15} />
                      <span className="hidden md:inline">{layer.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
                    className="p-1.5 rounded hover:bg-surface-container-lowest text-on-surface transition-colors active:scale-95 cursor-pointer"
                    aria-label="Zoom in"
                  >
                    <span className="text-base leading-none font-bold">+</span>
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
                    className="p-1.5 rounded hover:bg-surface-container-lowest text-on-surface transition-colors active:scale-95 cursor-pointer"
                    aria-label="Zoom out"
                  >
                    <span className="text-base leading-none font-bold">-</span>
                  </button>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    title="Fullscreen"
                    className="p-1.5 rounded hover:bg-surface-container-lowest text-on-surface transition-colors cursor-pointer"
                  >
                    <Expand size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative w-full min-h-[380px] rounded-lg overflow-hidden bg-surface-container-low select-none flex items-center justify-center p-6 border border-outline-variant/20">
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <div
                className="relative z-10 w-full max-w-2xl flex flex-col justify-center items-center transition-transform duration-300"
                style={{ transform: `scale(${zoom})` }}
              >
                <div className="relative w-full p-4 bg-surface-container-lowest/90 backdrop-blur rounded-lg shadow-sm flex flex-col gap-3 border border-outline-variant/20">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                    <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase">
                      {layers.find((layer) => layer.id === effectiveLayer)?.label || 'Original'}
                    </span>
                    {stdPoints !== null && (
                      <span className="font-mono text-[10px] text-on-surface bg-surface-container-high px-2 py-0.5 rounded font-bold">
                        σ {stdPoints} pts
                      </span>
                    )}
                  </div>
                  <div className="relative w-full min-h-[260px] max-h-[420px] flex items-center justify-center overflow-hidden rounded bg-black/5">
                    {effectiveSrc ? (
                      <img
                        src={effectiveSrc}
                        alt={`Handwriting sample — ${activeLayer} view`}
                        className="max-h-[400px] max-w-full object-contain rounded shadow-sm"
                      />
                    ) : (
                      <span className="text-xs text-on-surface-variant">
                        The preview for this image is no longer available. Re-upload it to see the page.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-on-surface-variant border-t border-outline-variant/20">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  BACKBONE:{' '}
                  <strong className="text-on-surface font-semibold">{result.backbone || 'convnext_tiny'}</strong>
                </span>
                <span>
                  ENSEMBLE:{' '}
                  <strong className="text-on-surface font-semibold">
                    {result.models_in_ensemble ?? (folds.length || '—')} folds
                  </strong>
                </span>
              </div>
              {filename && <span className="truncate max-w-[24rem]">{filename}</span>}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card
            className={`p-6 border-l-4 ${
              isElevated ? 'border-l-error' : 'border-l-secondary'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider font-semibold">
                Screening outcome
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold font-mono inline-flex items-center gap-1 border ${
                  isElevated
                    ? 'bg-error-container text-on-error-container border-error/30'
                    : 'bg-secondary-container text-on-secondary-container border-secondary/30'
                }`}
              >
                {isElevated && <WarningTriangle size={12} />}
                {isElevated ? 'Elevated' : 'Typical'}
              </span>
            </div>

            <div className="space-y-1.5 mb-5">
              <div className="text-xs text-on-surface-variant uppercase font-semibold tracking-wider">
                Risk score
              </div>
              <div
                className={`text-4xl font-bold tracking-tight ${
                  isElevated ? 'text-error' : 'text-on-surface'
                }`}
              >
                {riskPercentage !== null ? `${riskPercentage}%` : '—'}
              </div>
              <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                {result.screening_classification ||
                  (isElevated
                    ? 'The mean ensemble score is above the 0.50 screening threshold.'
                    : 'The mean ensemble score is below the 0.50 screening threshold.')}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-surface-container">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-on-surface">Screening threshold</span>
                <span className="font-mono text-on-surface-variant">0.50</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden p-0.5 border border-outline-variant/20">
                <motion.div
                  style={{ transformOrigin: 'left' }}
                  initial={
                    shouldReduceMotion
                      ? { transform: `scaleX(${hasRisk ? Math.min(riskScore, 1) : 0})` }
                      : { transform: 'scaleX(0)' }
                  }
                  animate={{ transform: `scaleX(${hasRisk ? Math.min(riskScore, 1) : 0})` }}
                  transition={{ duration: 0.75, ease: [0.23, 1, 0.32, 1] }}
                  className={`h-full rounded-full w-full ${isElevated ? 'bg-error' : 'bg-secondary'}`}
                />
              </div>
              <span className="text-[11px] text-on-surface-variant block">
                The threshold is a screening cut-off, not a diagnostic boundary.
              </span>
            </div>
          </Card>

          <Card className="p-6 border border-outline-variant/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-on-surface">Agreement across folds</h3>
              {stdPoints !== null && (
                <span className="font-mono text-xs text-on-surface-variant">σ {stdPoints} pts</span>
              )}
            </div>

            {folds.length > 0 ? (
              <div className="space-y-3">
                {folds.map((fold, index) => {
                  const percent = toPercent(fold);
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1 font-mono text-xs">
                        <span className="text-on-surface-variant">Fold {index + 1}</span>
                        <span className="text-on-surface">{percent}%</span>
                      </div>
                      <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden border border-outline-variant/10">
                        <div
                          className={`h-full rounded-full ${
                            fold >= THRESHOLD ? 'bg-error' : 'bg-secondary'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, percent || 0))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">
                Per-fold scores were not included in this response.
              </p>
            )}

            {(lowPoints !== null || highPoints !== null) && (
              <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">Range across folds</span>
                <span className="font-mono text-on-surface">
                  {lowPoints !== null ? `${lowPoints}%` : '—'} – {highPoints !== null ? `${highPoints}%` : '—'}
                </span>
              </div>
            )}
          </Card>

          <Card className="p-6 border border-outline-variant/30">
            <h3 className="text-sm font-semibold text-on-surface mb-4">Response details</h3>
            <dl className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-on-surface-variant">Input mode</dt>
                <dd className="font-mono text-on-surface">{result.input_type || 'page'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-on-surface-variant">Ensemble size</dt>
                <dd className="font-mono text-on-surface">
                  {result.models_in_ensemble ?? (folds.length || '—')}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-on-surface-variant">Mean risk</dt>
                <dd className="font-mono text-on-surface">
                  {hasRisk ? riskScore.toFixed(4) : '—'}
                </dd>
              </div>
              {inkFraction !== null && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-on-surface-variant">Ink mass fraction</dt>
                  <dd className="font-mono text-on-surface">{(inkFraction * 100).toFixed(1)}%</dd>
                </div>
              )}
              {completedAt && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-on-surface-variant">Completed</dt>
                  <dd className="font-mono text-on-surface">
                    {new Date(completedAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
              <InfoCircle size={16} className="text-secondary" />
              <span>Screening notice</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              {result.disclaimer ||
                'This is a screening aid, not a diagnosis. A flag means the page-level risk score is above the threshold and should be reviewed by a qualified specialist.'}
            </p>
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isFullscreen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setIsFullscreen(false)}
                className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6"
              >
                <motion.div
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, transform: 'scale(0.96) translateY(8px)' }
                  }
                  animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }}
                  exit={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, transform: 'scale(0.96) translateY(8px)' }
                  }
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-5xl bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-2xl p-6 flex flex-col gap-4 font-body text-on-surface max-h-[90vh] overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                    <div className="flex items-center gap-3">
                      <ScanBarcode size={22} className="text-secondary" />
                      <span className="font-semibold text-base text-on-surface">{filename || 'Handwriting sample'}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {layers.map((layer) => (
                        <button
                          key={layer.id}
                          onClick={() => setActiveLayer(layer.id)}
                          className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                            effectiveLayer === layer.id
                              ? 'bg-secondary text-on-secondary'
                              : 'bg-surface-container hover:bg-surface-container-high'
                          }`}
                        >
                          {layer.label}
                        </button>
                      ))}
                      <button
                        onClick={() => setIsFullscreen(false)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="relative w-full h-[60vh] bg-surface-container-low rounded-xl flex items-center justify-center p-8 overflow-auto border border-outline-variant/20">
                    {effectiveSrc ? (
                      <img
                        src={effectiveSrc}
                        alt="Handwriting sample fullscreen"
                        className="max-h-[55vh] max-w-full object-contain rounded"
                      />
                    ) : (
                      <span className="text-sm text-on-surface-variant">Preview unavailable.</span>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
