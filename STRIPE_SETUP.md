# Stripe Setup Guide

This guide walks you through setting up Stripe payments for your AI Observability Platform with a 14-day free trial and $49/month subscription.

## Overview

The platform includes:
- ✅ 14-day free trial for all new workspaces
- ✅ $49/month subscription after trial ends
- ✅ Stripe Checkout integration for seamless payment
- ✅ Webhook handling for subscription status updates
- ✅ Fully portable - works on any hosting platform

## Prerequisites

1. **Stripe Account** - Sign up at https://stripe.com if you haven't already
2. **Product Created** - Follow steps below to create your subscription product

## Step 1: Create Your Product in Stripe Dashboard

### 1.1 Log into Stripe Dashboard
- Go to https://dashboard.stripe.com
- Make sure you're in **Test Mode** (toggle in top-right) for initial setup

### 1.2 Create a Product
1. Navigate to **Products** in the left sidebar
2. Click **+ Add product**
3. Fill in the details:
   - **Name**: `AI Observability Platform` (or your preferred name)
   - **Description**: `Real-time AI monitoring, cost tracking, and performance insights`
   - **Pricing model**: Select **Standard pricing**
   
### 1.3 Configure Pricing
1. **Price**: Enter `49.00`
2. **Currency**: Select `USD` (or your preferred currency)
3. **Billing period**: Select **Monthly**
4. Click **Save product**

### 1.4 Get Your Price ID
1. After saving, you'll see your product listed
2. Click on the product to view details
3. In the **Pricing** section, you'll see an **API ID** that starts with `price_`
4. **Copy this Price ID** - you'll need it for environment variables

Example: `price_1QKoSzB8Yh3CcmVj8xP2dF5L`

## Step 2: Get Your API Keys

### 2.1 Get Secret Key
1. In Stripe Dashboard, navigate to **Developers** → **API keys**
2. Find **Secret key** section
3. Click **Reveal test key**
4. **Copy the key** (starts with `sk_test_`)

⚠️ **Important**: Keep this key secret! Never commit it to git or share it publicly.

### 2.2 Get Publishable Key (Optional)
- You'll also see a **Publishable key** (starts with `pk_test_`)
- This is not needed for the current setup but useful for future frontend integrations

## Step 3: Configure Webhooks

Webhooks let Stripe notify your app about subscription events (payments, cancellations, etc.).

### 3.1 Create Webhook Endpoint
1. Navigate to **Developers** → **Webhooks**
2. Click **+ Add endpoint**
3. Enter your endpoint URL:
   - For **local development**: `https://your-replit-app.repl.co/api/webhooks/stripe`
   - For **production**: `https://yourdomain.com/api/webhooks/stripe`

### 3.2 Select Events
Select these events to listen to:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_failed`

### 3.3 Get Webhook Secret
1. After creating the endpoint, click on it
2. Click **Reveal** next to **Signing secret**
3. **Copy the webhook secret** (starts with `whsec_`)

## Step 4: Configure Environment Variables

Add these environment variables to your deployment:

### For Replit:
1. Click **Secrets** in left sidebar (🔒 icon)
2. Add each variable:

```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PRICE_ID=price_your_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### For Other Platforms:
Add to your `.env` file or platform's environment variable settings:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PRICE_ID=price_your_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Existing variables (keep these)
DATABASE_URL=postgresql://...
SESSION_SECRET=your_session_secret
NODE_ENV=production
```

## Step 5: Test the Integration

### 5.1 Start Your Application
```bash
npm run dev
```

You should see:
```
✓ Stripe configured successfully
```

If you see a warning, double-check your `STRIPE_SECRET_KEY` is set correctly.

### 5.2 Test Subscription Flow
1. **Register** a new account in your app
2. Navigate to **Billing** or **Upgrade** page
3. Click **Start Free Trial** or **Upgrade to Pro**
4. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

### 5.3 Verify in Stripe Dashboard
1. Go to **Customers** in Stripe Dashboard
2. You should see a new customer created
3. Go to **Subscriptions** - you'll see the subscription with "Trialing" status
4. Go to **Events** - you should see webhook events being sent

## Step 6: Go Live with Production

When ready for production:

### 6.1 Switch to Live Mode
1. In Stripe Dashboard, toggle from **Test mode** to **Live mode** (top-right)
2. Repeat Steps 1-4 with **live mode** credentials
3. Create product (or copy from test mode)
4. Get live API keys (start with `sk_live_`)
5. Create live webhook
6. Update environment variables with live credentials

### 6.2 Update Environment Variables
Replace test keys with live keys:
```bash
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PRICE_ID=price_your_live_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret
```

## Subscription Flow

### How It Works

1. **New Workspace Created**
   - Status: `trialing`
   - Trial ends: 14 days from creation
   - User has full access during trial

2. **User Clicks "Upgrade" or "Subscribe"**
   - Redirected to Stripe Checkout
   - Can enter payment details
   - Returns to dashboard after completion

3. **Checkout Completed (Webhook)**
   - Stripe sends `checkout.session.completed` event
   - Your app saves customer ID and subscription ID
   - Status remains `trialing` until trial ends

4. **Trial Ends**
   - Stripe automatically charges the customer
   - Sends `customer.subscription.updated` event
   - Status changes to `active`

5. **Payment Failed**
   - Sends `invoice.payment_failed` event
   - Status changes to `past_due`
   - User is prompted to update payment method

6. **Subscription Canceled**
   - User can cancel from your app or Stripe
   - Sends `customer.subscription.deleted` event
   - Status changes to `canceled`
   - Access can be restricted based on status

## Webhook Testing

### Using Stripe CLI (Recommended)

Install Stripe CLI for local testing:

```bash
# Install Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:5000/api/webhooks/stripe
```

This gives you a webhook secret for local testing.

### Test Webhook Events

```bash
# Trigger test subscription created event
stripe trigger customer.subscription.created

