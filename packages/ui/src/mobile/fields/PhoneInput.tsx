import React from 'react';
import { Input, InputProps } from '../Input';

export const PhoneInput: React.FC<InputProps> = (props) => {
  return (
    <Input
      keyboardType="phone-pad"
      autoComplete="tel"
      {...props}
    />
  );
};

export default PhoneInput;
