import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("⚠️  STRIPE_SECRET_KEY not set - Stripe payments will not work");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
    })
  : null;

export const STRIPE_CONFIG = {
  PRICE_ID: process.env.STRIPE_PRICE_ID || "",
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  TRIAL_PERIOD_DAYS: 14,
  PRICE_AMOUNT: 4900, // $49.00 in cents
  CURRENCY: "usd",
};

export async function createCheckoutSession(
  workspaceId: string,
  customerId: string | null,
  customerEmail: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session | null> {
  if (!stripe || !STRIPE_CONFIG.PRICE_ID) {
    throw new Error("Stripe not configured");
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId || undefined,
    customer_email: customerId ? undefined : customerEmail,
    line_items: [
      {
        price: STRIPE_CONFIG.PRICE_ID,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: STRIPE_CONFIG.TRIAL_PERIOD_DAYS,
      metadata: {
        workspaceId,
      },
    },
    metadata: {
      workspaceId,
    },
  };

  return await stripe.checkout.sessions.create(sessionParams);
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  return await stripe.subscriptions.cancel(subscriptionId);
}

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  return await stripe.subscriptions.retrieve(subscriptionId);
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  if (!stripe || !STRIPE_CONFIG.WEBHOOK_SECRET) {
    throw new Error("Stripe webhook secret not configured");
  }

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    STRIPE_CONFIG.WEBHOOK_SECRET
  );
}

export function calculateTrialEndDate(days: number = STRIPE_CONFIG.TRIAL_PERIOD_DAYS): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session | null> {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
