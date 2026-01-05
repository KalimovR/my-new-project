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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("YooKassa webhook received:", JSON.stringify(body));

    const { event, object: payment } = body;

    // Handle successful payment
    if (event === "payment.succeeded" && payment.status === "succeeded") {
      const userId = payment.metadata?.user_id;
      
      if (!userId) {
        console.error("No user_id in payment metadata");
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Activating premium for user: ${userId}`);

      // Update user profile to premium
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        throw updateError;
      }

      // Add premium badge
      const { error: badgeError } = await supabase
        .from("user_badges")
        .upsert(
          { user_id: userId, badge_type: "premium" },
          { onConflict: "user_id,badge_type" }
        );

      if (badgeError) {
        console.error("Error adding badge:", badgeError);
        // Don't throw, badge is optional
      }

      // Create notification
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "Добро пожаловать в премиум!",
        message: "Теперь ты Всевидящий. Безлимитные реплики и эксклюзивные дискуссии — всё твоё!",
        link: "/profile",
      });

      console.log(`Premium activated successfully for user: ${userId}`);
    }

    // Handle payment cancellation/refund
    if (event === "payment.canceled" || event === "refund.succeeded") {
      const userId = payment.metadata?.user_id;
      
      if (userId) {
        console.log(`Payment canceled/refunded for user: ${userId}`);
        // Optionally revoke premium here
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});