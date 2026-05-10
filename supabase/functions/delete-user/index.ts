import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate JWT and extract user (do not rely on an active session)
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);

    if (userError || !userData?.user?.id) {
      console.error("Invalid JWT:", userError);
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const requestingUserId = userData.user.id;
    const requestingUserEmail = userData.user.email;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role (use service key to avoid any RLS edge cases)
    const { data: roles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUserId);

    if (rolesError) {
      console.error("Error checking roles:", rolesError);
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Seuls les administrateurs peuvent supprimer des utilisateurs" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "ID utilisateur requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prevent self-deletion
    if (userId === requestingUserId) {
      return new Response(
        JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user info for logging
    const { data: targetUser } = await adminClient.auth.admin.getUserById(userId);
    const targetEmail = targetUser?.user?.email || "unknown";

    // Check if target user is an admin
    const { data: targetRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const targetIsAdmin = targetRoles?.some((r) => r.role === "admin");

    // Only ranime.jemal@esprim.tn can delete other admins
    const SUPER_ADMIN_EMAIL = "ranime.jemal@esprim.tn";
    if (targetIsAdmin && requestingUserEmail !== SUPER_ADMIN_EMAIL) {
      console.log(
        `User ${requestingUserEmail} attempted to delete admin ${targetEmail} but lacks permission`
      );
      return new Response(
        JSON.stringify({
          error: "Seul l'administrateur principal peut supprimer d'autres administrateurs",
        }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(
      `Admin ${requestingUserEmail} is deleting user ${targetEmail} (${userId})`
    );
    // Delete related data first (in order to respect foreign key constraints)
    // user_roles
    await adminClient.from("user_roles").delete().eq("user_id", userId);
    console.log(`Deleted user_roles for ${userId}`);

    // user_security_settings
    await adminClient.from("user_security_settings").delete().eq("user_id", userId);
    console.log(`Deleted user_security_settings for ${userId}`);

    // notifications
    await adminClient.from("notifications").delete().eq("user_id", userId);
    console.log(`Deleted notifications for ${userId}`);

    // profiles
    await adminClient.from("profiles").delete().eq("user_id", userId);
    console.log(`Deleted profile for ${userId}`);

    // registration_requests (so user can re-register later if needed)
    if (targetEmail && targetEmail !== "unknown") {
      await adminClient.from("registration_requests").delete().eq("email", targetEmail);
      console.log(`Deleted registration_requests for ${targetEmail}`);
    }

    // Finally, delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Impossible de supprimer l'utilisateur" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Successfully deleted user ${targetEmail} (${userId})`);

    // Log the deletion in audit
    await adminClient.from("audit_logs").insert({
      user_id: requestingUserId,
      action: "delete_user",
      target_table: "auth.users",
      target_id: userId,
      details: { deleted_email: targetEmail, performed_by: requestingUserEmail },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in delete-user function:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur s'est produite" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
