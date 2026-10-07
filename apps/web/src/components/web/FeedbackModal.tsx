'use client';

import React, { useState, useMemo } from 'react';
import {
  ModalDialog,
  Button,
  Input,
  FormLabel,
  FormFieldError,
  FormErrorBanner,
  GenericSelectField,
} from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export function FeedbackModal({ isOpen, onClose, userEmail = '' }: FeedbackModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('ui_ux');
  const [severity, setSeverity] = useState<string>('LOW');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(userEmail);
  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const resetForm = () => {
    setTitle('');
    setCategory('ui_ux');
    setSeverity('LOW');
    setDescription('');
    setEmail(userEmail);
    setTitleError('');
    setDescriptionError('');
    setGeneralError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!title.trim()) {
      setTitleError(t('feedback.errorSummaryRequired'));
      hasError = true;
    }
    if (!description.trim()) {
      setDescriptionError(t('feedback.errorDescriptionRequired'));
      hasError = true;
    }
    if (hasError) return;

    try {
      const diagnostics = [
        `Category: ${category}`,
        `Severity: ${severity}`,
        `User Email: ${email.trim() || 'N/A'}`,
        `Route: ${typeof window !== 'undefined' ? window.location.pathname : 'N/A'}`,
        `User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
        `Screen: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}`,
        '',
        'Description:',
        description.trim(),
      ];
      const subject = encodeURIComponent(`[Feedback] ${title.trim()}`);
      const body = encodeURIComponent(diagnostics.join('\n'));
      const mailtoUrl = `mailto:info@moneymatters.kaesava.au?subject=${subject}&body=${body}`;

      window.location.href = mailtoUrl;
      handleClose();
    } catch {
      setGeneralError(t('feedback.openEmailFailed'));
    }
  };

  const categoryOptions = useMemo(
    () => [
      { value: 'ui_ux', label: t('feedback.categories.ui_ux') },
      { value: 'setup', label: t('feedback.categories.setup') },
      { value: 'waterfall', label: t('feedback.categories.waterfall') },
      { value: 'bank_accounts', label: t('feedback.categories.bank_accounts') },
      { value: 'categories_bills', label: t('feedback.categories.categories_bills') },
      { value: 'account_auth', label: t('feedback.categories.account_auth') },
      { value: 'other', label: t('feedback.categories.other') },
    ],
    []
  );

  const severityOptions = useMemo(
    () => [
      { value: 'LOW', label: t('feedback.severities.LOW') },
      { value: 'MEDIUM', label: t('feedback.severities.MEDIUM') },
      { value: 'HIGH', label: t('feedback.severities.HIGH') },
      { value: 'URGENT', label: t('feedback.severities.URGENT') },
    ],
    []
  );

  const isDirty = Boolean(title.trim() || description.trim());

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={handleClose}
      title={t('feedback.title')}
      subtitle={t('feedback.subtitle')}
      isDirty={isDirty}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {generalError && <FormErrorBanner message={generalError} />}

        <div>
          <FormLabel required>{t('feedback.summaryLabel')}</FormLabel>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError('');
            }}
            placeholder={t('feedback.summaryPlaceholder')}
            autoFocus
          />
          {titleError && <FormFieldError error={titleError} />}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>{t('feedback.categoryLabel')}</FormLabel>
            <GenericSelectField
              value={category}
              onChange={setCategory}
              options={categoryOptions}
            />
          </div>
          <div>
            <FormLabel>{t('feedback.severityLabel')}</FormLabel>
            <GenericSelectField
              value={severity}
              onChange={setSeverity}
              options={severityOptions}
            />
          </div>
        </div>

        <div>
          <FormLabel required>{t('feedback.descriptionLabel')}</FormLabel>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (descriptionError) setDescriptionError('');
            }}
            placeholder={t('feedback.descriptionPlaceholder')}
            rows={4}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {descriptionError && <FormFieldError error={descriptionError} />}
        </div>

        <div>
          <FormLabel>{t('feedback.emailLabel')}</FormLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary">
            {t('feedback.submitCta')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
