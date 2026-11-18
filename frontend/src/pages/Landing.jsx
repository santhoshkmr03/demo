import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  ArrowRight,
  Play,
  Network,
  ElectronicsChip,
  CheckCircle,
  CloudUpload,
  Cpu,
  GraphUp,
  HalfMoon,
  SunLight,
} from 'iconoir-react';
import { useTheme } from '../context/ThemeContext';

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();

  const easeOut = [0.23, 1, 0.32, 1];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(12px)' },
    visible: {
      opacity: 1,
      transform: 'translateY(0px)',
      transition: { duration: 0.28, ease: easeOut },
    },
  };

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
        <div className="h-16 max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary text-on-primary font-bold flex items-center justify-center">
                N
              </div>
              <span className="text-xl text-on-surface tracking-tight font-semibold">
                NeuroWrite AI
              </span>
            </div>
            <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] uppercase font-bold tracking-wider">
              Handwriting screening
            </span>
          </div>
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#platform" className="font-medium text-on-surface transition-colors">
              Platform
            </a>
            <a
              href="#pipeline-breakdown"
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              How it works
            </a>
            <a
              href="#system-architecture"
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Technology
            </a>
            <a
              href="#governance"
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Governance
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <SunLight size={19} className="text-amber-400" />
              ) : (
                <HalfMoon size={19} />
              )}
            </button>
            <Link
              to="/login"
              className="hidden sm:inline-flex px-4 py-2 font-medium text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded-lg"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-4 py-2 font-medium text-sm bg-primary text-on-primary hover:opacity-90 rounded-lg transition-all shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full pt-16 flex-1 flex flex-col">
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-secondary-container/40 via-surface-container/20 to-transparent blur-3xl pointer-events-none -z-10" />

          <section className="max-w-7xl mx-auto px-6 pt-16 pb-12 w-full" id="platform">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6"
            >
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-high shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-secondary relative" />
                <span className="font-mono text-xs text-on-surface-variant tracking-wider uppercase font-semibold">
                  Page-level screening · ConvNeXt-Tiny · Five-fold ensemble
                </span>
              </motion.div>
              <motion.h1
                variants={itemVariants}
                className="text-5xl lg:text-6xl font-semibold text-on-surface tracking-tight leading-tight"
              >
                Understand handwriting patterns with AI
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="text-lg text-on-surface-variant max-w-3xl"
              >
                NeuroWrite AI scores a page of handwriting for patterns associated with dyslexia
                research, and shows where the model looked. One risk score, one binary outcome, and
                explanation overlays — no invented condition classes.
              </motion.p>
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full sm:w-auto"
              >
                <Link
                  to="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 font-medium text-sm bg-primary text-on-primary hover:opacity-90 rounded-lg shadow-md transition-all active:scale-[0.98]"
                >
                  <span>Get started</span>
                  <ArrowRight size={18} />
                </Link>
                <a
                  href="#pipeline-breakdown"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 font-medium text-sm bg-surface-container-lowest text-on-surface hover:bg-surface-container rounded-lg shadow-sm transition-all border border-outline-variant/30 active:scale-[0.98]"
                >
                  <Play size={18} className="text-secondary" />
                  <span>See how it works</span>
                </a>
              </motion.div>
              <motion.div
                variants={itemVariants}
                className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-2 text-on-surface-variant text-xs font-medium"
              >
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-secondary" /> Screening aid, not a diagnosis
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle size={16} className="text-secondary" /> Binary outcome at a 0.50 threshold
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Network size={16} className="text-secondary" /> Five-fold ensemble
                </span>
              </motion.div>
            </motion.div>
          </section>

          <section className="max-w-7xl mx-auto px-6 pb-20 w-full">
            <div className="relative bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden p-6 md:p-8 border border-outline-variant/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 mb-4 bg-surface-container-low px-4 py-3 rounded-lg border border-outline-variant/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                  <span className="text-lg font-semibold text-on-surface">Screening pipeline</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs text-on-surface-variant">
                  <span>INPUT: <strong className="text-on-surface text-sm">One page</strong></span>
                  <span>DEVICE: <strong className="text-on-surface text-sm">PyTorch</strong></span>
                  <span className="hidden md:inline-flex items-center gap-1.5 text-secondary font-semibold">
                    <ElectronicsChip size={16} /> ConvNeXt-Tiny · MIL
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
                {[
                  {
                    stage: '01',
                    status: 'Input',
                    title: 'Handwriting image',
                    desc: 'A scanned or photographed page of handwriting.',
                    visual: (
                      <div className="w-full h-full flex flex-col justify-center items-center p-3 text-center">
                        <div className="w-full border-b border-dashed border-outline-variant/30 pb-2 mb-2">
                          <span className="font-serif italic text-lg tracking-widest text-on-surface/80">
                            b d p q
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-on-surface-variant">
                          One page per screening
                        </span>
                      </div>
                    ),
                  },
                  {
                    stage: '02',
                    status: 'Validated',
                    title: 'Image check',
                    desc: 'The service confirms it can open and resize the image.',
                    visual: (
                      <div className="w-full h-full flex flex-col justify-center items-center p-3 text-center space-y-2">
                        <CheckCircle size={26} className="text-secondary" />
                        <span className="text-[10px] font-mono text-on-surface-variant">
                          PNG · JPG · WEBP · BMP
                        </span>
                      </div>
                    ),
                  },
                  {
                    stage: '03',
                    status: 'Scored',
                    title: 'Five-fold inference',
                    desc: 'Each fold scores the page; the mean becomes the risk score.',
                    visual: (
                      <div className="w-full h-full flex flex-col justify-center items-center p-3 text-center space-y-2">
                        <div className="flex items-end gap-1.5 h-14">
                          {[40, 55, 47, 62, 50].map((h, i) => (
                            <div
                              key={i}
                              className="w-3 rounded-t bg-secondary/70"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-mono text-secondary font-semibold">
                          Mean of 5 scores
                        </span>
                      </div>
                    ),
                  },
                  {
                    stage: '04',
                    status: 'Result',
                    title: 'Outcome and overlays',
                    desc: 'One binary outcome, the spread across folds, and attention maps.',
                    visual: (
                      <div className="w-full h-full flex flex-col justify-center items-center p-3 text-center space-y-2">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container text-on-surface text-xs font-mono font-bold">
                          <span>Typical · ≥ 0.50 = signal</span>
                        </div>
                        <span className="text-[10px] font-mono text-on-surface-variant">
                          Attention · Grad-CAM · IG
                        </span>
                      </div>
                    ),
                  },
                ].map((s) => (
                  <motion.div
                    key={s.stage}
                    whileHover={shouldReduceMotion ? {} : { transform: 'translateY(-2px)' }}
                    transition={{ duration: 0.18, ease: easeOut }}
                    className="flex flex-col rounded-lg p-4 shadow-sm border border-outline-variant/20 relative transition-shadow hover:shadow-md bg-surface-container-low"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
                        Stage {s.stage}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded font-medium bg-surface-container text-on-surface">
                        {s.status}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-on-surface mb-1">{s.title}</h3>
                    <p className="text-xs text-on-surface-variant mb-3">{s.desc}</p>
                    <div className="mt-auto bg-surface-container-lowest border border-outline-variant/10 rounded-md p-3 h-44 flex flex-col justify-center items-center">
                      {s.visual}
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 pt-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-on-surface-variant text-xs font-medium border-t border-surface-container">
                <div className="flex items-center gap-2">
                  <ElectronicsChip size={16} className="text-secondary" />
                  <span>
                    Pipeline status: <strong className="text-on-surface">ready for screening</strong>
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono text-[11px]">
                  <span>Five-fold ConvNeXt-Tiny</span>
                  <span className="text-outline-variant">•</span>
                  <span className="text-secondary font-semibold">Grad-CAM + Integrated Gradients</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="bg-surface w-full" id="system-architecture">
          <div className="max-w-7xl mx-auto px-6 py-24">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-2">
              <span className="font-mono text-xs text-secondary uppercase tracking-widest font-bold">
                Technology
              </span>
              <h2 className="text-4xl font-semibold text-on-surface tracking-tight">
                Built for educational screening
              </h2>
              <p className="text-base text-on-surface-variant">
                Small, inspectable pieces: a page-level score, the fold spread, and the regions the
                model attended to.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: ElectronicsChip,
                  title: 'Page-level scoring',
                  desc: 'A ConvNeXt-Tiny backbone with Attention MIL pooling, averaged over five cross-validation folds. The output is one risk score, not a set of condition probabilities.',
                },
                {
                  icon: Cpu,
                  title: 'Explanation overlays',
                  desc: 'Attention, Grad-CAM, and Integrated Gradients views of the same page, generated with the screening result. They support discussion; they are not evidence of a diagnosis.',
                },
                {
                  icon: GraphUp,
                  title: 'Screening history',
                  desc: 'Completed screenings are saved with Supabase when it is configured, and in this browser otherwise. The history shows the same fields the service returned.',
                },
              ].map((f) => (
                <motion.div
                  key={f.title}
                  whileHover={shouldReduceMotion ? {} : { transform: 'translateY(-3px)' }}
                  transition={{ duration: 0.2, ease: easeOut }}
                  className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-8 shadow-sm hover:shadow-md transition-all flex flex-col"
                >
                  <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-on-surface mb-6">
                    <f.icon size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-on-surface mb-2">{f.title}</h3>
                  <p className="text-sm text-on-surface-variant flex-1">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-surface w-full" id="pipeline-breakdown">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-8 md:p-12 shadow-md">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div>
                  <span className="font-mono text-xs text-secondary uppercase tracking-widest font-bold">
                    Methodology
                  </span>
                  <h2 className="text-3xl font-semibold text-on-surface mt-2 tracking-tight">
                    Four steps from page to result
                  </h2>
                </div>
                <p className="text-base text-on-surface-variant max-w-md">
                  Each step maps to something the service actually does, and to a field on the
                  result page.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                {[
                  {
                    num: '01',
                    icon: CloudUpload,
                    title: 'Upload',
                    desc: 'Choose one page as PNG, JPG, WEBP, or BMP, up to 25 MB.',
                    tag: 'Input: one image',
                  },
                  {
                    num: '02',
                    icon: ShieldCheck,
                    title: 'Validate',
                    desc: 'The service checks the file type, opens it with PIL, and prepares it for the model.',
                    tag: 'No OCR, no client-side scoring',
                  },
                  {
                    num: '03',
                    icon: ElectronicsChip,
                    title: 'Score',
                    desc: 'ConvNeXt-Tiny with Attention MIL scores the page in each of five folds.',
                    tag: 'Output: five scores + mean',
                  },
                  {
                    num: '04',
                    icon: GraphUp,
                    title: 'Review',
                    desc: 'Read the risk percentage, the fold spread, and the explanation overlays.',
                    tag: 'Outcome: signal or typical',
                  },
                ].map((step) => (
                  <div key={step.num} className="flex flex-col relative space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-secondary shadow-sm">
                        <step.icon size={22} />
                      </div>
                      <span className="font-mono text-3xl font-bold text-outline-variant/50">
                        {step.num}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-on-surface">{step.title}</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{step.desc}</p>
                    <div className="pt-2">
                      <span className="inline-block px-2.5 py-1 rounded bg-surface-container text-on-surface-variant text-[11px] font-mono font-medium">
                        {step.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className="bg-surface-container-low w-full py-16 border-t border-outline-variant/10"
          id="governance"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
              <div className="flex items-start gap-4 max-w-3xl">
                <div className="p-3 rounded-lg bg-surface-container text-secondary shrink-0 mt-1">
                  <ShieldCheck size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-on-surface">
                    Screening aid, not a diagnosis
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    NeuroWrite AI is a handwriting screening tool for educators, parents, and
                    researchers. It reports a risk estimate and the model's explanation, and does not
                    provide psychological, neurological, or medical diagnoses.
                  </p>
                </div>
              </div>
              <Link
                to="/signup"
                className="shrink-0 px-5 py-2.5 bg-secondary text-on-secondary hover:opacity-90 rounded-lg font-medium text-sm transition-all shadow-sm"
              >
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container-lowest border-t border-outline-variant/20 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant font-medium">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
              N
            </div>
            <span className="font-semibold text-on-surface">NeuroWrite AI</span>
            <span>• Handwriting screening</span>
          </div>
          <div>
            <span>© 2026 NeuroWrite AI. Educational screening aid only.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
