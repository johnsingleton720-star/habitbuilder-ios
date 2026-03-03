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
let initialized = false;

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

async function validateReceipt(receiptData: string, productId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/apple/validate-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ receiptData, productId }),
    });
    const data = await res.json();
    return data.valid === true;
  } catch (err) {
    console.error('Receipt validation failed:', err);
    return false;
  }
}

export async function initializeAppleIAP(): Promise<boolean> {
  if (!isIOS()) return false;
  if (initialized) return true;

  const store = getStore();
  if (!store) {
    console.warn('Apple IAP plugin not available - will be available in native build');
    return false;
  }

  try {
    const CdvPurchase = (window as any).CdvPurchase;
    const Platform = CdvPurchase?.Platform;

    if (Platform) {
      const productList = Object.values(APPLE_PRODUCT_IDS).map(id => ({
        id,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
        platform: Platform.APPLE_APPSTORE,
      }));
      store.register(productList);

      store.when()
        .approved((transaction: any) => {
          const receipt = transaction.parentReceipt?.nativeData?.appStoreReceipt;
          if (receipt) {
            validateReceipt(receipt, transaction.products?.[0]?.id || '');
          }
          transaction.verify();
        })
        .verified((receipt: any) => {
          receipt.finish();
        });

      await store.initialize([Platform.APPLE_APPSTORE]);
    }

    initialized = true;
    return true;
  } catch (err) {
    console.error('IAP initialization error:', err);
    return false;
  }
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

  if (!initialized) {
    const ready = await initializeAppleIAP();
    if (!ready) return false;
  }

  try {
    const offer = store.get(productId);
    if (!offer) {
      console.error('Product not found:', productId);
      return false;
    }

    return new Promise((resolve) => {
      store.order(offer).then(
        (result: any) => {
          if (result && result.isError) {
            console.error('Purchase error:', result);
            resolve(false);
          } else {
            resolve(true);
          }
        },
        (err: any) => {
          console.error('Purchase failed:', err);
          resolve(false);
        }
      );
    });
  } catch (err) {
    console.error('Purchase failed:', err);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!isIOS()) return false;
  const store = getStore();
  if (!store) return false;

  if (!initialized) {
    const ready = await initializeAppleIAP();
    if (!ready) return false;
  }

  try {
    await store.restorePurchases();
    return true;
  } catch {
    return false;
  }
}
