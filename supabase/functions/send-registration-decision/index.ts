import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DecisionRequest {
  email: string;
  firstName: string;
  lastName: string;
  decision: "approved" | "rejected";
  rejectionReason?: string;
  requestType?: string;
}

function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function getTypeLabel(type?: string): string {
  switch (type) {
    case 'prestataire': return 'Prestataire';
    case 'admin': return 'Administrateur';
    case 'it_engineer': return 'IT Sécurité';
    default: return 'Assuré';
  }
}

async function sendEmailViaGmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error("Gmail credentials not configured");
    return false;
  }
  try {
    const client = new SMTPClient({
      connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD } },
    });
    await client.send({ from: GMAIL_USER, to, subject, content: "Notification CNAM", html: htmlContent });
    await client.close();
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
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
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some((r) => r.role === "admin" || r.role === "admin_superieur");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { email, firstName, lastName, decision, rejectionReason, requestType }: DecisionRequest = await req.json();
    if (!email || !firstName || !decision) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const safeName = `${escapeHtml(firstName)} ${escapeHtml(lastName)}`;
    const typeLabel = getTypeLabel(requestType);
    const safeReason = escapeHtml(rejectionReason);

    let subject: string;
    let htmlContent: string;

    if (decision === "approved") {
      subject = "✅ Votre demande d'inscription CNAM a été approuvée";
      htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:'Segoe UI',sans-serif;margin:0;padding:0;background:#f4f4f5}.container{max-width:600px;margin:0 auto;padding:20px}.card{background:white;border-radius:12px;padding:32px;box-shadow:0 4px 6px rgba(0,0,0,.1)}.header{text-align:center;margin-bottom:24px}.header h1{color:#16a34a;margin:0;font-size:24px}.success-box{background:#f0fdf4;border-left:4px solid #16a34a;padding:16px;margin:20px 0;border-radius:0 8px 8px 0}.btn{display:inline-block;background:#16a34a;color:white!important;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:20px}.footer{text-align:center;margin-top:24px;color:#9ca3af;font-size:12px}</style></head><body>
<div class="container"><div class="card">
  <div class="header"><h1>✅ Demande approuvée</h1></div>
  <p>Bonjour <strong>${safeName}</strong>,</p>
  <div class="success-box">
    <p>Votre demande d'inscription en tant que <strong>${typeLabel}</strong> a été <strong>approuvée</strong> par l'administrateur.</p>
    <p>Vous allez recevoir un email séparé contenant vos identifiants de connexion.</p>
  </div>
  <p>Vous pourrez accéder à votre espace personnel dès réception de vos identifiants.</p>
  <center><a href="https://fb22e518-053a-432e-b31a-b0ccfc0f8fff.lovableproject.com/login" class="btn">Accéder à la plateforme</a></center>
</div><div class="footer"><p>CNAM — Caisse Nationale d'Assurance Maladie</p><p>Email automatique — ne pas répondre.</p></div></div></body></html>`;
    } else {
      subject = "❌ Votre demande d'inscription CNAM a été rejetée";
      htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:'Segoe UI',sans-serif;margin:0;padding:0;background:#f4f4f5}.container{max-width:600px;margin:0 auto;padding:20px}.card{background:white;border-radius:12px;padding:32px;box-shadow:0 4px 6px rgba(0,0,0,.1)}.header{text-align:center;margin-bottom:24px}.header h1{color:#dc2626;margin:0;font-size:24px}.reject-box{background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:20px 0;border-radius:0 8px 8px 0}.reason-box{background:#fff7ed;border-left:4px solid #f59e0b;padding:16px;margin:20px 0;border-radius:0 8px 8px 0}.footer{text-align:center;margin-top:24px;color:#9ca3af;font-size:12px}</style></head><body>
<div class="container"><div class="card">
  <div class="header"><h1>❌ Demande rejetée</h1></div>
  <p>Bonjour <strong>${safeName}</strong>,</p>
  <div class="reject-box">
    <p>Nous sommes au regret de vous informer que votre demande d'inscription en tant que <strong>${typeLabel}</strong> a été <strong>rejetée</strong>.</p>
  </div>
  ${safeReason ? `<div class="reason-box"><p><strong>Motif du rejet :</strong></p><p>${safeReason}</p></div>` : ''}
  <p>Si vous pensez qu'il s'agit d'une erreur, vous pouvez soumettre une nouvelle demande avec les documents appropriés.</p>
</div><div class="footer"><p>CNAM — Caisse Nationale d'Assurance Maladie</p><p>Email automatique — ne pas répondre.</p></div></div></body></html>`;
    }

    const emailSent = await sendEmailViaGmail(email, subject, htmlContent);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    await adminClient.from("email_logs").insert({
      email_type: `registration_${decision}`,
      recipient_email: email,
      subject,
      status: emailSent ? "sent" : "failed",
      sent_at: emailSent ? new Date().toISOString() : null,
      error_message: !emailSent ? "Gmail SMTP error" : null,
    });

    return new Response(JSON.stringify({ success: emailSent }), { status: emailSent ? 200 : 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error in send-registration-decision:", error);
    return new Response(JSON.stringify({ error: error.message || "Erreur inconnue" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
