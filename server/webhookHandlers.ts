import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { users, foundingMemberSlots, habits } from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const stripe = await getUncachableStripeClient();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      (await sync.getManagedWebhook())?.secret || ''
    );

    // Handle checkout session completed (subscription started)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      
      console.log('Checkout session completed:', {
        hasUserId: !!session.metadata?.userId,
        userId: session.metadata?.userId,
        tier: session.metadata?.tier,
        subscription: session.subscription,
      });
      
      if (session.metadata?.userId) {
        const tier = session.metadata?.tier || 'pro';
        const billingInterval = session.metadata?.billingInterval || 'month';
        const isFoundingMember = session.metadata?.isFoundingMember === 'true';
        
        const updateData: any = { 
          hasPaid: true,
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          billingInterval,
          isFoundingMember,
        };
        
        if (session.subscription) {
          updateData.subscriptionId = session.subscription;
        }
        
        if (session.customer) {
          updateData.stripeCustomerId = session.customer;
        }
        
        await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, session.metadata.userId));
        
        if (isFoundingMember) {
          await db
            .update(foundingMemberSlots)
            .set({ usedSlots: sql`${foundingMemberSlots.usedSlots} + 1` })
            .where(eq(foundingMemberSlots.tier, tier));
          console.log(`Founding member slot claimed for ${tier} by user ${session.metadata.userId}`);
        }
        
        console.log(`User ${session.metadata.userId} subscription started (${tier}, ${billingInterval}) - access granted`);

        const restoredHabits = await db
          .update(habits)
          .set({ archived: false, downgradeArchived: false })
          .where(and(
            eq(habits.userId, session.metadata.userId),
            eq(habits.downgradeArchived, true)
          ))
          .returning();

        if (restoredHabits.length > 0) {
          console.log(`Restored ${restoredHabits.length} downgrade-archived habits for user ${session.metadata.userId}`);
        }
      } else {
        console.warn('Checkout completed but no userId in metadata:', session.id);
      }
    }

    // Handle subscription updated (status changes)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as any;
      const customerId = subscription.customer;
      
      // Find user by stripe customer ID
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);
      
      if (user) {
        const isActive = ['active', 'trialing'].includes(subscription.status);
        
        await db
          .update(users)
          .set({
            subscriptionStatus: subscription.status,
            hasPaid: isActive,
          })
          .where(eq(users.id, user.id));
        
        if (isActive) {
          const restoredHabits = await db
            .update(habits)
            .set({ archived: false, downgradeArchived: false })
            .where(and(
              eq(habits.userId, user.id),
              eq(habits.downgradeArchived, true)
            ))
            .returning();

          if (restoredHabits.length > 0) {
            console.log(`Restored ${restoredHabits.length} downgrade-archived habits for user ${user.id}`);
          }
        }
        
        console.log(`User ${user.id} subscription updated: ${subscription.status}`);
      }
    }

    // Handle subscription cancelled/deleted
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
      const customerId = subscription.customer;
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);
      
      if (user) {
        if (user.isFoundingMember && user.subscriptionTier) {
          await db
            .update(foundingMemberSlots)
            .set({ usedSlots: sql`GREATEST(${foundingMemberSlots.usedSlots} - 1, 0)` })
            .where(eq(foundingMemberSlots.tier, user.subscriptionTier));
          console.log(`Founding member slot released for ${user.subscriptionTier} by user ${user.id}`);
        }
        
        await db
          .update(users)
          .set({
            subscriptionStatus: 'cancelled',
            hasPaid: false,
            subscriptionId: null,
            billingInterval: null,
            isFoundingMember: false,
          })
          .where(eq(users.id, user.id));
        
        console.log(`User ${user.id} subscription cancelled - access revoked`);
      }
    }

    // Handle payment failed
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as any;
      const customerId = invoice.customer;
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);
      
      if (user) {
        await db
          .update(users)
          .set({ subscriptionStatus: 'past_due' })
          .where(eq(users.id, user.id));
        
        console.log(`User ${user.id} payment failed - subscription past due`);
      }
    }
  }
}
