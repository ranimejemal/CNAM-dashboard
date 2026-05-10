import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
  tempPassword: string;
  role: string;
}

async function sendEmailViaGmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error("Gmail credentials not configured");
    return false;
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    await client.send({
      from: GMAIL_USER,
      to: to,
      subject: subject,
      content: "Bienvenue sur la plateforme CNAM",
      html: htmlContent,
    });

    await client.close();
    console.log(`Welcome email sent successfully to ${to.substring(0, 3)}***`);
    return true;
  } catch (error) {
    console.error("Error sending email via Gmail:", error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Seuls les administrateurs peuvent envoyer des emails de bienvenue" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, firstName, lastName, tempPassword, role }: WelcomeEmailRequest = await req.json();

    if (!email || !firstName || !tempPassword) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const roleLabel = role === "admin" ? "Administrateur" : role === "agent" ? "Agent" : "Validateur";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
            .credentials { background: white; border: 2px solid #1e3a5f; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .credential-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .credential-row:last-child { border-bottom: none; }
            .label { color: #666; font-size: 14px; }
            .value { font-weight: bold; color: #1e3a5f; font-family: monospace; font-size: 16px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .warning-title { color: #b45309; font-weight: bold; }
            .button { display: inline-block; background: #1e3a5f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Bienvenue sur CNAM</h1>
            <p>Votre compte a été créé avec succès</p>
          </div>
          <div class="content">
            <p>Bonjour <strong>${firstName} ${lastName}</strong>,</p>
            <p>Votre demande d'inscription a été approuvée ! Vous avez été ajouté(e) en tant que <strong>${roleLabel}</strong> sur la plateforme de gestion CNAM.</p>
            
            <div class="credentials">
              <h3 style="margin-top: 0; color: #1e3a5f;">🔐 Vos identifiants de connexion</h3>
              <div class="credential-row">
                <span class="label">Email:</span>
                <span class="value">${email}</span>
              </div>
              <div class="credential-row">
                <span class="label">Mot de passe temporaire:</span>
                <span class="value">${tempPassword}</span>
              </div>
            </div>
            
            <div class="warning">
              <p class="warning-title">⚠️ Important - Sécurité</p>
              <p style="margin: 0;">Pour des raisons de sécurité, vous devez changer votre mot de passe lors de votre première connexion. Le nouveau mot de passe doit contenir au moins 12 caractères avec des majuscules, minuscules, chiffres et caractères spéciaux.</p>
            </div>
            
            <p>Pour vous connecter, cliquez sur le bouton ci-dessous:</p>
            <center>
              <a href="https://fb22e518-053a-432e-b31a-b0ccfc0f8fff.lovableproject.com/login" class="button">Se connecter →</a>
            </center>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par le système CNAM.</p>
            <p>© 2026 CNAM - Caisse Nationale d'Assurance Maladie</p>
          </div>
        </body>
      </html>
    `;

    const emailSent = await sendEmailViaGmail(
      email,
      "🎉 Bienvenue sur CNAM - Vos identifiants de connexion",
      htmlContent
    );

    // Log the email
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    await adminClient.from("email_logs").insert({
      email_type: "welcome",
      recipient_email: email,
      subject: "Bienvenue sur CNAM - Vos identifiants de connexion",
      status: emailSent ? "sent" : "failed",
      sent_at: emailSent ? new Date().toISOString() : null,
      error_message: !emailSent ? "Gmail SMTP error" : null,
    });

    if (!emailSent) {
      return new Response(
        JSON.stringify({ error: "Impossible d'envoyer l'email de bienvenue" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur s'est produite" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
