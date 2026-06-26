import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRICE_TO_PLAN: Record<string, string> = {
  price_1Tmfz3ITKXKBIUvUWX94Dsx9: "basico",
  price_1Tmg18ITKXKBIUvUkLl9OPfm: "pro",
};

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  if (!sig || !webhookSecret) return res.status(400).json({ error: "Missing signature" });

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(400).json({ error: `Webhook Error: ${msg}` });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const userId = session.metadata?.userId;
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const priceId = lineItems.data[0]?.price?.id ?? "";
      const plan = PRICE_TO_PLAN[priceId] ?? "basico";

      if (userId) {
        await supabaseAdmin.from("profiles").upsert(
          { user_id: userId, plan, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId },
          { onConflict: "user_id" }
        );
      } else {
        await supabaseAdmin.from("profiles")
          .update({ plan, stripe_subscription_id: subscriptionId })
          .eq("stripe_customer_id", customerId);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await supabaseAdmin.from("profiles")
        .update({ plan: "free", stripe_subscription_id: null })
        .eq("stripe_customer_id", subscription.customer as string);
    }

    return res.status(200).json({ received: true });
  } catch {
    return res.status(500).json({ error: "Internal error" });
  }
}
