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
      content: "Rappel de changement de mot de passe CNAM",
      html: htmlContent,
    });

    await client.close();
    console.log(`Reminder email sent successfully to ${to.substring(0, 3)}***`);
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find users whose password expires in the next 7 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - 23); // 30 days - 7 days = 23 days ago

    const { data: usersToNotify, error: queryError } = await adminClient
      .from("user_security_settings")
      .select(`
        user_id,
        password_changed_at,
        profiles!inner(first_name, last_name, email)
      `)
      .lt("password_changed_at", expiryDate.toISOString())
      .eq("password_must_change", false);

    if (queryError) {
      console.error("Error querying users:", queryError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la recherche des utilisateurs" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const userSettings of usersToNotify || []) {
      const profile = (userSettings as any).profiles;
      if (!profile?.email) continue;

      const passwordChangedAt = new Date(userSettings.password_changed_at!);
      const expiresAt = new Date(passwordChangedAt);
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 0 || daysRemaining > 7) continue;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
              .days-box { background: white; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
              .days { font-size: 48px; font-weight: bold; color: #f59e0b; }
              .button { display: inline-block; background: #1e3a5f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>⚠️ Rappel de sécurité</h1>
              <p>Votre mot de passe expire bientôt</p>
            </div>
            <div class="content">
              <p>Bonjour <strong>${profile.first_name} ${profile.last_name}</strong>,</p>
              <p>Conformément à notre politique de sécurité, votre mot de passe doit être changé tous les 30 jours.</p>
              
              <div class="days-box">
                <p class="days">${daysRemaining}</p>
                <p style="color: #666;">jour${daysRemaining > 1 ? "s" : ""} restant${daysRemaining > 1 ? "s" : ""}</p>
              </div>
              
              <p>Veuillez vous connecter à votre compte et changer votre mot de passe avant expiration pour éviter tout blocage de compte.</p>
              
              <center>
                <a href="https://fb22e518-053a-432e-b31a-b0ccfc0f8fff.lovableproject.com/login" class="button">Changer mon mot de passe →</a>
              </center>
            </div>
            <div class="footer">
              <p>© 2026 CNAM - Caisse Nationale d'Assurance Maladie</p>
            </div>
          </body>
        </html>
      `;

      const emailSent = await sendEmailViaGmail(
        profile.email,
        `⚠️ CNAM - Votre mot de passe expire dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}`,
        htmlContent
      );

      // Log email
      await adminClient.from("email_logs").insert({
        email_type: "password_expiry_reminder",
        recipient_email: profile.email,
        recipient_user_id: userSettings.user_id,
        subject: `Votre mot de passe expire dans ${daysRemaining} jours`,
        status: emailSent ? "sent" : "failed",
        sent_at: emailSent ? new Date().toISOString() : null,
      });

      if (emailSent) {
        emailsSent++;
      } else {
        emailsFailed++;
      }
    }

    console.log(`Password expiry reminders: ${emailsSent} sent, ${emailsFailed} failed`);

    return new Response(
      JSON.stringify({ success: true, emailsSent, emailsFailed }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-password-expiry-reminder:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur s'est produite" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
