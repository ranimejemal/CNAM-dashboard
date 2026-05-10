import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roles: string[];
}

// Simple in-memory rate limiting (per admin user)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 users per minute per admin

function checkRateLimit(adminId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(adminId);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(adminId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// Password validation matching the client-side policy
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: "Le mot de passe doit contenir au moins 12 caractères." };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password);

  const complexityCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

  if (complexityCount < 3) {
    return { 
      valid: false, 
      error: "Le mot de passe doit contenir au moins 3 des éléments suivants: majuscules, minuscules, chiffres, caractères spéciaux." 
    };
  }

  return { valid: true };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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

    // Create client with user's token to verify they're admin
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

    // Check if requesting user is admin or admin_superieur
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    const isAdmin = roles?.some((r) => r.role === "admin" || r.role === "admin_superieur");
    const isAdminSuperieur = roles?.some((r) => r.role === "admin_superieur");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Seuls les administrateurs peuvent créer des utilisateurs" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Apply rate limiting per admin
    const rateLimitResult = checkRateLimit(requestingUser.id);
    if (!rateLimitResult.allowed) {
      // Log rate limit violation
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      await adminClient.rpc("log_security_event", {
        p_user_id: requestingUser.id,
        p_event_type: "suspicious_activity",
        p_severity: "medium",
        p_details: { 
          reason: "rate_limit_exceeded", 
          endpoint: "create-user",
          retry_after: rateLimitResult.retryAfter 
        },
      });

      return new Response(
        JSON.stringify({ 
          error: `Trop de requêtes. Veuillez réessayer dans ${rateLimitResult.retryAfter} secondes.` 
        }),
        { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json", 
            "Retry-After": String(rateLimitResult.retryAfter),
            ...corsHeaders 
          } 
        }
      );
    }

    // Parse request body
    const { email, password, firstName, lastName, phone, roles: newUserRoles }: CreateUserRequest = await req.json();

    // Validate inputs
    if (!email || !password || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: "Email, mot de passe, prénom et nom sont obligatoires" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Only admin_superieur can create admin, admin_superieur, and security_engineer roles
    const privilegedRoles = ["admin", "admin_superieur", "security_engineer"];
    const requestsPrivilegedRole = newUserRoles?.some(r => privilegedRoles.includes(r));
    
    if (requestsPrivilegedRole && !isAdminSuperieur) {
      return new Response(
        JSON.stringify({ error: "Seul l'Admin Supérieur peut attribuer des rôles privilégiés (admin, admin supérieur, ingénieur sécurité)." }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate password with the same policy as client-side
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ error: passwordValidation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Create the new user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      
      // Provide specific error for duplicate email (safe to expose to admins)
      if (createError.message?.includes("already been registered") || createError.code === "email_exists") {
        return new Response(
          JSON.stringify({ error: "Un utilisateur avec cette adresse email existe déjà." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Return generic error for other cases
      return new Response(
        JSON.stringify({ error: "Impossible de créer l'utilisateur. Veuillez réessayer." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update profile with phone if provided
    if (phone && newUser.user) {
      await adminClient
        .from("profiles")
        .update({ phone })
        .eq("user_id", newUser.user.id);
    }

    // Assign roles if provided
    if (newUserRoles && newUserRoles.length > 0 && newUser.user) {
      const roleInserts = newUserRoles.map((role) => ({
        user_id: newUser.user!.id,
        role,
      }));

      const { error: rolesError } = await adminClient
        .from("user_roles")
        .insert(roleInserts);

      if (rolesError) {
        console.error("Error assigning roles:", rolesError);
      }
    }

    console.log("User created successfully:", newUser.user?.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user?.id, 
          email: newUser.user?.email 
        } 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in create-user function:", error);
    // Return generic error to prevent information leakage
    return new Response(
      JSON.stringify({ error: "Une erreur s'est produite. Veuillez réessayer." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
