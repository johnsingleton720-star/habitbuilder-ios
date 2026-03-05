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

async function validateReceiptOnServer(receiptData: string, productId: string): Promise<boolean> {
  try {
    console.log('[IAP] Validating receipt on server for product:', productId);
    const res = await fetch('/api/apple/validate-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ receiptData, productId }),
    });
    const data = await res.json();
    console.log('[IAP] Server validation response:', data);
    return data.success === true;
  } catch (err) {
    console.error('[IAP] Receipt validation failed:', err);
    return false;
  }
}

export async function initializeAppleIAP(): Promise<boolean> {
  if (!isIOS()) return false;
  if (initialized) return true;

  const store = getStore();
  if (!store) {
    console.warn('[IAP] Apple IAP plugin not available - will be available in native build');
    return false;
  }

  try {
    const CdvPurchase = (window as any).CdvPurchase;
    const Platform = CdvPurchase?.Platform;

    if (!Platform) {
      console.error('[IAP] CdvPurchase.Platform not available');
      return false;
    }

    store.verbosity = CdvPurchase.LogLevel.DEBUG;

    const productList = Object.values(APPLE_PRODUCT_IDS).map(id => ({
      id,
      type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      platform: Platform.APPLE_APPSTORE,
    }));

    console.log('[IAP] Registering products:', productList.map(p => p.id));
    store.register(productList);

    store.when()
      .approved(async (transaction: any) => {
        console.log('[IAP] Transaction approved:', transaction.transactionId);
        try {
          const receipt = transaction.parentReceipt?.nativeData?.appStoreReceipt
            || transaction.nativeData?.appStoreReceipt;
          const productId = transaction.products?.[0]?.id || '';

          if (receipt) {
            console.log('[IAP] Found receipt, validating on server...');
            await validateReceiptOnServer(receipt, productId);
          } else {
            console.warn('[IAP] No receipt data found in transaction');
          }

          transaction.finish();
          console.log('[IAP] Transaction finished');
        } catch (err) {
          console.error('[IAP] Error processing approved transaction:', err);
          transaction.finish();
        }
      })
      .finished((transaction: any) => {
        console.log('[IAP] Transaction finished:', transaction.transactionId);
      });

    store.error((error: any) => {
      console.error('[IAP] Store error:', error.code, error.message);
    });

    console.log('[IAP] Initializing store...');
    await store.initialize([Platform.APPLE_APPSTORE]);

    const products = store.products;
    console.log('[IAP] Store initialized. Products loaded:', products.length);
    products.forEach((p: any) => {
      console.log(`[IAP]   Product: ${p.id}, title: ${p.title}, offers: ${p.offers?.length || 0}`);
    });

    initialized = true;
    return true;
  } catch (err) {
    console.error('[IAP] Initialization error:', err);
    return false;
  }
}

export async function purchaseProduct(productId: string): Promise<boolean> {
  if (!isIOS()) {
    console.error('[IAP] Apple IAP only available on iOS');
    return false;
  }

  const store = getStore();
  if (!store) {
    console.warn('[IAP] Apple IAP not available - purchases only work in native iOS app');
    return false;
  }

  if (!initialized) {
    console.log('[IAP] Store not initialized, initializing now...');
    const ready = await initializeAppleIAP();
    if (!ready) {
      console.error('[IAP] Failed to initialize store');
      return false;
    }
  }

  try {
    console.log('[IAP] Looking up product:', productId);
    const product = store.get(productId);
    if (!product) {
      console.error('[IAP] Product not found:', productId);
      const allProducts = store.products;
      console.error('[IAP] Available products:', allProducts.map((p: any) => p.id));
      return false;
    }

    console.log('[IAP] Product found:', product.id, 'offers:', product.offers?.length);

    const offer = product.offers?.[0] || product;
    console.log('[IAP] Ordering offer:', offer.id || product.id);

    return new Promise((resolve) => {
      store.order(offer).then(
        (result: any) => {
          if (result && result.isError) {
            console.error('[IAP] Purchase error:', result.code, result.message);
            resolve(false);
          } else {
            console.log('[IAP] Order placed successfully');
            resolve(true);
          }
        },
        (err: any) => {
          console.error('[IAP] Purchase rejected:', err);
          resolve(false);
        }
      );
    });
  } catch (err) {
    console.error('[IAP] Purchase exception:', err);
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
    console.log('[IAP] Restoring purchases...');
    await store.restorePurchases();
    console.log('[IAP] Restore complete');
    return true;
  } catch (err) {
    console.error('[IAP] Restore failed:', err);
    return false;
  }
}
