import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  CloudUpload,
  Refresh,
  ScanBarcode,
  Folder,
  Trash,
  LightBulb,
  EditPencil,
  MediaImageXmark,
  Brightness,
  SunLight,
  List,
  Brain,
  Check,
} from 'iconoir-react';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

const MAX_BYTES = 25 * 1024 * 1024;

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { addToast } = useToast();
  const shouldReduceMotion = useReducedMotion();
  const easeOut = [0.23, 1, 0.32, 1];

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileMeta, setFileMeta] = useState({
    name: '',
    size: '',
    dimensions: '—',
  });

  const processFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please choose an image file (PNG, JPG, WEBP, or BMP).', 'error');
      return;
    }

    if (file.size > MAX_BYTES) {
      addToast('That image is larger than 25 MB. Please choose a smaller file.', 'error');
      return;
    }

    const url = URL.createObjectURL(file);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);

    const img = new Image();
    img.onload = () => {
      setFileMeta({
        name: file.name,
        size: `${sizeMb} MB`,
        dimensions: `${img.naturalWidth} × ${img.naturalHeight} px`,
      });
    };
    img.onerror = () => {
      setFileMeta({ name: file.name, size: `${sizeMb} MB`, dimensions: 'Could not read' });
    };
    img.src = url;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(url);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileMeta({ name: '', size: '', dimensions: '—' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScreen = () => {
    if (!selectedFile) return;
    navigate('/processing', {
      state: {
        file: selectedFile,
        filename: selectedFile.name,
        previewUrl,
      },
    });
  };

  return (
    <div className="flex flex-col w-full pb-16 font-body text-on-surface">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp,image/bmp"
        className="hidden"
      />

      <section className="flex flex-col gap-4 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-secondary font-mono text-xs uppercase tracking-wider font-semibold border border-outline-variant/20">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            One page per screening
          </span>
          <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
            <ShieldCheck size={16} className="text-secondary" />
            <span>Original image sent to the screening service</span>
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-on-surface tracking-tight">
              Screen a handwriting sample
            </h1>
            <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
              Upload one page of handwriting. The service scores it with a five-fold ConvNeXt-Tiny
              ensemble and returns a page-level risk estimate with explanation overlays.
            </p>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant text-sm font-mono">
            <span>
              Model: <strong className="text-on-surface">ConvNeXt-Tiny · 5-fold</strong>
            </span>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3.5 shadow-sm border border-outline-variant/20">
          <div className="p-2 bg-surface-container rounded-lg text-secondary shrink-0 mt-0.5">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1">
            <span className="text-sm font-semibold text-on-surface">Screening aid</span>
            <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
              The result is a risk estimate for educational follow-up, not a diagnosis. It comes
              from one model with two possible outcomes: a potential dyslexia signal at or above
              the 0.50 threshold, or a typical pattern below it.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-7 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {!selectedFile ? (
              <motion.div
                key="upload-zone"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-6px)' }}
                transition={{ duration: 0.16, ease: easeOut }}
                className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-5 border border-outline-variant/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                    <h2 className="text-xl font-semibold text-on-surface">Choose an image</h2>
                  </div>
                  <span className="font-mono text-xs text-on-surface-variant font-semibold">
                    STEP 01/02
                  </span>
                </div>

                <div
                  className="relative group cursor-pointer rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all bg-surface-container-low hover:bg-surface-container border-2 border-dashed border-outline-variant/40 hover:border-secondary"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="relative mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm group-hover:scale-105 transition-transform">
                      <CloudUpload size={32} />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-on-surface mb-1">
                    Drag and drop an image here
                  </h3>
                  <p className="text-base text-on-surface-variant mb-4">or choose a file</p>
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-semibold text-sm shadow-sm border border-outline-variant/30">
                    <Folder size={18} />
                    <span>Browse files</span>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 text-on-surface-variant font-mono text-xs">
                    <span className="flex items-center gap-1.5">
                      <Check size={16} className="text-secondary" /> PNG, JPG, WEBP, BMP
                    </span>
                    <span className="hidden sm:inline text-outline-variant">•</span>
                    <span className="flex items-center gap-1.5">
                      <Check size={16} className="text-secondary" /> Up to 25 MB
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="selected-stage"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-6px)' }}
                transition={{ duration: 0.16, ease: easeOut }}
                className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-6 border border-outline-variant/30"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <ScanBarcode className="text-secondary" size={22} />
                    <h2 className="text-xl font-semibold text-on-surface">Selected image</h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    Ready to screen
                  </span>
                </div>

                <div className="relative bg-surface-container-low rounded-xl p-4 flex flex-col md:flex-row gap-5 items-stretch border border-outline-variant/20">
                  <div className="relative md:w-56 h-44 rounded-lg overflow-hidden shrink-0 shadow-sm bg-surface-container flex items-center justify-center">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Selected handwriting sample"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-outline-variant/20 flex flex-col items-center justify-center text-on-surface-variant font-mono text-xs p-2 text-center">
                        <ScanBarcode size={28} className="text-secondary mb-1" />
                        <span>{selectedFile.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between py-1 gap-4">
                    <div className="space-y-2">
                      <span className="font-mono text-sm font-semibold text-on-surface break-all block">
                        {fileMeta.name || selectedFile.name}
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-surface-container rounded-lg p-2 flex flex-col border border-outline-variant/10">
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            File size
                          </span>
                          <span className="font-mono text-[10px] text-on-surface font-semibold">
                            {fileMeta.size}
                          </span>
                        </div>
                        <div className="bg-surface-container rounded-lg p-2 flex flex-col border border-outline-variant/10">
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            Dimensions
                          </span>
                          <span className="font-mono text-[10px] text-on-surface font-semibold">
                            {fileMeta.dimensions}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        The image is uploaded unchanged. The service validates and resizes it for
                        the model.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-medium transition-colors border border-outline-variant/20 cursor-pointer"
                      >
                        <Refresh size={16} />
                        <span>Choose different</span>
                      </button>
                      <button
                        onClick={handleRemove}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-error-container hover:text-on-error-container text-on-surface-variant transition-colors text-sm font-medium border border-outline-variant/20 cursor-pointer"
                      >
                        <Trash size={16} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <Button
                    onClick={handleScreen}
                    className="w-full sm:flex-1 py-3 px-6 text-sm font-semibold"
                    icon={Brain}
                  >
                    Run screening
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-5 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LightBulb className="text-secondary" size={22} />
                <h2 className="text-xl font-semibold text-on-surface">Before you upload</h2>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-semibold border border-outline-variant/20">
                Image tips
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Clear, evenly lit pages give the model the best view of the handwriting.
            </p>

            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  icon: EditPencil,
                  title: 'One full page of handwriting',
                  desc: 'Natural sentences on plain or faintly lined paper. Whole page, not a single word.',
                },
                {
                  icon: MediaImageXmark,
                  title: 'Sharp, not blurred',
                  desc: 'Hold the camera steady or use a scanner so strokes stay legible.',
                },
                {
                  icon: Brightness,
                  title: 'Visible ink',
                  desc: 'Dark blue or black ink on white paper gives the clearest contrast.',
                },
                {
                  icon: SunLight,
                  title: 'Even lighting',
                  desc: 'Avoid flash glare and hard shadows across the page.',
                },
              ].map((tip) => (
                <div
                  key={tip.title}
                  className="p-3 rounded-lg bg-surface-container-low flex items-start gap-3 border border-outline-variant/10"
                >
                  <div className="p-1.5 rounded-md bg-surface-container text-secondary shrink-0 mt-0.5">
                    <tip.icon size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-on-surface">{tip.title}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-4 border border-outline-variant/30">
            <div className="flex items-center gap-2">
              <List className="text-secondary" size={22} />
              <h2 className="text-xl font-semibold text-on-surface">What happens next</h2>
            </div>
            <ul className="space-y-2.5 text-xs text-on-surface">
              {[
                'The page is uploaded to the screening service.',
                'Five folds score the same image; the mean becomes the risk score.',
                'The result page shows the outcome, the spread across folds, and overlays.',
              ].map((txt) => (
                <li key={txt} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={14} />
                  </div>
                  <span>{txt}</span>
                </li>
              ))}
            </ul>
            <div className="p-3 bg-surface-container rounded-lg flex items-start gap-2.5 text-on-surface-variant text-xs border border-outline-variant/10">
              <ShieldCheck size={18} className="text-secondary shrink-0 mt-0.5" />
              <p>
                A screening is not a diagnosis and does not replace assessment by a qualified
                specialist.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-12 pt-6 border-t border-surface-container flex flex-col md:flex-row items-center justify-between gap-4 text-on-surface-variant text-xs">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-secondary" />
          <p>
            NeuroWrite AI provides an educational handwriting screening aid. Results should always
            be considered alongside observation and specialist assessment.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
          <span>MODEL: CONVNEXT-TINY</span>
          <span>ENSEMBLE: 5 FOLDS</span>
        </div>
      </section>
    </div>
  );
}
