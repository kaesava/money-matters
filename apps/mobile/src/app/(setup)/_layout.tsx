import { Stack } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { SetupWizardProvider } from '../../context/SetupWizardContext';

export default function SetupLayout() {
  return (
    <SetupWizardProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: DESIGN_TOKENS.colors.background },
          animation: 'slide_from_right',
          gestureEnabled: false, // prevent back-swipe during wizard
        }}
      />
    </SetupWizardProvider>
  );
}

