import { registerPlugin } from '@capacitor/core';

export interface AuthSessionPlugin {
  start(options: {
    url: string;
    callbackUrlScheme: string;
    preferEphemeralSession?: boolean;
  }): Promise<{ url: string }>;
}

const AuthSession = registerPlugin<AuthSessionPlugin>('AuthSession', {
  web: () => import('./web').then((m) => new m.AuthSessionWeb()),
});

export { AuthSession };
