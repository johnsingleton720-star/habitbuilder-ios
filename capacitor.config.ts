import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pro.habitbuilder.app',
  appName: 'HabitBuilder',
  webDir: 'dist/public',
  server: {
    url: 'https://habitbuilder.pro',
    cleartext: false,
    allowNavigation: [
      'habitbuilder.pro',
      '*.habitbuilder.pro',
    ],
  },
  ios: {
    scheme: 'HabitBuilder',
    contentInset: 'automatic',
    backgroundColor: '#0f1a12',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f1a12',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0f1a12',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
