'use client';

import React from 'react';

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor?: string;
  required?: boolean;
  children?: React.ReactNode;
  label?: React.ReactNode;
  className?: string;
}

export function FormLabel({
  htmlFor,
  required,
  children,
  label,
  className = '',
  ...props
}: FormLabelProps) {
  const content = children ?? label;
  return (
    <label
      htmlFor={htmlFor}
      className={`text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 select-none ${className}`}
      {...props}
    >
      {content}
      {required && <span className="text-rose-500 ml-0.5 font-bold">*</span>}
    </label>
  );
}

export default FormLabel;
