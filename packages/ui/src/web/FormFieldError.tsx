'use client';

import React from 'react';

export interface FormFieldErrorProps {
  error?: string | null;
  className?: string;
  id?: string;
}

export function FormFieldError({ error, className = '', id }: FormFieldErrorProps) {
  if (!error) return null;

  return (
    <p
      id={id}
      role="alert"
      className={`mt-1 text-xs font-semibold text-rose-600 animate-in fade-in slide-in-from-top-1 ${className}`}
    >
      {error}
    </p>
  );
}

export default FormFieldError;
