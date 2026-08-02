module.exports = {
  expo: {
    name: 'Money Matters',
    slug: 'money-matters',
    scheme: 'moneymatters',
    version: '1.0.0',
    platforms: ['android'],
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#1B2B4B',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1B2B4B',
      },
      package: 'com.kaesava.moneymatters',
      permissions: ['INTERNET', 'ACCESS_NETWORK_STATE'],
    },
    plugins: [
      'expo-router',
      'expo-sqlite',
      'expo-web-browser',
      'expo-secure-store',
      '@react-native-community/datetimepicker',
    ],
    extra: {
      privacyPolicyUrl: 'https://moneymatters.kaesava.au/privacy',
      router: {},
      eas: {
        projectId: '5cf01baf-7dc6-43bf-aa23-a72da2de4aaf',
      },
      // PostHog analytics configuration — read from environment at build time
      posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
      posthogHost: process.env.POSTHOG_HOST,
    },
  },
};
