import React from 'react';
import { Input, InputProps } from '../Input';

export interface PhoneInputProps extends Omit<InputProps, 'type'> {
  // Add any phone-specific props if needed
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label = 'Phone Number', placeholder = 'e.g. 0412 345 678', ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="tel"
        label={label}
        autoComplete="tel"
        placeholder={placeholder}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
