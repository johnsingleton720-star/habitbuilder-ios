import { registerPlugin } from '@capacitor/core';

export interface AppleSignInResult {
  user: string;
  identityToken?: string;
  authorizationCode?: string;
  email?: string;
  givenName?: string;
  familyName?: string;
}

export interface AppleSignInPlugin {
  signIn(): Promise<AppleSignInResult>;
}

const AppleSignIn = registerPlugin<AppleSignInPlugin>('AppleSignIn', {
  web: () => import('./web').then((m) => new m.AppleSignInWeb()),
});

export { AppleSignIn };
