import { getUncachableStripeClient } from './stripeClient';

async function createLifetimeProduct() {
  const stripe = await getUncachableStripeClient();

  const products = await stripe.products.search({ query: "name:'HabitGrow Lifetime Access'" });
  if (products.data.length > 0) {
    console.log('HabitGrow Lifetime Access already exists:', products.data[0].id);
    const prices = await stripe.prices.list({ product: products.data[0].id, active: true });
    console.log('Price:', prices.data[0]?.id);
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
    unit_amount: 999,
    currency: 'usd',
  });

  console.log('Created product:', product.id);
  console.log('Created price:', price.id);
}

createLifetimeProduct().catch(console.error);
