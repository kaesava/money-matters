'use client';

import React, { useEffect, useRef } from 'react';
import { DESIGN_TOKENS } from '../tokens.js';
import { t } from '@money-matters/i18n';
import type { TargetCelebrationItem } from '@money-matters/types';

export interface CelebrationBannerProps {
  readonly targetsHit: readonly TargetCelebrationItem[];
  readonly formatCurrency?: (val: number | string) => string;
}

export const CelebrationBanner: React.FC<CelebrationBannerProps> = ({
  targetsHit,
  formatCurrency,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fmt = formatCurrency ?? ((v: number | string) => (typeof v === 'number' ? `$${v.toFixed(2)}` : String(v)));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    const height = (canvas.height = 160);

    const colors = [
      DESIGN_TOKENS.colors.sereneBlue,
      DESIGN_TOKENS.colors.success,
      '#f59e0b',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
    ];

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vRot: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 80,
        y: height / 2 + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    const startTime = Date.now();
    const durationMs = 2400;

    const render = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gravity
        p.rotation += p.vRot;
        p.opacity = Math.max(0, 1 - progress);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (!targetsHit || targetsHit.length === 0) return null;

  const isMulti = targetsHit.length > 1;
  const title = isMulti
    ? t('paydayDrawer.celebrationMultiTitle', { count: targetsHit.length })
    : t('paydayDrawer.celebrationSingleTitle');

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:via-blue-950/40 dark:to-indigo-950/40 border border-emerald-500/20 dark:border-emerald-600/30 p-4 shadow-xs">
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      />

      <div className="relative z-10 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎉</span>
            <h4 className="text-sm font-extrabold text-[#1B2B4B] dark:text-zinc-100">
              {title}
            </h4>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-200">
            {targetsHit.length} {t('common.target')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {targetsHit.map((target, idx) => {
            const isGoalMet = target.type === 'GOAL_TARGET_MET';
            const isRecurringGoal = target.type === 'RECURRING_GOAL_FUNDED';
            const isBillsCovered = target.type === 'BILLS_COVERED';
            const isSurplus = target.type === 'SURPLUS_SWEPT';

            const icon = isGoalMet ? '🏆' : isRecurringGoal ? '✨' : isBillsCovered ? '🛡️' : '🚀';

            const subtitle = isGoalMet
              ? t('paydayDrawer.celebrationGoalMet', { amount: fmt(target.amount) })
              : isRecurringGoal
              ? t('paydayDrawer.celebrationRecurringGoalFunded', { amount: fmt(target.amount) })
              : isBillsCovered
              ? t('paydayDrawer.celebrationBillsCoveredDesc')
              : t('paydayDrawer.celebrationSurplusSwept', { amount: fmt(target.amount) });

            return (
              <div
                key={`${target.id}-${idx}`}
                className="flex items-start gap-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-emerald-500/15 dark:border-emerald-700/30 p-2.5 backdrop-blur-xs"
              >
                <span className="text-sm shrink-0">{icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#1B2B4B] dark:text-zinc-200">
                    {target.name}
                  </p>
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    {subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CelebrationBanner;
