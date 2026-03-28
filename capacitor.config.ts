import type { CapacitorConfig } from '@capacitor/cli';

/**
 * iOS BUILD CHECKLIST (must complete before App Store submission):
 *
 * 1. SIGN IN WITH APPLE:
 *    - In Apple Developer Console → Certificates, Identifiers & Profiles → Identifiers
 *    - Select "pro.habitbuilder.app" → enable "Sign In with Apple" capability
 *    - In Xcode → Target → Signing & Capabilities → "+ Capability" → "Sign In with Apple"
 *
 * 2. CUSTOM URL SCHEME (for Google auth callback):
 *    - In Xcode → Target → Info → URL Types → add scheme: "habitbuilder" (lowercase)
 *    - This lets ASWebAuthenticationSession route the Google OAuth callback back to the app
 *
 * 3. CAPACITOR PLUGINS (link native code):
 *    - Run: npx cap sync ios
 *    - Verify in Xcode that both pods are present:
 *      - CapacitorAppleSignIn (for Apple Sign In)
 *      - CapacitorAuthSessionPlugin (for Google auth via ASWebAuthenticationSession)
 *
 * 4. VERIFY PODS:
 *    - cd ios/App && pod install
 *    - Check Podfile includes both local plugin pods
 */

const config: CapacitorConfig = {
  appId: 'pro.habitbuilder.app',
  appName: 'HabitBuilder',
  version: '1.2.5',
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
