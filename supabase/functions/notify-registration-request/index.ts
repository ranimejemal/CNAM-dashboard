import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegistrationRequest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  message?: string;
}

// HTML escape function to prevent HTML injection in emails
function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  const map: {[key: string]: string} = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: RegistrationRequest = await req.json();
    console.log("New registration request:", requestData);

    // Get all admin users with their emails
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw new Error("Failed to fetch administrators");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin emails from profiles
    const adminUserIds = adminRoles.map((r) => r.user_id);
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email, first_name, user_id")
      .in("user_id", adminUserIds);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      throw new Error("Failed to fetch admin profiles");
    }

    const adminEmails = adminProfiles?.map((p) => p.email).filter(Boolean) || [];
    
    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ success: true, message: "No admin emails to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending notification to admins:", adminEmails);

    const appUrl = Deno.env.get("APP_URL") || "https://cnam-dashboard.lovable.app";

    // Escape all user-provided data to prevent HTML injection
    const safeFirstName = escapeHtml(requestData.first_name);
    const safeLastName = escapeHtml(requestData.last_name);
    const safeEmail = escapeHtml(requestData.email);
    const safePhone = escapeHtml(requestData.phone);
    const safeMessage = escapeHtml(requestData.message);

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
          .info-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .info-row { margin: 8px 0; }
          .label { font-weight: 600; color: #374151; }
          .value { color: #6b7280; }
          .btn { display: inline-block; background: #16a34a; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>📝 Nouvelle demande d'inscription</h1>
            </div>
            <p>Une nouvelle demande de création de compte a été soumise sur CNAM.</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="label">Nom complet:</span>
                <span class="value">${safeFirstName} ${safeLastName}</span>
              </div>
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">${safeEmail}</span>
              </div>
              ${safePhone ? `
              <div class="info-row">
                <span class="label">Téléphone:</span>
                <span class="value">${safePhone}</span>
              </div>
              ` : ''}
              ${safeMessage ? `
              <div class="info-row">
                <span class="label">Message:</span>
                <span class="value">${safeMessage}</span>
              </div>
              ` : ''}
            </div>
            
            <p>Veuillez vous connecter au tableau de bord pour examiner et approuver cette demande.</p>
            
            <center>
              <a href="${appUrl}/utilisateurs" class="btn">Voir les demandes</a>
            </center>
          </div>
          <div class="footer">
            <p>CNAM - Caisse Nationale d'Assurance Maladie</p>
            <p>Cet email a été envoyé automatiquement. Ne pas répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to all admins using fetch
    for (const adminEmail of adminEmails) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "CNAM <onboarding@resend.dev>",
            to: [adminEmail],
            subject: `📝 Nouvelle demande d'inscription - ${safeFirstName} ${safeLastName}`,
            html: htmlContent,
          }),
        });

        const emailResult = await emailResponse.json();
        console.log(`Email sent to ${adminEmail}:`, emailResult);

        // Log the email
        await supabase.from("email_logs").insert({
          email_type: "registration_request",
          recipient_email: adminEmail,
          subject: `Nouvelle demande d'inscription - ${safeFirstName} ${safeLastName}`,
          status: emailResponse.ok ? "sent" : "failed",
          sent_at: emailResponse.ok ? new Date().toISOString() : null,
          error_message: !emailResponse.ok ? JSON.stringify(emailResult) : null,
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${adminEmail}:`, emailError);
        
        await supabase.from("email_logs").insert({
          email_type: "registration_request",
          recipient_email: adminEmail,
          subject: `Nouvelle demande d'inscription - ${safeFirstName} ${safeLastName}`,
          status: "failed",
          error_message: emailError instanceof Error ? emailError.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notifications sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in notify-registration-request:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
