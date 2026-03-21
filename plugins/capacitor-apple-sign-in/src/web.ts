import { WebPlugin } from '@capacitor/core';
import type { AppleSignInPlugin, AppleSignInResult } from './index';

export class AppleSignInWeb extends WebPlugin implements AppleSignInPlugin {
  async signIn(): Promise<AppleSignInResult> {
    throw new Error('Apple Sign In is only available on iOS devices');
  }
}
