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

    // Parse request body
    const body = await req.json();
    
    // Extract event and payment object
    const { event, object: payment } = body;
    
    // Log incoming webhook for debugging
    console.log("=== YooKassa Webhook Received ===");
    console.log("Event:", event);
    console.log("Payment ID:", payment?.id);
    console.log("Payment Status:", payment?.status);
    console.log("Metadata:", JSON.stringify(payment?.metadata));
    console.log("Full payload:", JSON.stringify(body));

    // Extract user_id from metadata
    const userId = payment?.metadata?.user_id;
    const plan = payment?.metadata?.plan || "premium";
    const period = payment?.metadata?.period || "monthly";

    // Validate user_id exists
    if (!userId) {
      console.error("CRITICAL: No user_id in payment metadata!");
      console.error("Payment ID:", payment?.id);
      return new Response(
        JSON.stringify({ error: "Missing user_id in metadata" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle payment.succeeded
    if (event === "payment.succeeded" && payment?.status === "succeeded") {
      console.log(`✅ Processing successful payment for user: ${userId}`);
      console.log(`   Payment ID: ${payment.id}`);
      console.log(`   Plan: ${plan}, Period: ${period}`);

      // Calculate premium expiration (30 days for monthly)
      const premiumDays = period === "yearly" ? 365 : 30;
      const premiumExpiresAt = new Date();
      premiumExpiresAt.setDate(premiumExpiresAt.getDate() + premiumDays);

      // Update user profile with premium status
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          is_premium: true,
          premium_expires_at: premiumExpiresAt.toISOString(),
          subscription_cancelled: false // Reset cancellation flag
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("❌ Error updating profile:", updateError);
        throw updateError;
      }

      console.log(`✅ Profile updated: is_premium=true, expires=${premiumExpiresAt.toISOString()}`);

      // Add premium badge
      const { error: badgeError } = await supabase
        .from("user_badges")
        .upsert(
          { user_id: userId, badge_type: "premium" },
          { onConflict: "user_id,badge_type" }
        );

      if (badgeError) {
        console.error("⚠️ Warning: Error adding badge:", badgeError);
        // Don't throw, badge is optional
      } else {
        console.log("✅ Premium badge added/updated");
      }

      // Create welcome notification
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "Добро пожаловать в премиум!",
        message: "Теперь ты Всевидящий. Безлимитные реплики и эксклюзивные дискуссии — всё твоё!",
        link: "/profile",
      });

      if (notifError) {
        console.error("⚠️ Warning: Error creating notification:", notifError);
      } else {
        console.log("✅ Welcome notification created");
      }

      console.log(`🎉 Premium activated successfully for user: ${userId}`);
    }

    // Handle payment.canceled - do NOT grant premium
    if (event === "payment.canceled") {
      console.log(`⚠️ Payment canceled for user: ${userId}`);
      console.log(`   Payment ID: ${payment?.id}`);
      // No action needed - just log
    }

    // Handle refund.succeeded - revoke premium
    if (event === "refund.succeeded") {
      console.log(`🔄 Refund processed for user: ${userId}`);
      console.log(`   Payment ID: ${payment?.id}`);

      // Revoke premium status
      const { error: revokeError } = await supabase
        .from("profiles")
        .update({ 
          is_premium: false,
          premium_expires_at: null 
        })
        .eq("user_id", userId);

      if (revokeError) {
        console.error("❌ Error revoking premium:", revokeError);
      } else {
        console.log("✅ Premium revoked due to refund");
      }

      // Remove premium badge
      await supabase
        .from("user_badges")
        .delete()
        .eq("user_id", userId)
        .eq("badge_type", "premium");

      // Create notification about revocation
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "Подписка отменена",
        message: "Ваша премиум-подписка была отменена в связи с возвратом средств.",
        link: "/profile",
      });
    }

    // Always return 200 OK to acknowledge receipt
    console.log("=== Webhook processed successfully ===");
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ WEBHOOK ERROR:", errorMessage);
    console.error("Stack:", error instanceof Error ? error.stack : "No stack");
    
    // Return 500 so YooKassa will retry
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
