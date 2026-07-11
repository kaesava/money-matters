import React from 'react';
import { Input, InputProps } from '../Input';
import { t } from '@money-matters/i18n';

export interface EmailInputProps extends Omit<InputProps, 'type'> {
  // Add any custom email-specific props here if needed
}

export const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  ({ label = t('dashboard.emailLabel'), ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="email"
        label={label}
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={t('dashboard.emailPlaceholder')}
        {...props}
      />
    );
  }
);

EmailInput.displayName = 'EmailInput';
