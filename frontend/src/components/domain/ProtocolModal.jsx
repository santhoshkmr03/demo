import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Xmark, ShieldCheck, Check, WarningTriangle } from 'iconoir-react';

/**
 * Short guide to what the screening model returns and what makes a usable
 * image. No subtype taxonomy, no confidence thresholds, no DPI claims.
 */
export function ProtocolModal({ isOpen, onClose }) {
  const shouldReduceMotion = useReducedMotion();
  const easeOut = [0.23, 1, 0.32, 1];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
        >
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18, ease: easeOut }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-2xl p-6 sm:p-8 font-body text-on-surface max-h-[88vh] overflow-y-auto space-y-6"
          >
            <div className="flex items-start justify-between border-b border-outline-variant/20 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-mono font-bold mb-1.5">
                  Screening guide
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-on-surface">
                  How screening works
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  What the model returns, and what makes a useful handwriting image.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              >
                <Xmark size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface">
                1. Screening outcomes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-error-container/20 border border-error/30 space-y-1">
                  <span className="font-bold text-error font-mono flex items-center gap-1.5">
                    <WarningTriangle size={14} />
                    Potential dyslexia signal
                  </span>
                  <p className="text-on-surface-variant">
                    The mean score across the five folds is at or above the 0.50 screening
                    threshold. Consider specialist follow-up.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-secondary-container/20 border border-secondary/30 space-y-1">
                  <span className="font-bold text-secondary font-mono">Typical pattern</span>
                  <p className="text-on-surface-variant">
                    The mean score is below the 0.50 threshold. This is not proof that no
                    difficulty exists.
                  </p>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                These are two sides of one page-level score. The model does not classify
                handwriting subtypes or produce per-condition probabilities.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface">
                2. Taking a useful image
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  {
                    title: 'One page per screening',
                    body: 'Capture the whole page, including margins, rather than a single word or letter.',
                  },
                  {
                    title: 'Even lighting',
                    body: 'Daylight or diffuse room light. Avoid flash glare, hard shadows, and coloured filters.',
                  },
                  {
                    title: 'Dark ink, plain paper',
                    body: 'Pen or pencil on unlined or faintly lined white paper works best.',
                  },
                  {
                    title: 'Formats',
                    body: 'PNG or JPG. The image is uploaded as-is and resized by the service.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-start gap-2.5"
                  >
                    <Check size={16} className="text-secondary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-on-surface block">{item.title}</span>
                      <span className="text-on-surface-variant">{item.body}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface">
                3. Reading the result
              </h3>
              <ul className="text-xs text-on-surface-variant leading-relaxed space-y-1.5 list-disc pl-4">
                <li>
                  <strong className="text-on-surface">Risk score</strong> — the mean of the five
                  fold scores, from 0 to 1, with the percentage shown alongside.
                </li>
                <li>
                  <strong className="text-on-surface">Spread across folds</strong> — the standard
                  deviation and range of the fold scores, shown as a measure of disagreement.
                </li>
                <li>
                  <strong className="text-on-surface">Overlays</strong> — attention, Grad-CAM, and
                  Integrated Gradients views of the same page, for discussion only.
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-error-container/20 border border-error/30 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-error">
                <ShieldCheck size={16} />
                <span>Screening aid, not a diagnosis</span>
              </div>
              <p className="text-on-surface-variant leading-relaxed">
                A result supports educational observation and a conversation with a specialist. It
                is not a medical or psychological diagnosis and should never be used on its own to
                label a student.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-sm active:scale-[0.98]"
              >
                Close guide
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
