import { Capacitor } from '@capacitor/core';

export type AppPlatform = 'ios' | 'android' | 'web';

export function getPlatform(): AppPlatform {
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
  }
  return 'web';
}

export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isWeb(): boolean {
  return !Capacitor.isNativePlatform();
}

export function shouldUseApplePay(): boolean {
  return isIOS();
}

export function shouldUseStripe(): boolean {
  return !isIOS();
}
