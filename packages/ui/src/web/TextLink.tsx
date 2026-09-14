'use client';

import React from 'react';

export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}

export function TextLink({
  children,
  className = '',
  external = false,
  target,
  rel,
  ...props
}: TextLinkProps) {
  const externalProps = external
    ? { target: target || '_blank', rel: rel || 'noopener noreferrer' }
    : { target, rel };

  return (
    <a
      className={`text-[#2563eb] hover:underline font-semibold transition-colors cursor-pointer select-none ${className}`}
      {...externalProps}
      {...props}
    >
      {children}
    </a>
  );
}

export default TextLink;
