import { isIOS } from './platform';

export interface AppleProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
}

export const APPLE_PRODUCT_IDS = {
  pro_monthly: 'pro_monthly',
  pro_annual: 'pro_annual',
  premium_monthly: 'premium_monthly',
  premium_annual: 'premium_annual',
} as const;

let storePlugin: any = null;

function getStore(): any {
  if (storePlugin) return storePlugin;
  try {
    if (typeof (window as any).CdvPurchase !== 'undefined') {
      storePlugin = (window as any).CdvPurchase.store;
      return storePlugin;
    }
  } catch {
  }
  return null;
}

export async function initializeAppleIAP(): Promise<boolean> {
  if (!isIOS()) return false;
  const store = getStore();
  if (!store) {
    console.warn('Apple IAP plugin not available - will be available in native build');
    return false;
  }
  return true;
}

export async function purchaseProduct(productId: string): Promise<boolean> {
  if (!isIOS()) {
    console.error('Apple IAP only available on iOS');
    return false;
  }

  const store = getStore();
  if (!store) {
    console.warn('Apple IAP not available - purchases only work in native iOS app');
    return false;
  }

  try {
    return new Promise((resolve) => {
      store.order(productId).then(
        () => resolve(true),
        (err: any) => {
          console.error('Purchase failed:', err);
          resolve(false);
        }
      );
    });
  } catch {
    console.error('Purchase failed - IAP not available');
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!isIOS()) return false;
  const store = getStore();
  if (!store) return false;

  try {
    store.refresh();
    return true;
  } catch {
    return false;
  }
}
