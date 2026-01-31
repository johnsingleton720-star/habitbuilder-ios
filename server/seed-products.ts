import { getUncachableStripeClient } from './stripeClient';

// Pricing tiers configuration
const PRICING_TIERS = {
  pro: {
    name: 'Habit Builder Pro',
    description: 'Unlimited habits with AI coaching, personalized action plans, and session summaries',
    price: 600, // $6.00 in cents
    features: [
      'Unlimited habits',
      'AI-powered habit coaching',
      'Personalized action plans',
      'Guided sessions with timers',
      'AI session summaries',
      'Progress streaks & achievements',
      'Habit templates library',
    ],
    metadata: {
      tier: 'pro',
      type: 'subscription',
    }
  },
  premium: {
    name: 'Habit Builder Premium',
    description: 'Everything in Pro plus voice notes, weekly reports, email reminders, and more',
    price: 1500, // $15.00 in cents
    features: [
      'Everything in Pro',
      'Voice notes during sessions',
      'Weekly progress reports',
      'Email reminders',
      'Accountability partner sharing',
      'Advanced analytics dashboard',
      'Monthly personalized insights',
      'Priority support',
    ],
    metadata: {
      tier: 'premium',
      type: 'subscription',
    }
  }
};

async function createSubscriptionProducts() {
  const stripe = await getUncachableStripeClient();

  for (const [tierKey, tier] of Object.entries(PRICING_TIERS)) {
    console.log(`\nProcessing ${tier.name}...`);
    
    // Check for existing product
    const products = await stripe.products.search({ query: `name:'${tier.name}'` });
    
    let product;
    if (products.data.length > 0) {
      product = products.data[0];
      console.log(`${tier.name} already exists:`, product.id);
      
      // Update product description and metadata
      await stripe.products.update(product.id, {
        description: tier.description,
        metadata: tier.metadata,
      });
      
      // Check if correct price exists
      const prices = await stripe.prices.list({ product: product.id, active: true });
      const correctPrice = prices.data.find(p => 
        p.unit_amount === tier.price && 
        p.recurring?.interval === 'month'
      );
      
      if (correctPrice) {
        console.log(`$${tier.price / 100}/month price already exists:`, correctPrice.id);
        continue;
      }
      
      // Deactivate old prices
      for (const oldPrice of prices.data) {
        if (oldPrice.unit_amount !== tier.price || oldPrice.recurring?.interval !== 'month') {
          await stripe.prices.update(oldPrice.id, { active: false });
          console.log('Deactivated old price:', oldPrice.id);
        }
      }
      
      // Create new price
      const newPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price,
        currency: 'usd',
        recurring: { interval: 'month' },
      });
      console.log(`Created new price:`, newPrice.id, `($${tier.price / 100}/month)`);
      
    } else {
      // Create new product
      product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
        metadata: tier.metadata,
      });
      
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price,
        currency: 'usd',
        recurring: { interval: 'month' },
      });
      
      console.log(`Created ${tier.name}:`, product.id);
      console.log(`Created price:`, price.id, `($${tier.price / 100}/month)`);
    }
  }
  
  // Deactivate old single-tier product if exists
  const oldProducts = await stripe.products.search({ query: `name:'Habit Builder Lifetime Access'` });
  for (const oldProduct of oldProducts.data) {
    if (oldProduct.active) {
      await stripe.products.update(oldProduct.id, { active: false });
      console.log('Deactivated old lifetime product:', oldProduct.id);
    }
  }
  
  console.log('\n✓ All subscription products configured successfully!');
}

createSubscriptionProducts().catch(console.error);
