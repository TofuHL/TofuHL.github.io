// EXAMPLE — not deployed, not wired up, not run by this repo's build or
// CI. This is a template for the one piece of infrastructure a static
// GitHub Pages site cannot provide itself: something that listens for a
// completed Stripe payment and tells the site about it.
//
// What it does:
//   1. Receives a Stripe webhook event (`checkout.session.completed` or
//      `payment_intent.succeeded`), and verifies its signature so only
//      Stripe can trigger this.
//   2. Reads the exact amount that was actually charged.
//   3. Calls GitHub's repository_dispatch API, which fires
//      `.github/workflows/record-donation.yml` in this repo. That workflow
//      runs `scripts/record-donation.mjs`, which adds the exact amount to
//      `src/data/fundraising.json` and commits it — which in turn triggers
//      the existing `deploy.yml` to rebuild and republish the site.
//
// Latency is roughly 1–3 minutes end to end (two GitHub Actions runs), not
// instant. That's an honest trade-off for a static site with zero database
// and zero ongoing hosting cost — the total is always exactly what Stripe
// actually received, never a client-side guess.
//
// To use this:
//   - Deploy it somewhere that can run a Node/Fetch-compatible function
//     (Cloudflare Workers, Vercel, Netlify Functions, a small Express app,
//     etc.) — adapt the handler signature to that platform.
//   - Set the environment variables below as that platform's secrets.
//   - Point a Stripe webhook (checkout.session.completed) at this
//     function's URL.
//   - The same pattern works for PayPal/Swish — swap the signature
//     verification and the amount field for that provider's webhook shape.
//
// Required environment variables:
//   STRIPE_WEBHOOK_SECRET   — from the Stripe dashboard, for this endpoint
//   GITHUB_TOKEN            — a fine-grained PAT scoped to this repo only,
//                             with "Contents: read and write" permission
//   GITHUB_REPO             — "owner/repo", e.g. "TofuHL/TofuHL.github.io"

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');

export async function handleStripeWebhook(request) {
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    // Ignore every other event type — we only record confirmed payments.
    return new Response('ignored', { status: 200 });
  }

  const session = event.data.object;
  // Stripe amounts are in the smallest currency unit (öre for SEK).
  const amountMajorUnits = session.amount_total / 100;

  if (!Number.isFinite(amountMajorUnits) || amountMajorUnits <= 0) {
    return new Response('no amount on session, ignoring', { status: 200 });
  }

  const dispatchResponse = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPO}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'donation-received',
        client_payload: { amount: amountMajorUnits },
      }),
    },
  );

  if (!dispatchResponse.ok) {
    const detail = await dispatchResponse.text();
    console.error('Failed to notify GitHub of donation:', dispatchResponse.status, detail);
    return new Response('failed to record donation', { status: 502 });
  }

  return new Response('recorded', { status: 200 });
}
