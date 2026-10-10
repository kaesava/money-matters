'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@money-matters/i18n';
import { X, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { Button } from './Button';

export interface TourStepConfig {
  step: number;
  totalSteps: number;
  titleKey: string;
  descKey: string;
  badgeKey?: string;
}

export interface ProductTourPopoverProps {
  stepConfig: TourStepConfig;
  targetRect: DOMRect | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isLastStep: boolean;
}

export function ProductTourPopover({
  stepConfig,
  targetRect,
  onNext,
  onBack,
  onSkip,
  isLastStep,
}: ProductTourPopoverProps) {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft' && stepConfig.step > 1) {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSkip, onNext, onBack, stepConfig.step]);

  if (!mounted) return null;

  let top = 120;
  let left = 24;

  if (targetRect) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const popoverHeight = 240;
    const popoverWidth = 380;

    if (spaceBelow >= popoverHeight + 16) {
      top = targetRect.bottom + 12;
    } else if (spaceAbove >= popoverHeight + 16) {
      top = targetRect.top - popoverHeight - 12;
    } else {
      top = Math.max(16, targetRect.top + 8);
    }

    left = Math.min(
      Math.max(16, targetRect.left),
      window.innerWidth - popoverWidth - 20
    );
  }

  return createPortal(
    <div
      className="fixed z-50 transition-all duration-200 animate-in fade-in zoom-in-95"
      style={{ top: `${top}px`, left: `${left}px`, width: '380px', maxWidth: 'calc(100vw - 32px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={t(stepConfig.titleKey)}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              {t('tour.steps.stepCount', {
                current: stepConfig.step,
                total: stepConfig.totalSteps,
              })}
            </span>
            {stepConfig.badgeKey && (
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t(stepConfig.badgeKey)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={t('tour.controls.skip')}
            aria-label={t('tour.controls.skip')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-sm font-extrabold text-[#1B2B4B] dark:text-white leading-snug">
            {t(stepConfig.titleKey)}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {t(stepConfig.descKey)}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            {t('tour.controls.skip')}
          </button>
          <div className="flex items-center gap-2">
            {stepConfig.step > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                className="!py-1.5 !px-2.5 !text-xs !gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('tour.controls.back')}</span>
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={onNext}
              className="!py-1.5 !px-3.5 !text-xs !gap-1.5 font-bold"
            >
              <span>{isLastStep ? t('tour.controls.finish') : t('tour.controls.next')}</span>
              {isLastStep ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
