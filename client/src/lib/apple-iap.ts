import { isIOS } from './platform';
import { queryClient } from './queryClient';

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
            let success = await validateReceiptOnServer(receipt, productId);

            if (!success) {
              console.log('[IAP] First validation attempt failed, retrying in 2s...');
              await new Promise(r => setTimeout(r, 2000));
              success = await validateReceiptOnServer(receipt, productId);
            }

            if (success) {
              transaction.finish();
              console.log('[IAP] Transaction finished after successful validation');
              queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
              console.log('[IAP] User session cache invalidated - tier will update');
            } else {
              console.warn('[IAP] Server validation failed after retry - transaction NOT finished');
              try {
                const { toast } = await import('@/hooks/use-toast');
                toast({
                  title: "Subscription activation delayed",
                  description: "Your purchase was successful but activation is taking longer than expected. Please restart the app or contact support.",
                  variant: "destructive",
                  duration: 10000,
                });
              } catch (e) { /* toast import may fail in some contexts */ }
            }
          } else {
            console.warn('[IAP] No receipt data found in transaction');
            try {
              const { toast } = await import('@/hooks/use-toast');
              toast({
                title: "Subscription activation issue",
                description: "Your purchase went through but we couldn't verify it. Please restart the app.",
                variant: "destructive",
                duration: 10000,
              });
            } catch (e) { /* toast import may fail */ }
          }
        } catch (err) {
          console.error('[IAP] Error processing approved transaction:', err);
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

export interface PurchaseResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

async function waitForProductReady(store: any, productId: string, maxWait = 5000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const product = store.get(productId);
    if (product && (product.offers?.length > 0 || product.title)) {
      return product;
    }
    console.log('[IAP] Waiting for product to load:', productId);
    await new Promise(r => setTimeout(r, 500));
  }
  return store.get(productId);
}

export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  if (!isIOS()) {
    return { success: false, error: 'not_ios', errorCode: 'NOT_IOS' };
  }

  const store = getStore();
  if (!store) {
    return { success: false, error: 'IAP plugin not available', errorCode: 'NO_PLUGIN' };
  }

  if (!initialized) {
    console.log('[IAP] Store not initialized, initializing now...');
    const ready = await initializeAppleIAP();
    if (!ready) {
      return { success: false, error: 'Failed to initialize store', errorCode: 'INIT_FAILED' };
    }
  }

  try {
    console.log('[IAP] Looking up product:', productId);
    const product = await waitForProductReady(store, productId);
    if (!product) {
      const allProducts = store.products;
      const available = allProducts.map((p: any) => p.id).join(', ');
      console.error('[IAP] Product not found:', productId, 'Available:', available);
      return { success: false, error: `Product not found: ${productId}. Available: ${available}`, errorCode: 'PRODUCT_NOT_FOUND' };
    }

    console.log('[IAP] Product found:', product.id, 'title:', product.title, 'offers:', product.offers?.length, 'canPurchase:', product.canPurchase);

    if (product.offers && product.offers.length > 0) {
      console.log('[IAP] Offers detail:', JSON.stringify(product.offers.map((o: any) => ({ id: o.id, phases: o.pricingPhases?.length }))));
    }

    const offer = product.offers?.[0];
    if (!offer) {
      console.warn('[IAP] No offers on product, ordering product directly');
    }
    const orderTarget = offer || product;
    console.log('[IAP] Ordering:', orderTarget.id || product.id);

    return new Promise((resolve) => {
      store.order(orderTarget).then(
        (result: any) => {
          if (result && result.isError) {
            const errCode = result.code?.toString() || 'UNKNOWN';
            const errMsg = result.message || 'Purchase failed';
            console.error('[IAP] Purchase error:', errCode, errMsg);
            resolve({ success: false, error: errMsg, errorCode: errCode });
          } else {
            console.log('[IAP] Order placed successfully');
            resolve({ success: true });
          }
        },
        (err: any) => {
          const errMsg = err?.message || err?.toString() || 'Purchase rejected';
          console.error('[IAP] Purchase rejected:', errMsg);
          resolve({ success: false, error: errMsg, errorCode: 'REJECTED' });
        }
      );
    });
  } catch (err: any) {
    const errMsg = err?.message || 'Purchase exception';
    console.error('[IAP] Purchase exception:', errMsg);
    return { success: false, error: errMsg, errorCode: 'EXCEPTION' };
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
