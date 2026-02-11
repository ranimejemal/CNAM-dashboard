import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateUserRequest {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string | null;
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

    // Verify the requesting user
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

    // Check if admin
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    const isAdmin = roles?.some((r) => r.role === "admin");

    const { userId, firstName, lastName, email, phone, avatarUrl }: UpdateUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId est requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Users can only update themselves unless they're admin
    if (!isAdmin && requestingUser.id !== userId) {
      return new Response(
        JSON.stringify({ error: "Vous ne pouvez modifier que votre propre profil" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Build profile update object
    const profileUpdate: Record<string, any> = {};
    if (firstName !== undefined) profileUpdate.first_name = firstName.trim();
    if (lastName !== undefined) profileUpdate.last_name = lastName.trim();
    if (email !== undefined) profileUpdate.email = email.trim().toLowerCase();
    if (phone !== undefined) profileUpdate.phone = phone.trim() || null;
    if (avatarUrl !== undefined) profileUpdate.avatar_url = avatarUrl;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await adminClient
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", userId);

      if (profileError) {
        console.error("Profile update error:", profileError);
        return new Response(
          JSON.stringify({ error: "Impossible de mettre à jour le profil" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // If email changed, update auth.users as well (admin only)
    if (email && isAdmin) {
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
        userId,
        { email: email.trim().toLowerCase() }
      );

      if (authUpdateError) {
        console.error("Auth email update error:", authUpdateError);
        // Don't fail the whole operation, just log it
      }
    }

    console.log(`User ${userId} updated successfully by ${requestingUser.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in update-user function:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur s'est produite" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
