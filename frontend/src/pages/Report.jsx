import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Printer,
  Download,
  ShieldCheck,
  CheckCircle,
  WarningTriangle,
  ArrowLeft,
  CloudUpload,
  Page,
  User,
} from 'iconoir-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateReport } from '../utils/api';
import { useToast } from '../context/ToastContext';

function toPercent(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number((n * 100).toFixed(digits));
}

/**
 * Screening report.
 *
 * Shows only the fields returned by POST /api/v1/screen, and downloads the PDF
 * that POST /api/v1/report generates from the same image.
 */
export default function Report() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const result = location.state?.result || null;
  const file = location.state?.file || null;
  const filename = location.state?.filename || null;
  const completedAt = location.state?.completedAt || null;
  const previewUrl = location.state?.previewUrl || null;

  const [studentId, setStudentId] = useState('Anonymous Student');
  const [examinerName, setExaminerName] = useState('Educational Specialist');
  const [downloading, setDownloading] = useState(false);

  const riskScore = Number(result?.risk_score);
  const hasRisk = Number.isFinite(riskScore);
  const riskPercentage = hasRisk
    ? Number.isFinite(Number(result.risk_percentage))
      ? Number(result.risk_percentage)
      : Math.round(riskScore * 1000) / 10
    : null;
  const isElevated = hasRisk && riskScore >= 0.5;

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

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { blob, filename: pdfName } = await generateReport(file, {
        studentId,
        examinerName,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addToast('Screening report downloaded', 'success');
    } catch (err) {
      addToast(err.message || 'Could not generate the PDF report', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ screening: result, filename }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screening-response.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!result) {
    return (
      <div className="flex flex-col w-full pb-16 pt-10 font-body text-on-surface">
        <Card className="max-w-xl mx-auto p-10 text-center border border-outline-variant/30">
          <div className="w-14 h-14 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center mx-auto mb-5">
            <Page size={26} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">No screening report loaded</h1>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
            Reports are generated from a screening you have just run. Open this page from a result,
            or screen a new handwriting sample first.
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
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 print:hidden">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-mono text-xs mb-1">
            <ShieldCheck size={14} className="text-secondary" />
            <span>SCREENING REPORT</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-on-surface">Screening report</h1>
          <p className="text-base text-on-surface-variant max-w-2xl">
            A printable summary of the screening result. The PDF is generated by the screening
            service from the same image and the same five-fold ensemble.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>
            Back to result
          </Button>
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
            Print
          </Button>
          <Button
            variant="accent"
            icon={Download}
            isLoading={downloading}
            disabled={!file}
            onClick={handleDownload}
          >
            Download PDF
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-6 print:w-full print:col-span-12">
          <Card className="p-8 sm:p-10 border border-outline-variant/30 shadow-md">
            <div className="pb-6 mb-8 border-b border-surface-container flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-primary text-on-primary font-bold flex items-center justify-center text-sm shadow-sm">
                    N
                  </div>
                  <span className="text-2xl font-bold tracking-tight text-on-surface">NeuroWrite AI</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container text-xs font-mono font-semibold uppercase text-secondary">
                    v1.0
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Handwriting screening — page-level risk estimate
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs uppercase tracking-widest text-secondary font-bold">
                  Screening report
                </span>
                <div className="font-mono text-xs text-on-surface-variant mt-1">
                  {result.backbone || 'convnext_tiny'} · {result.models_in_ensemble ?? (folds.length || '—')}-fold ensemble
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 mb-8">
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Student ID</span>
                <span className="font-mono text-sm font-bold text-on-surface mt-1 truncate">{studentId || 'Anonymous Student'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Sample file</span>
                <span className="font-mono text-xs font-bold text-on-surface mt-1 truncate">{filename || '—'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Date</span>
                <span className="text-sm font-semibold text-on-surface mt-1">
                  {completedAt
                    ? new Date(completedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Examiner</span>
                <span className="text-sm font-semibold text-on-surface mt-1 truncate">{examinerName || 'Educational Specialist'}</span>
              </div>
            </div>

            <div className="rounded-xl p-6 bg-surface-container border border-outline-variant/30 mb-8">
              <h2 className="text-base font-bold text-on-surface uppercase tracking-wider mb-4">
                Screening outcome
              </h2>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">
                      Result:
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-black tracking-wide shadow-sm border ${
                        isElevated
                          ? 'bg-error-container text-on-error-container border-error/30'
                          : 'bg-secondary-container text-on-secondary-container border-secondary/30'
                      }`}
                    >
                      {isElevated ? (
                        <WarningTriangle size={15} className="text-error" />
                      ) : (
                        <CheckCircle size={15} className="text-secondary" />
                      )}
                      <span>{isElevated ? 'POTENTIAL DYSLEXIA SIGNAL' : 'TYPICAL PATTERN'}</span>
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {result.screening_classification ||
                      (isElevated
                        ? 'The mean ensemble score is above the 0.50 screening threshold. Specialist follow-up is recommended.'
                        : 'The mean ensemble score is below the 0.50 screening threshold.')}
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm min-w-[200px] border border-outline-variant/20 text-center">
                  <span className="text-xs uppercase tracking-wider text-on-surface-variant block mb-1 font-semibold">
                    Risk score
                  </span>
                  <span className="text-3xl font-extrabold font-mono text-on-surface">
                    {riskPercentage !== null ? `${riskPercentage}%` : '—'}
                  </span>
                  <div className="w-full bg-surface-container rounded-full h-2 mt-2 overflow-hidden border border-outline-variant/10">
                    <div
                      className={`h-full rounded-full w-full ${isElevated ? 'bg-error' : 'bg-secondary'}`}
                      style={{
                        transformOrigin: 'left',
                        transform: `scaleX(${hasRisk ? Math.min(riskScore, 1) : 0})`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-3">
                Ensemble detail
              </h3>
              <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase font-semibold">
                      <th className="py-3 px-4">Fold</th>
                      <th className="py-3 px-4">Risk score</th>
                      <th className="py-3 px-4">Relative to threshold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container font-mono text-xs text-on-surface">
                    {folds.length > 0 ? (
                      folds.map((fold, index) => (
                        <tr key={index}>
                          <td className="py-3 px-4 font-sans font-medium">Fold {index + 1}</td>
                          <td className="py-3 px-4">{toPercent(fold)}%</td>
                          <td className={`py-3 px-4 font-semibold ${fold >= 0.5 ? 'text-error' : 'text-secondary'}`}>
                            {fold >= 0.5 ? 'Above 0.50' : 'Below 0.50'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-3 px-4 font-sans text-on-surface-variant" colSpan={3}>
                          Per-fold scores were not included in this response.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
                <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                  <span className="text-on-surface-variant block">Mean risk</span>
                  <span className="font-mono font-semibold text-on-surface">
                    {hasRisk ? riskScore.toFixed(4) : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                  <span className="text-on-surface-variant block">Std. deviation</span>
                  <span className="font-mono font-semibold text-on-surface">
                    {stdPoints !== null ? `${stdPoints} pts` : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                  <span className="text-on-surface-variant block">Fold range</span>
                  <span className="font-mono font-semibold text-on-surface">
                    {lowPoints !== null && highPoints !== null ? `${lowPoints}–${highPoints}%` : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                  <span className="text-on-surface-variant block">Ink mass</span>
                  <span className="font-mono font-semibold text-on-surface">
                    {inkFraction !== null ? `${(inkFraction * 100).toFixed(1)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-error-container/20 border border-error/30 rounded-xl flex items-start gap-4">
              <ShieldCheck size={22} className="text-error shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-error uppercase tracking-wide mb-1">
                  Screening aid — not a diagnosis
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {result.disclaimer ||
                    'This report contains an AI-assisted screening estimate. It does not constitute a medical diagnosis of developmental dyslexia, dysgraphia, or any neurological condition.'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 print:hidden">
          <Card className="p-6 border border-outline-variant/30">
            <h3 className="text-sm font-semibold text-on-surface mb-4">Report details</h3>
            <div className="space-y-4">
              <Input
                label="Student ID"
                icon={User}
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Anonymous Student"
              />
              <Input
                label="Examiner / institution"
                icon={ShieldCheck}
                value={examinerName}
                onChange={(e) => setExaminerName(e.target.value)}
                placeholder="Educational Specialist"
              />
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                These two fields are sent to the report endpoint and printed on the PDF. Nothing
                else about the student is collected.
              </p>
            </div>
          </Card>

          <Card className="p-6 border border-outline-variant/30">
            <h3 className="text-sm font-semibold text-on-surface mb-3">Export</h3>
            <div className="space-y-2.5">
              <button
                onClick={handleDownload}
                disabled={!file || downloading}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-sm text-on-surface font-medium border border-outline-variant/20 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="flex items-center gap-2">
                  <Download size={16} className="text-secondary" />
                  <span>{downloading ? 'Generating PDF…' : 'PDF screening report'}</span>
                </span>
                <span className="font-mono text-xs text-on-surface-variant">.pdf</span>
              </button>
              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-sm text-on-surface font-medium border border-outline-variant/20 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Printer size={16} className="text-secondary" />
                  <span>Print this page</span>
                </span>
                <span className="font-mono text-xs text-on-surface-variant">A4 / Letter</span>
              </button>
              <button
                onClick={handleExportJson}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-sm text-on-surface font-medium border border-outline-variant/20 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Page size={16} className="text-secondary" />
                  <span>Raw API response</span>
                </span>
                <span className="font-mono text-xs text-on-surface-variant">.json</span>
              </button>
            </div>
            {!file && (
              <p className="text-[11px] text-error leading-relaxed mt-3">
                The original image is not in this tab any more, so the PDF endpoint cannot be
                called. Re-upload the sample to download a PDF.
              </p>
            )}
          </Card>

          {previewUrl && (
            <Card className="p-4 border border-outline-variant/30">
              <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface-variant font-semibold mb-3">
                Screened sample
              </h3>
              <img
                src={previewUrl}
                alt="Screened handwriting sample"
                className="w-full rounded-lg border border-outline-variant/20 object-contain max-h-56 bg-surface-container-low"
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
