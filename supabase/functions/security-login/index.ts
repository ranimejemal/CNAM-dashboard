import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_HOURS = 24;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, ip_address, user_agent, status, email } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if IP is currently blocked
    if (ip_address) {
      const { data: blocked } = await supabaseAdmin
        .from("blocked_ips")
        .select("id, expires_at")
        .eq("ip_address", ip_address)
        .gte("expires_at", new Date().toISOString())
        .limit(1);

      if (blocked && blocked.length > 0) {
        return new Response(
          JSON.stringify({
            blocked: true,
            message: "Cette adresse IP est temporairement bloquée suite à des tentatives suspectes.",
            expires_at: blocked[0].expires_at,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Record login history
    if (user_id) {
      await supabaseAdmin.from("user_login_history").insert({
        user_id,
        ip_address,
        user_agent,
        status,
        device_fingerprint: user_agent ? btoa(user_agent).slice(0, 32) : null,
      });
    }

    // On failure, check for brute force
    if (status === "failure" && ip_address) {
      // Count recent failures from this IP (last 30 minutes)
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from("security_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "login_failure")
        .gte("created_at", thirtyMinAgo)
        .or(`ip_address.eq.${ip_address},details->>email.eq.${email || ""}`);

      const failCount = (count || 0) + 1;

      if (failCount >= MAX_FAILED_ATTEMPTS) {
        // Block the IP
        const expiresAt = new Date(Date.now() + BLOCK_DURATION_HOURS * 60 * 60 * 1000).toISOString();
        await supabaseAdmin.from("blocked_ips").insert({
          ip_address,
          reason: `brute_force: ${failCount} failed attempts in 30min`,
          expires_at: expiresAt,
          blocked_by: "system",
        });

        // Log the block event
        await supabaseAdmin.rpc("log_security_event", {
          p_user_id: user_id || "00000000-0000-0000-0000-000000000000",
          p_event_type: "ip_blocked",
          p_severity: "high",
          p_ip_address: ip_address,
          p_details: { reason: "brute_force", attempts: failCount, blocked_for_hours: BLOCK_DURATION_HOURS },
        });

        // Send security alert email
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-security-alert`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              event_type: "ip_blocked",
              severity: "high",
              user_email: email,
              ip_address,
              details: { attempts: failCount, blocked_for_hours: BLOCK_DURATION_HOURS },
            }),
          });
        } catch (e) {
          console.error("Failed to send alert:", e);
        }

        return new Response(
          JSON.stringify({ blocked: true, message: "IP bloquée suite à des tentatives répétées." }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // On success, check for new device/IP and send alert
    if (status === "success" && user_id && ip_address) {
      const { data: previousLogins } = await supabaseAdmin
        .from("user_login_history")
        .select("ip_address")
        .eq("user_id", user_id)
        .eq("status", "success")
        .neq("ip_address", ip_address)
        .limit(1);

      // Check if this IP was ever used before
      const { data: knownIP } = await supabaseAdmin
        .from("user_login_history")
        .select("id")
        .eq("user_id", user_id)
        .eq("ip_address", ip_address)
        .eq("status", "success")
        .limit(2); // 2 because current login is already inserted

      const isNewIP = !knownIP || knownIP.length <= 1;

      if (isNewIP && previousLogins && previousLogins.length > 0) {
        // New IP detected - send email alert to the user
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, first_name")
          .eq("user_id", user_id)
          .single();

        if (profile?.email) {
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-security-alert`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({
                event_type: "login_success",
                severity: "medium",
                user_id,
                user_email: profile.email,
                ip_address,
                details: { new_device: true, message: `Nouvelle connexion depuis ${ip_address}` },
              }),
            });
          } catch (e) {
            console.error("Failed to send new device alert:", e);
          }
        }

        // Log as suspicious
        await supabaseAdmin.rpc("log_security_event", {
          p_user_id: user_id,
          p_event_type: "suspicious_activity",
          p_severity: "medium",
          p_ip_address: ip_address,
          p_user_agent: user_agent,
          p_details: { reason: "new_ip_login", email: email },
        });
      }
    }

    return new Response(
      JSON.stringify({ blocked: false, success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in security-login:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
