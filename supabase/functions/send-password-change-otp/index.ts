import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Base64 encode for email
function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

async function sendEmailViaGmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error("Gmail credentials not configured");
    return false;
  }

  try {
    // Build raw email with proper MIME structure
    const boundary = "----=_Part_" + Math.random().toString(36).substring(2);
    
    const rawEmail = [
      `From: CNAM <${GMAIL_USER}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      base64Encode("Votre code de vérification CNAM est dans la version HTML de cet email."),
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      base64Encode(htmlContent),
      "",
      `--${boundary}--`,
    ].join("\r\n");

    // Use Gmail API via SMTP with raw email
    const credentials = base64Encode(`${GMAIL_USER}:${GMAIL_APP_PASSWORD}`);
    
    // Connect to Gmail SMTP
    const conn = await Deno.connectTls({
      hostname: "smtp.gmail.com",
      port: 465,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function readResponse(): Promise<string> {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      return decoder.decode(buffer.subarray(0, n || 0));
    }

    async function sendCommand(cmd: string): Promise<string> {
      await conn.write(encoder.encode(cmd + "\r\n"));
      return await readResponse();
    }

    // SMTP conversation
    await readResponse(); // Read greeting
    await sendCommand("EHLO localhost");
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(GMAIL_USER));
    await sendCommand(btoa(GMAIL_APP_PASSWORD));
    await sendCommand(`MAIL FROM:<${GMAIL_USER}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");
    await conn.write(encoder.encode(rawEmail + "\r\n.\r\n"));
    await readResponse();
    await sendCommand("QUIT");
    
    conn.close();
    console.log(`OTP email sent successfully to ${to.substring(0, 3)}***`);
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

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile for name
    const { data: profile } = await adminClient
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .single();

    const firstName = profile?.first_name || "Utilisateur";

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in user_security_settings
    const { error: updateError } = await adminClient
      .from("user_security_settings")
      .upsert({
        user_id: user.id,
        otp_code: otpCode,
        otp_expires_at: expiresAt.toISOString(),
        otp_attempts: 0,
      }, { onConflict: "user_id" });

    if (updateError) {
      console.error("Error storing OTP:", updateError);
      return new Response(
        JSON.stringify({ error: "Impossible de générer le code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email with enhanced design
    const currentDate = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Code de vérification CNAM</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 50%, #1e3a5f 100%); padding: 40px 30px; text-align: center;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center">
                            <div style="width: 80px; height: 80px; background-color: rgba(255, 255, 255, 0.15); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                              <span style="font-size: 40px;">🔐</span>
                            </div>
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">Code de Vérification</h1>
                            <p style="color: rgba(255, 255, 255, 0.85); font-size: 16px; margin: 0;">Changement de mot de passe sécurisé</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 35px;">
                      <p style="color: #1e3a5f; font-size: 18px; margin: 0 0 25px 0;">
                        Bonjour <strong>${firstName}</strong>,
                      </p>
                      <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 30px 0;">
                        Vous avez demandé à modifier votre mot de passe sur la plateforme <strong>CNAM</strong>. 
                        Utilisez le code ci-dessous pour confirmer votre identité et finaliser le changement.
                      </p>

                      <!-- OTP Code Box -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <div style="background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); border: 2px solid #1e3a5f; border-radius: 16px; padding: 35px 25px; text-align: center;">
                              <p style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px 0; font-weight: 600;">Votre code de vérification</p>
                              <div style="background: #ffffff; border-radius: 12px; padding: 20px 30px; display: inline-block; box-shadow: 0 2px 8px rgba(30, 58, 95, 0.1);">
                                <span style="font-size: 42px; font-weight: 700; color: #1e3a5f; letter-spacing: 12px; font-family: 'Courier New', monospace;">${otpCode}</span>
                              </div>
                              <p style="color: #e53e3e; font-size: 14px; margin: 20px 0 0 0; font-weight: 500;">
                                ⏱️ Ce code expire dans <strong>10 minutes</strong>
                              </p>
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Instructions -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ebf8ff; border-radius: 12px; margin: 25px 0;">
                        <tr>
                          <td style="padding: 20px 25px;">
                            <table role="presentation" cellspacing="0" cellpadding="0">
                              <tr>
                                <td style="vertical-align: top; padding-right: 15px;">
                                  <span style="font-size: 24px;">💡</span>
                                </td>
                                <td>
                                  <p style="color: #2b6cb0; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">Comment utiliser ce code ?</p>
                                  <p style="color: #4a5568; font-size: 13px; line-height: 1.6; margin: 0;">
                                    Entrez ce code à 6 chiffres dans le champ prévu sur la page de changement de mot de passe.
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Security Warning -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 12px 12px 0; margin: 25px 0;">
                        <tr>
                          <td style="padding: 20px 25px;">
                            <table role="presentation" cellspacing="0" cellpadding="0">
                              <tr>
                                <td style="vertical-align: top; padding-right: 15px;">
                                  <span style="font-size: 24px;">⚠️</span>
                                </td>
                                <td>
                                  <p style="color: #b45309; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">Vous n'avez pas fait cette demande ?</p>
                                  <p style="color: #92400e; font-size: 13px; line-height: 1.6; margin: 0;">
                                    Si vous n'avez pas demandé ce changement de mot de passe, ignorez cet email et contactez immédiatement un administrateur. Ne partagez jamais ce code avec personne.
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Timestamp -->
                      <p style="color: #a0aec0; font-size: 12px; text-align: center; margin: 30px 0 0 0;">
                        📅 Demande effectuée le ${currentDate}
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f7fafc; padding: 30px 35px; border-top: 1px solid #e2e8f0;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center">
                            <p style="color: #1e3a5f; font-size: 16px; font-weight: 700; margin: 0 0 5px 0;">CNAM</p>
                            <p style="color: #718096; font-size: 13px; margin: 0 0 15px 0;">Caisse Nationale d'Assurance Maladie</p>
                            <p style="color: #a0aec0; font-size: 11px; margin: 0;">
                              Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
                            </p>
                            <p style="color: #a0aec0; font-size: 11px; margin: 10px 0 0 0;">
                              © 2026 CNAM - Tous droits réservés
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const emailSent = await sendEmailViaGmail(
      user.email!,
      "🔐 CNAM - Code de vérification pour changement de mot de passe",
      htmlContent
    );

    // Log email
    await adminClient.from("email_logs").insert({
      email_type: "password_change_otp",
      recipient_email: user.email!,
      recipient_user_id: user.id,
      subject: "Code de vérification pour changement de mot de passe",
      status: emailSent ? "sent" : "failed",
      sent_at: emailSent ? new Date().toISOString() : null,
    });

    if (!emailSent) {
      return new Response(
        JSON.stringify({ error: "Impossible d'envoyer le code par email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mask email for response
    const emailParts = user.email!.split("@");
    const maskedEmail = emailParts[0].substring(0, 2) + "***@" + emailParts[1];

    return new Response(
      JSON.stringify({ success: true, email: maskedEmail }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-password-change-otp:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur s'est produite" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