# Trigger test payment failed event
stripe trigger invoice.payment_failed
```

## Troubleshooting

### "Stripe not configured" Error
- ✅ Verify `STRIPE_SECRET_KEY` is set in environment variables
- ✅ Make sure it starts with `sk_test_` (test) or `sk_live_` (production)
- ✅ Restart your application after adding environment variables

### Webhooks Not Received
- ✅ Check webhook endpoint URL is correct and publicly accessible
- ✅ Verify webhook secret (`STRIPE_WEBHOOK_SECRET`) matches Stripe Dashboard
- ✅ Check webhook event selections in Stripe Dashboard
- ✅ Review webhook logs in Stripe Dashboard → Developers → Webhooks

### Test Payments Not Working
- ✅ Ensure you're in Test Mode in Stripe Dashboard
- ✅ Use Stripe test cards: https://stripe.com/docs/testing
- ✅ Card `4242 4242 4242 4242` always succeeds
- ✅ Card `4000 0000 0000 0002` always fails

### Subscription Status Not Updating
- ✅ Check webhook events are being received (Stripe Dashboard → Events)
- ✅ Check your app logs for webhook processing errors
- ✅ Verify workspace ID is included in subscription metadata

## Security Best Practices

1. **Never expose secret keys**
   - Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in environment variables
   - Never commit them to version control
   - Add `.env` to `.gitignore`

2. **Verify webhook signatures**
   - Always verify the `stripe-signature` header (already implemented)
   - Prevents malicious webhook requests

3. **Use HTTPS in production**
   - Stripe requires HTTPS for live webhooks
   - Local development can use HTTP with Stripe CLI

4. **Rotate keys if compromised**
   - If a secret key is exposed, immediately roll it in Stripe Dashboard
   - Update environment variables with new key

## Technical Details

### Stripe API Version
The platform uses Stripe API version **2025-11-17.clover**. This is configured in `server/stripe.ts` and matches the installed Stripe SDK version 20.0.0. 

If you need to upgrade the Stripe SDK in the future:
1. Update the package: `npm install stripe@latest`
2. Check the new API version in Stripe's changelog
3. Update `apiVersion` in `server/stripe.ts`
4. Test all payment flows thoroughly

## Support Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Test Cards**: https://stripe.com/docs/testing
- **Stripe Webhook Testing**: https://stripe.com/docs/webhooks/test
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Stripe API Versions**: https://stripe.com/docs/api/versioning

## Next Steps

After completing the setup:

1. ✅ Test the complete subscription flow
2. ✅ Customize upgrade prompts and billing UI in your app
3. ✅ Set up email notifications for subscription events
4. ✅ Configure subscription limits (e.g., API call limits)
5. ✅ Plan your production launch

Your AI Observability Platform is now a true SaaS application with subscription billing! 🎉
