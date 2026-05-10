import { supabase } from "@/integrations/supabase/client";

interface SecurityEventDetails {
  [key: string]: any;
}

export async function logSecurityEvent(
  eventType: 
    | "login_success" 
    | "login_failure" 
    | "logout" 
    | "password_change" 
    | "mfa_enabled" 
    | "mfa_disabled" 
    | "suspicious_activity" 
    | "access_denied" 
    | "session_expired" 
    | "ip_blocked",
  severity: "low" | "medium" | "high" | "critical",
  details?: SecurityEventDetails
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.rpc("log_security_event", {
      p_user_id: user?.id || null,
      p_event_type: eventType,
      p_severity: severity,
      p_details: details || null,
      p_ip_address: null, // Would need server-side to get real IP
      p_user_agent: navigator.userAgent,
      p_location: null,
    });

    if (error) {
      console.error("Error logging security event:", error);
    }

    // For high/critical events, also send email alert
    if (severity === "high" || severity === "critical") {
      await sendSecurityAlert(eventType, severity, user?.email, details);
    }
  } catch (error) {
    console.error("Error in logSecurityEvent:", error);
  }
}

export async function sendSecurityAlert(
  eventType: string,
  severity: string,
  userEmail?: string,
  details?: SecurityEventDetails
) {
  try {
    const response = await supabase.functions.invoke("send-security-alert", {
      body: {
        event_type: eventType,
        severity,
        user_email: userEmail,
        details,
      },
    });

    if (response.error) {
      console.error("Error sending security alert:", response.error);
    }
  } catch (error) {
    console.error("Error in sendSecurityAlert:", error);
  }
}
