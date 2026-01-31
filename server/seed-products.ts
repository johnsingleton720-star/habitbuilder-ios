import { getUncachableStripeClient } from './stripeClient';

const TARGET_PRICE = 600; // $6.00 in cents
const PRODUCT_NAME = 'Habit Builder Pro';
const OLD_PRODUCT_NAME = 'Habit Builder Lifetime Access';

async function createSubscriptionProduct() {
  const stripe = await getUncachableStripeClient();

  // Check for existing subscription product
  const products = await stripe.products.search({ query: `name:'${PRODUCT_NAME}'` });
  
  if (products.data.length > 0) {
    const product = products.data[0];
    console.log('Habit Builder Pro subscription already exists:', product.id);
    
    const prices = await stripe.prices.list({ product: product.id, active: true });
    const currentPrice = prices.data.find(p => 
      p.unit_amount === TARGET_PRICE && 
      p.recurring?.interval === 'month'
    );
    
    if (currentPrice) {
      console.log('Monthly $6 price already exists:', currentPrice.id);
      return;
    }
    
    // Deactivate old prices and create new $6/month price
    console.log('Creating new $6/month price...');
    
    for (const oldPrice of prices.data) {
      if (oldPrice.unit_amount !== TARGET_PRICE || oldPrice.recurring?.interval !== 'month') {
        await stripe.prices.update(oldPrice.id, { active: false });
        console.log('Deactivated old price:', oldPrice.id);
      }
    }
    
    const newPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: TARGET_PRICE,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    
    console.log('Created new subscription price:', newPrice.id, '($6/month)');
    return;
  }

  // Deactivate old lifetime product if it exists
  const oldProducts = await stripe.products.search({ query: `name:'${OLD_PRODUCT_NAME}'` });
  for (const oldProduct of oldProducts.data) {
    if (oldProduct.active) {
      await stripe.products.update(oldProduct.id, { active: false });
      console.log('Deactivated old lifetime product:', oldProduct.id);
    }
  }

  // Create new subscription product
  const product = await stripe.products.create({
    name: PRODUCT_NAME,
    description: 'Monthly subscription for full access to Habit Builder - AI-powered habit coaching',
    metadata: {
      type: 'subscription',
    }
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: TARGET_PRICE,
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  console.log('Created subscription product:', product.id);
  console.log('Created subscription price:', price.id, '($6/month)');
}

createSubscriptionProduct().catch(console.error);
