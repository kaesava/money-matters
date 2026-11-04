import React from 'react';
import { InfoTooltip, AlertBanner } from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';

export interface EnvelopeEventsToggleSectionProps {
  generateEvents: boolean;
  setGenerateEvents: (val: boolean) => void;
  initialGenerateEvents?: boolean;
  hasExistingScheduledEvents?: boolean;
}

export function EnvelopeEventsToggleSection({
  generateEvents,
  setGenerateEvents,
  initialGenerateEvents = true,
  hasExistingScheduledEvents = false,
}: EnvelopeEventsToggleSectionProps) {
  const isModified = generateEvents !== initialGenerateEvents;

  return (
    <div className="pt-1">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={generateEvents}
          onChange={(e) => setGenerateEvents(e.target.checked)}
          className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]"
        />
        <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <span>{t('categories.generateEventsLabel')}</span>
          <InfoTooltip content={t('categories.tooltips.generateEvents')} align="left" />
        </span>
      </label>

      {isModified && (
        <div className="mt-2.5">
          {generateEvents ? (
            <AlertBanner variant="info" className="py-2.5 px-3">
              {t('categories.generateEventsCheckedImplication')}
            </AlertBanner>
          ) : (
            <AlertBanner variant="warning" className="py-2.5 px-3">
              {hasExistingScheduledEvents
                ? t('categories.generateEventsUncheckedEditImplication')
                : t('categories.generateEventsUncheckedNewImplication')}
            </AlertBanner>
          )}
        </div>
      )}
    </div>
  );
}
