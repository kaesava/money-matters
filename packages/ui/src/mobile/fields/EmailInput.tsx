import React from 'react';
import { Input, InputProps } from '../Input';

export const EmailInput: React.FC<InputProps> = (props) => {
  return (
    <Input
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="email"
      {...props}
    />
  );
};

export default EmailInput;
