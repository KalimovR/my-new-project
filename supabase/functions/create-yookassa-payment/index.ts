import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const shopId = Deno.env.get("YOOKASSA_SHOP_ID");
    const secretKey = Deno.env.get("YOOKASSA_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!shopId || !secretKey) {
      console.error("Missing YooKassa credentials");
      throw new Error("Payment system not configured");
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      throw new Error("Invalid authentication");
    }

    console.log(`Creating payment for user: ${user.id}`);

    const { returnUrl } = await req.json();
    
    // Create idempotency key
    const idempotenceKey = crypto.randomUUID();

    // Create YooKassa payment
    const paymentData = {
      amount: {
        value: "99.00",
        currency: "RUB",
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: returnUrl || `${req.headers.get("origin")}/profile?payment=success`,
      },
      description: "Премиум-подписка «Всевидящий» — 199 ₽/мес",
      metadata: {
        user_id: user.id,
        type: "premium_subscription",
      },
    };

    console.log("Creating YooKassa payment:", JSON.stringify(paymentData));

    const yooKassaResponse = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotence-Key": idempotenceKey,
        Authorization: `Basic ${btoa(`${shopId}:${secretKey}`)}`,
      },
      body: JSON.stringify(paymentData),
    });

    if (!yooKassaResponse.ok) {
      const errorText = await yooKassaResponse.text();
      console.error("YooKassa error:", errorText);
      throw new Error(`Payment creation failed: ${errorText}`);
    }

    const payment = await yooKassaResponse.json();
    console.log("Payment created:", payment.id);

    return new Response(
      JSON.stringify({
        paymentId: payment.id,
        confirmationUrl: payment.confirmation.confirmation_url,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});