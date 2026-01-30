import { getUncachableStripeClient } from './stripeClient';

const TARGET_PRICE = 999; // $9.99 in cents

async function createLifetimeProduct() {
  const stripe = await getUncachableStripeClient();

  const products = await stripe.products.search({ query: "name:'HabitGrow Lifetime Access'" });
  
  if (products.data.length > 0) {
    const product = products.data[0];
    console.log('HabitGrow Lifetime Access already exists:', product.id);
    
    const prices = await stripe.prices.list({ product: product.id, active: true });
    const currentPrice = prices.data[0];
    
    if (currentPrice && currentPrice.unit_amount === TARGET_PRICE) {
      console.log('Price is already $9.99:', currentPrice.id);
      return;
    }
    
    // Deactivate old prices and create new $9.99 price
    console.log('Updating price to $9.99...');
    
    for (const oldPrice of prices.data) {
      if (oldPrice.unit_amount !== TARGET_PRICE) {
        await stripe.prices.update(oldPrice.id, { active: false });
        console.log('Deactivated old price:', oldPrice.id, `($${(oldPrice.unit_amount || 0) / 100})`);
      }
    }
    
    const newPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: TARGET_PRICE,
      currency: 'usd',
    });
    
    console.log('Created new price:', newPrice.id, '($9.99)');
    return;
  }

  const product = await stripe.products.create({
    name: 'HabitGrow Lifetime Access',
    description: 'One-time payment for lifetime access to HabitGrow - your personal habit tracking companion',
    metadata: {
      type: 'lifetime_access',
    }
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: TARGET_PRICE,
    currency: 'usd',
  });

  console.log('Created product:', product.id);
  console.log('Created price:', price.id, '($9.99)');
}

createLifetimeProduct().catch(console.error);
