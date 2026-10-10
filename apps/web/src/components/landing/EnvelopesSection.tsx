'use client';

import React from 'react';
import { EnvelopeExplainer } from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';

export function EnvelopesSection() {
  return (
    <section className="py-12 bg-white/60 dark:bg-zinc-900/60 border-y border-zinc-200/80 dark:border-zinc-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl font-black text-[#1B2B4B] dark:text-zinc-100 tracking-tight">
            {t('landing.envelopeBlueprintTitle')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">
            {t('landing.envelopeBlueprintSubtitle')}
          </p>
        </div>
        <EnvelopeExplainer />
      </div>
    </section>
  );
}
