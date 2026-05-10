import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const REQUIRED_INSTITUTIONAL_DOMAIN = "@esprim.tn";

interface VerifyRequest {
  email: string;
  otp_code: string;
  phone?: string;
  message?: string;
  request_type?: string;
  cnam_number?: string;
  document_url?: string;
  organization_name?: string;
  organization_type?: string;
  license_number?: string;
}

function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  const map: {[key: string]: string} = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
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

    const { 
      email, otp_code, phone, message,
      request_type, cnam_number, document_url,
      organization_name, organization_type, license_number
    }: VerifyRequest = await req.json();
    
    if (!email || !otp_code) {
      return new Response(
        JSON.stringify({ error: "Données manquantes" }),
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

    const sanitizedOtp = otp_code.replace(/\D/g, '').substring(0, 6);
    if (sanitizedOtp.length !== 6) {
      return new Response(
        JSON.stringify({ error: "Code invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: otpRecord, error: fetchError } = await supabase
      .from("registration_otps")
      .select("*")
      .eq("email", email)
      .single();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "Aucun code trouvé pour cet email. Veuillez redemander un code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from("registration_otps").delete().eq("email", email);
      return new Response(
        JSON.stringify({ error: "Code expiré. Veuillez redemander un nouveau code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await supabase.from("registration_otps").delete().eq("email", email);
      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Veuillez redemander un nouveau code." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    await supabase
      .from("registration_otps")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("email", email);

    if (otpRecord.otp_code !== sanitizedOtp) {
      const remainingAttempts = MAX_ATTEMPTS - otpRecord.attempts - 1;
      return new Response(
        JSON.stringify({ error: `Code incorrect. ${remainingAttempts} tentative(s) restante(s).` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // OTP verified - create registration request
    const insertData: Record<string, any> = {
      first_name: otpRecord.first_name,
      last_name: otpRecord.last_name,
      email: email,
      phone: phone || null,
      message: message || null,
      request_type: request_type || 'user',
      document_url: document_url || null,
    };

    if (request_type === 'user') {
      insertData.cnam_number = cnam_number || null;
    } else if (request_type === 'prestataire') {
      insertData.organization_name = organization_name || null;
      insertData.organization_type = organization_type || null;
      insertData.license_number = license_number || null;
    }
    // admin and it_engineer requests: only need document_url (already set above)

    const { data: requestData, error: insertError } = await supabase
      .from("registration_requests")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating registration request:", insertError);
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Une demande avec cet email existe déjà" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      throw new Error("Erreur lors de la création de la demande");
    }

    await supabase.from("registration_otps").delete().eq("email", email);

    // Notify admins
    await notifyAdmins(supabase, {
      ...requestData,
      request_type: request_type || 'user',
    });

    return new Response(
      JSON.stringify({ success: true, message: "Email vérifié et demande soumise avec succès", request_id: requestData.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in verify-registration-otp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function getTypeLabel(requestType: string): string {
  switch (requestType) {
    case 'prestataire': return 'Prestataire';
    case 'admin': return 'Administrateur';
    case 'it_engineer': return 'IT Sécurité';
    default: return 'Assuré (Utilisateur)';
  }
}

async function notifyAdmins(supabase: any, requestData: any) {
  try {
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "admin_superieur"]);

    if (!adminRoles || adminRoles.length === 0) return;

    const adminUserIds = adminRoles.map((r: any) => r.user_id);
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("email")
      .in("user_id", adminUserIds);

    const adminEmails = adminProfiles?.map((p: any) => p.email).filter(Boolean) || [];
    if (adminEmails.length === 0) return;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const typeLabel = getTypeLabel(requestData.request_type);
    const safeFirstName = escapeHtml(requestData.first_name);
    const safeLastName = escapeHtml(requestData.last_name);
    const safeEmail = escapeHtml(requestData.email);

    const htmlContent = `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <style>body{font-family:'Segoe UI',sans-serif;margin:0;padding:0;background:#f4f4f5}.container{max-width:600px;margin:0 auto;padding:20px}.card{background:white;border-radius:12px;padding:32px;box-shadow:0 4px 6px rgba(0,0,0,.1)}.header{text-align:center;margin-bottom:24px}.header h1{color:#16a34a;margin:0;font-size:22px}.badge{display:inline-block;background:#dcfce7;color:#166534;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}.info-box{background:#f0fdf4;border-left:4px solid #16a34a;padding:16px;margin:20px 0;border-radius:0 8px 8px 0}.label{font-weight:600;color:#374151}.value{color:#6b7280}.footer{text-align:center;margin-top:24px;color:#9ca3af;font-size:12px}</style></head><body>
      <div class="container"><div class="card">
        <div class="header"><h1>📝 Nouvelle demande — ${typeLabel} <span class="badge">✓ Email vérifié</span></h1></div>
        <div class="info-box">
          <p><span class="label">Nom:</span> <span class="value">${safeFirstName} ${safeLastName}</span></p>
          <p><span class="label">Email:</span> <span class="value">${safeEmail}</span></p>
          <p><span class="label">Type:</span> <span class="value">${typeLabel}</span></p>
          ${requestData.cnam_number ? `<p><span class="label">N° CNAM:</span> <span class="value">${escapeHtml(requestData.cnam_number)}</span></p>` : ''}
          ${requestData.organization_name ? `<p><span class="label">Organisation:</span> <span class="value">${escapeHtml(requestData.organization_name)}</span></p>` : ''}
          ${requestData.document_url ? `<p><span class="label">📎</span> Document justificatif joint</p>` : ''}
        </div>
        <p>Veuillez examiner cette demande dans le tableau de bord.</p>
      </div><div class="footer"><p>CNAM — Email automatique</p></div></div></body></html>`;

    for (const adminEmail of adminEmails) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "CNAM <onboarding@resend.dev>",
            to: [adminEmail],
            subject: `📝 Demande ${typeLabel} — ${safeFirstName} ${safeLastName}`,
            html: htmlContent,
          }),
        });
      } catch (e) { console.error(`Failed to notify ${adminEmail}:`, e); }
    }
  } catch (e) { console.error("Error notifying admins:", e); }
}

serve(handler);
