import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("stripe-checkout llamado", req.method);
  console.log("ENV check:", !!process.env.STRIPE_SECRET_KEY, !!process.env.VITE_SUPABASE_URL, !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { priceId, userId, email } = req.body ?? {};
    console.log("Campos recibidos:", { priceId, userId, email: !!email });
    if (!priceId || !userId || !email)
      return res.status(400).json({ error: "Faltan campos requeridos" });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | null;
    if (customerId) {
      try { await stripe.customers.retrieve(customerId); } catch { customerId = null; }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { userId } });
      customerId = customer.id;
      await supabaseAdmin
        .from("profiles")
        .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: "user_id" });
    }
    console.log("customerId:", customerId);

    const origin =
      (req.headers.origin as string) ||
      process.env.VITE_APP_URL ||
      "https://restaurantos.vercel.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/select-plan?checkout=cancel`,
      metadata: { userId },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      locale: "es",
    });

    console.log("Session creada:", session.id, session.url?.slice(0, 60));
    return res.status(200).json({ url: session.url });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("stripe-checkout ERROR:", message);
    return res.status(500).json({ error: message });
  }
}
