import React from 'react';
import { InfoTooltip } from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';

export interface EnvelopeSurplusTargetFieldProps {
  isSurplusTarget: boolean;
  setIsSurplusTarget: (val: boolean) => void;
  isSurplusDisabled: boolean;
}

export function EnvelopeSurplusTargetField({
  isSurplusTarget,
  setIsSurplusTarget,
  isSurplusDisabled,
}: EnvelopeSurplusTargetFieldProps) {
  return (
    <div className="pt-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isSurplusTarget}
          disabled={isSurplusDisabled}
          onChange={(e) => setIsSurplusTarget(e.target.checked)}
          className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] disabled:opacity-50"
        />
        <span className="font-bold text-zinc-800 flex items-center gap-1.5">
          <span>{t('categories.sweepSurplus')}</span>
          <InfoTooltip content={t('categories.shortfallTargetTooltip')} align="left" />
        </span>
      </label>
    </div>
  );
}
