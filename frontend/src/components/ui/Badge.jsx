import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Small status pill.
 *
 * The screening model has two outcomes, so the default vocabulary is
 * `elevated` / `typical`. `info` is for neutral metadata.
 */
export function Badge({ children, variant = 'neutral', className, showDot = false }) {
  const variants = {
    elevated: 'bg-error-container/60 text-error border border-error/20',
    typical: 'bg-secondary-container/40 text-secondary border border-secondary/20',
    info: 'bg-surface-container text-on-surface border border-outline-variant/30',
    neutral: 'bg-surface-container-low text-on-surface-variant border border-outline-variant/40',
  };

  const dotColors = {
    elevated: 'bg-error',
    typical: 'bg-secondary',
    info: 'bg-on-surface',
    neutral: 'bg-outline-variant',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-mono',
        variants[variant],
        className
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}
