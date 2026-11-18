import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { screen, saveScreeningRecord } from '../utils/api';
import {
  ShieldCheck,
  XmarkCircle,
  MediaImage,
  ElectronicsChip,
  Network,
  Check,
  WarningTriangle,
  Refresh,
  CloudUpload,
} from 'iconoir-react';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => reject(reader.error || new Error('Could not read the handwriting image'));
    reader.readAsDataURL(file);
  });
}

/**
 * Runs one screening and hands the response to the Result page.
 *
 * The service exposes a single request/response call, so this page can show
 * what stage the request is in and how long it has been running, but it cannot
 * report server-side progress. Nothing here is simulated.
 */
export default function Processing() {
  const navigate = useNavigate();
  const location = useLocation();

  const file = location.state?.file;
  const filename = location.state?.filename || file?.name || 'handwriting-sample.png';
  const fileSize = location.state?.fileSize;
  const dimensions = location.state?.dimensions;
  const previewUrl = location.state?.previewUrl;

  const [status, setStatus] = useState(file ? 'running' : 'error');
  const [error, setError] = useState(
    file
      ? null
      : 'No image was provided. Choose a handwriting sample before starting a screening.'
  );
  const [elapsed, setElapsed] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!file) return undefined;

    let active = true;
    const startedAt = Date.now();

    const tick = setInterval(() => {
      if (active) setElapsed((Date.now() - startedAt) / 1000);
    }, 200);

    screen(file)
      .then(async (result) => {
        if (!active) return;
        clearInterval(tick);
        setElapsed((Date.now() - startedAt) / 1000);
        const originalImageBase64 = await fileToDataUrl(file).catch(() => null);
        saveScreeningRecord({
          ...result,
          filename,
          original_image_base64: originalImageBase64,
          preview_image_base64: originalImageBase64,
        });
        setStatus('complete');
        navigate('/result', {
          replace: true,
          state: {
            result,
            file,
            previewUrl,
            filename,
            completedAt: new Date().toISOString(),
          },
        });
      })
      .catch((err) => {
        if (!active) return;
        clearInterval(tick);
        setStatus('error');
        setError(err.message || 'The screening service did not return a result.');
      });

    return () => {
      active = false;
      clearInterval(tick);
    };
  }, [file, filename, previewUrl, navigate, attempt]);

  const elapsedLabel = `${elapsed.toFixed(1)}s`;

  return (
    <div className="flex flex-col w-full pb-16 gap-6 pt-4 font-body text-on-surface">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-on-surface-variant text-xs">
            <span>Screening</span>
            <span>&gt;</span>
            <span>Analysis</span>
            <span>&gt;</span>
            <span className="font-mono font-semibold text-secondary">
              {status === 'error' ? 'Failed' : status === 'complete' ? 'Complete' : 'Running'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-on-surface tracking-tight">
              {status === 'error' ? 'Screening could not be completed' : 'Screening in progress'}
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
              {status === 'running' && <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />}
              {status === 'error' && <WarningTriangle size={12} />}
              <span>
                {status === 'running'
                  ? '5-fold ensemble running'
                  : status === 'error'
                  ? 'No result produced'
                  : 'Result ready'}
              </span>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant flex flex-wrap items-center gap-2">
            <span className="font-mono truncate max-w-[28rem]">{filename}</span>
            <span className="text-outline-variant">•</span>
            <span>
              Elapsed: <span className="font-mono font-semibold text-on-surface">{elapsedLabel}</span>
            </span>
            {fileSize && (
              <>
                <span className="text-outline-variant">•</span>
                <span className="font-mono">{fileSize}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-colors font-medium text-sm border border-outline-variant/20 cursor-pointer"
          >
            <XmarkCircle size={18} />
            <span>{status === 'error' ? 'Back to upload' : 'Cancel'}</span>
          </button>
        </div>
      </div>

      {status === 'error' ? (
        <Card className="p-8 border border-error/30 bg-error-container/10">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
              <WarningTriangle size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-on-surface">No screening result was produced</h2>
              <p className="text-sm text-on-surface-variant mt-1 leading-relaxed break-words">{error}</p>
              <p className="text-xs text-on-surface-variant mt-3">
                Nothing was saved to your history. Check that the screening service is running and reachable,
                then try again.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  onClick={() => {
                    setStatus('running');
                    setError(null);
                    setElapsed(0);
                    setAttempt((n) => n + 1);
                  }}
                  disabled={!file}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-on-secondary text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition-opacity cursor-pointer"
                >
                  <Refresh size={16} />
                  <span>Try again</span>
                </button>
                <button
                  onClick={() => navigate('/upload')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-on-surface text-sm font-medium hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <CloudUpload size={16} />
                  <span>Upload a different sample</span>
                </button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8">
            <Card className="p-5 border border-outline-variant/30">
              <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-outline-variant/20">
                <ShieldCheck className="text-secondary" size={20} />
                <span className="text-sm font-semibold text-on-surface">Submitted handwriting sample</span>
              </div>

              <div className="relative w-full min-h-[380px] rounded-lg overflow-hidden bg-surface-container-low flex items-center justify-center p-6 border border-outline-variant/20">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Handwriting sample being screened"
                    className="max-h-[420px] max-w-full object-contain rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-on-surface-variant text-xs p-6 text-center">
                    <MediaImage size={40} className="text-secondary mb-2" />
                    <span className="font-semibold text-on-surface">{filename}</span>
                    <span className="mt-1">Image submitted to the screening service</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 flex flex-wrap items-center gap-4 text-xs font-mono text-on-surface-variant border-t border-outline-variant/20">
                {dimensions && <span>{dimensions}</span>}
                {dimensions && <span className="text-outline-variant">·</span>}
                <span>INPUT_MODE: page</span>
                <span className="text-outline-variant">·</span>
                <span>PADDED TO 512 PX · 224 PX PATCHES</span>
              </div>
            </Card>
          </div>

          <div className="xl:col-span-4 flex flex-col gap-6">
            <Card className="p-6 border border-outline-variant/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-on-surface">What is running</h2>
                <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/20">
                  {elapsedLabel}
                </span>
              </div>

              <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden border border-outline-variant/20 mb-6">
                <div className="h-full w-1/3 rounded-full bg-secondary animate-pulse" />
              </div>

              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0">
                    <Check size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">Image submitted</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 break-all">{filename}</p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 ring-4 ring-secondary/20">
                    <ElectronicsChip size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-secondary">5-fold ConvNeXt-Tiny ensemble</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Each fold scores the page; the mean becomes the risk score.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-surface-container border border-outline-variant/40 flex items-center justify-center shrink-0">
                    <Network size={14} className="text-on-surface-variant" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-on-surface">Explanation maps</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Attention rollout, Grad-CAM, and Integrated Gradients overlays.
                    </p>
                  </div>
                </li>
              </ol>

              <p className="text-[11px] text-on-surface-variant leading-relaxed mt-6 pt-4 border-t border-outline-variant/20">
                The service returns the screening result and all explanation maps in one response.
                This page cannot show live progress from the server; the elapsed timer is the only
                real measurement while inference runs.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
