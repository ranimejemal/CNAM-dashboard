import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;

    // Use service role to update security settings
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "2FA requis uniquement pour les administrateurs" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert user security settings with OTP
    const { error: upsertError } = await supabaseAdmin
      .from("user_security_settings")
      .upsert({
        user_id: userId,
        otp_code: otp,
        otp_expires_at: expiresAt.toISOString(),
        otp_attempts: 0,
        mfa_status: "pending",
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Error saving OTP:", upsertError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la génération du code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send OTP via email
    const { error: emailError } = await resend.emails.send({
      from: "CNAM Sécurité <onboarding@resend.dev>",
      to: [userEmail as string],
      subject: "🔐 Code de vérification 2FA - CNAM",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .otp-code { background: #f0f9ff; border: 2px dashed #0ea5e9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code span { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0284c7; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-top: 20px; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Vérification 2FA</h1>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              <p>Voici votre code de vérification à usage unique pour accéder au tableau de bord administrateur CNAM :</p>
              <div class="otp-code">
                <span>${otp}</span>
              </div>
              <p><strong>Ce code expire dans 10 minutes.</strong></p>
              <div class="warning">
                <strong>⚠️ Sécurité :</strong> Ne partagez jamais ce code avec quiconque. L'équipe CNAM ne vous demandera jamais votre code.
              </div>
            </div>
            <div class="footer">
              <p>CNAM - Caisse Nationale d'Assurance Maladie</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'envoi de l'email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log email
    await supabaseAdmin.from("email_logs").insert({
      recipient_email: userEmail,
      recipient_user_id: userId,
      email_type: "2fa_otp",
      subject: "Code de vérification 2FA - CNAM",
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    // Log security event
    await supabaseAdmin.rpc("log_security_event", {
      p_user_id: userId,
      p_event_type: "mfa_enabled",
      p_severity: "low",
      p_details: { action: "otp_sent", email: userEmail },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Code envoyé par email",
        email: (userEmail as string).replace(/(.{2})(.*)(@.*)/, "$1***$3")
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
