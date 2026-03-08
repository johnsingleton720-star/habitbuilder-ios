import { WebPlugin } from '@capacitor/core';
import type { AuthSessionPlugin } from './index';

export class AuthSessionWeb extends WebPlugin implements AuthSessionPlugin {
  async start(options: { url: string; callbackUrlScheme: string; preferEphemeralSession?: boolean }): Promise<{ url: string }> {
    window.location.href = options.url;
    return { url: options.url };
  }
}
