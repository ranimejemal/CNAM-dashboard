import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecurityAlertRequest {
  event_type: string;
  severity: string;
  user_id?: string;
  user_email?: string;
  details?: Record<string, any>;
  ip_address?: string;
  location?: string;
}

const severityColors: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: "#dcfce7", text: "#166534", label: "Faible" },
  medium: { bg: "#fef3c7", text: "#92400e", label: "Moyen" },
  high: { bg: "#fed7aa", text: "#c2410c", label: "Élevé" },
  critical: { bg: "#fecaca", text: "#991b1b", label: "Critique" },
};

const eventTypeLabels: Record<string, { icon: string; label: string; description: string }> = {
  login_failure: { 
    icon: "🔒", 
    label: "Échec de connexion", 
    description: "Une tentative de connexion a échoué" 
  },
  login_success: { 
    icon: "✅", 
    label: "Connexion réussie", 
    description: "Un utilisateur s'est connecté avec succès" 
  },
  suspicious_activity: { 
    icon: "⚠️", 
    label: "Activité suspecte", 
    description: "Une activité suspecte a été détectée" 
  },
  access_denied: { 
    icon: "🚫", 
    label: "Accès refusé", 
    description: "Une tentative d'accès non autorisée a été bloquée" 
  },
  ip_blocked: { 
    icon: "🛡️", 
    label: "IP bloquée", 
    description: "Une adresse IP a été bloquée" 
  },
  mfa_disabled: { 
    icon: "🔓", 
    label: "2FA désactivé", 
    description: "L'authentification à deux facteurs a été désactivée" 
  },
  password_change: { 
    icon: "🔑", 
    label: "Mot de passe modifié", 
    description: "Un mot de passe a été modifié" 
  },
  session_expired: { 
    icon: "⏱️", 
    label: "Session expirée", 
    description: "Une session a expiré" 
  },
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const alertData: SecurityAlertRequest = await req.json();
    const { event_type, severity, user_id, user_email, details, ip_address, location } = alertData;

    // Get all admin users with security notifications enabled
    const { data: adminUsers, error: adminError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admins:", adminError);
      throw new Error("Impossible de récupérer les administrateurs");
    }

    if (!adminUsers || adminUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "Aucun administrateur trouvé" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin emails and check notification preferences
    const adminIds = adminUsers.map(u => u.user_id);
    
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, first_name, last_name")
      .in("user_id", adminIds);

    if (profileError || !profiles) {
      console.error("Error fetching profiles:", profileError);
      throw new Error("Impossible de récupérer les profils");
    }

    // Check security notification preferences
    const { data: securitySettings } = await supabaseAdmin
      .from("user_security_settings")
      .select("user_id, security_notifications")
      .in("user_id", adminIds);

    const settingsMap = new Map(
      securitySettings?.map(s => [s.user_id, s.security_notifications]) || []
    );

    // Filter admins who have notifications enabled (default to true if not set)
    const recipientProfiles = profiles.filter(p => 
      settingsMap.get(p.user_id) !== false
    );

    if (recipientProfiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "Aucun destinataire avec notifications activées" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const eventInfo = eventTypeLabels[event_type] || { 
      icon: "🔔", 
      label: event_type, 
      description: "Un événement de sécurité s'est produit" 
    };
    const severityInfo = severityColors[severity] || severityColors.medium;

    const timestamp = new Date().toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "medium",
    });

    // Build details HTML
    let detailsHtml = "";
    if (user_email) {
      detailsHtml += `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Utilisateur</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${user_email}</td></tr>`;
    }
    if (ip_address) {
      detailsHtml += `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Adresse IP</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ip_address}</td></tr>`;
    }
    if (location) {
      detailsHtml += `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Localisation</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${location}</td></tr>`;
    }
    if (details) {
      for (const [key, value] of Object.entries(details)) {
        if (key !== "email") {
          detailsHtml += `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${key}</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${JSON.stringify(value)}</td></tr>`;
        }
      }
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 25px 30px; }
          .header h1 { margin: 0; font-size: 20px; display: flex; align-items: center; gap: 10px; }
          .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .content { padding: 30px; }
          .alert-box { border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .details-table td { font-size: 14px; }
          .action-btn { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          .timestamp { color: #6b7280; font-size: 13px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${eventInfo.icon} Alerte de Sécurité CNAM</h1>
          </div>
          <div class="content">
            <div class="alert-box" style="background: ${severityInfo.bg}; border-left: 4px solid ${severityInfo.text};">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="font-size: 16px; color: ${severityInfo.text};">${eventInfo.label}</strong>
                <span class="severity-badge" style="background: ${severityInfo.text}; color: white;">
                  ${severityInfo.label}
                </span>
              </div>
              <p style="margin: 0; color: #374151;">${eventInfo.description}</p>
            </div>
            
            ${detailsHtml ? `
            <div style="margin-top: 20px;">
              <h3 style="font-size: 14px; color: #374151; margin-bottom: 10px;">Détails de l'événement</h3>
              <table class="details-table">
                ${detailsHtml}
              </table>
            </div>
            ` : ""}
            
            <p class="timestamp">📅 ${timestamp}</p>
            
            <div style="margin-top: 25px; text-align: center;">
              <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || '#'}/securite" class="action-btn">
                Voir le tableau de bord sécurité
              </a>
            </div>
          </div>
          <div class="footer">
            <p>CNAM - Centre des Opérations de Sécurité</p>
            <p>Cet email a été envoyé automatiquement suite à un événement de sécurité.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send emails to all admins
    const emailPromises = recipientProfiles.map(async (profile) => {
      try {
        const result = await resend.emails.send({
          from: "CNAM Sécurité <onboarding@resend.dev>",
          to: [profile.email],
          subject: `${eventInfo.icon} [${severityInfo.label.toUpperCase()}] ${eventInfo.label} - CNAM`,
          html: emailHtml,
        });

        // Log email
        await supabaseAdmin.from("email_logs").insert({
          recipient_email: profile.email,
          recipient_user_id: profile.user_id,
          email_type: "security_alert",
          subject: `[${severityInfo.label}] ${eventInfo.label}`,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

        return { email: profile.email, success: true };
      } catch (error: any) {
        console.error(`Error sending to ${profile.email}:`, error);
        
        await supabaseAdmin.from("email_logs").insert({
          recipient_email: profile.email,
          recipient_user_id: profile.user_id,
          email_type: "security_alert",
          subject: `[${severityInfo.label}] ${eventInfo.label}`,
          status: "failed",
          error_message: error.message,
        });

        return { email: profile.email, success: false, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Alertes envoyées à ${successCount}/${results.length} administrateurs`,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-security-alert:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
