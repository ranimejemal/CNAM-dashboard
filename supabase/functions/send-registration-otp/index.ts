import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS_PER_EMAIL = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(email);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= MAX_ATTEMPTS_PER_EMAIL) {
    return false;
  }
  
  record.count++;
  return true;
}

// Institutional domain required for admin/it_engineer requests
const REQUIRED_INSTITUTIONAL_DOMAIN = "@esprim.tn";

interface OTPRequest {
  email: string;
  first_name: string;
  last_name: string;
  request_type?: string;
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
      content: "Votre code de vérification CNAM",
      html: htmlContent,
    });

    await client.close();
    console.log(`Email sent successfully to ${to.substring(0, 3)}***`);
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, first_name, last_name, request_type }: OTPRequest = await req.json();
    
    // Validate input
    if (!email || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: "Données manquantes" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Format email invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Enforce institutional domain for admin/it_engineer requests
    const requiresInstitutionalEmail = request_type === "admin" || request_type === "it_engineer";
    if (requiresInstitutionalEmail && !email.toLowerCase().endsWith(REQUIRED_INSTITUTIONAL_DOMAIN)) {
      return new Response(
        JSON.stringify({ error: `Les comptes ${request_type === "admin" ? "administrateur" : "IT sécurité"} nécessitent une adresse email ${REQUIRED_INSTITUTIONAL_DOMAIN}.` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting
    if (!checkRateLimit(email)) {
      console.log(`Rate limit exceeded for email: ${email.substring(0, 3)}***`);
      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Réessayez dans 15 minutes." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if email already has a request
    const { data: existingRequests, error: existingReqError } = await supabase
      .from("registration_requests")
      .select("id, status")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingReqError) {
      console.error("Error checking existing registration request:", existingReqError);
      throw new Error("Erreur lors de la vérification de la demande");
    }

    const existingRequest = existingRequests?.[0];
    if (existingRequest) {
      if (existingRequest.status === "approved") {
        return new Response(
          JSON.stringify({
            error: "Un compte avec cet email a déjà été approuvé. Veuillez vous connecter.",
            status: "approved",
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (existingRequest.status === "pending") {
        return new Response(
          JSON.stringify({
            error: "Une demande avec cet email est déjà en attente de validation.",
            status: "pending",
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (existingRequest.status === "rejected") {
        await supabase.from("registration_requests").delete().eq("email", email);
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP
    const { error: upsertError } = await supabase
      .from("registration_otps")
      .upsert({
        email: email,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        first_name: first_name,
        last_name: last_name,
      }, {
        onConflict: 'email'
      });

    if (upsertError) {
      console.error("Error storing OTP:", upsertError);
      throw new Error("Erreur lors de la génération du code");
    }

    // Build email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 24px; }
          .header h1 { color: #16a34a; margin: 0; font-size: 24px; }
          .otp-box { background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; text-align: center; padding: 24px; border-radius: 12px; margin: 24px 0; }
          .otp-code { font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .info-text { color: #6b7280; font-size: 14px; text-align: center; margin-top: 16px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 20px; font-size: 13px; color: #92400e; }
          .footer { text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>🔐 Vérification de votre email</h1>
            </div>
            <p>Bonjour <strong>${first_name} ${last_name}</strong>,</p>
            <p>Vous avez demandé un accès à la plateforme CNAM. Voici votre code de vérification :</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p class="info-text">Ce code est valide pendant <strong>10 minutes</strong>.</p>
            
            <div class="warning">
              ⚠️ Ne partagez jamais ce code avec quelqu'un. L'équipe CNAM ne vous demandera jamais ce code par téléphone ou par un autre email.
            </div>
          </div>
          <div class="footer">
            <p>CNAM - Caisse Nationale d'Assurance Maladie</p>
            <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Gmail
    const emailSent = await sendEmailViaGmail(
      email,
      `🔐 Code de vérification CNAM - ${otp.substring(0, 3)}***`,
      htmlContent
    );

    // Log the email attempt
    await supabase.from("email_logs").insert({
      email_type: "registration_otp",
      recipient_email: email,
      subject: "Code de vérification CNAM",
      status: emailSent ? "sent" : "failed",
      sent_at: emailSent ? new Date().toISOString() : null,
      error_message: !emailSent ? "Gmail SMTP error" : null,
    });

    // Mask email for response
    const [localPart, domain] = email.split("@");
    const maskedEmail = localPart.substring(0, 2) + "***@" + domain;

    if (!emailSent) {
      await supabase.from("registration_otps").delete().eq("email", email);
      
      return new Response(
        JSON.stringify({ 
          error: "Impossible d'envoyer l'email de vérification. Veuillez réessayer ou contacter l'administrateur."
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Code envoyé",
        masked_email: maskedEmail
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in send-registration-otp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
