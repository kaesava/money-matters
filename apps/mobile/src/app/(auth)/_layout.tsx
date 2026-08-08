import { Stack } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DESIGN_TOKENS.colors.background },
        animation: 'fade',
      }}
    />
  );
}
