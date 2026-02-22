import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pro.habitbuilder.app',
  appName: 'HabitBuilder',
  webDir: 'dist/public',
  server: {
    url: 'https://habitbuilder.pro',
    cleartext: false,
  },
  ios: {
    scheme: 'HabitBuilder',
    contentInset: 'automatic',
    backgroundColor: '#0f1a12',
  },
};

export default config;
