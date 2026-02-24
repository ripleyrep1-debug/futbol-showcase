import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not admin" }), { status: 403, headers: corsHeaders });
    }

    const { action, userId, role } = await req.json();

    if (action === "delete") {
      // Delete user from auth (cascades to profiles, user_roles, etc.)
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;
      // Also clean up related data
      await adminClient.from("bets").delete().eq("user_id", userId);
      await adminClient.from("transactions").delete().eq("user_id", userId);
      await adminClient.from("payment_requests").delete().eq("user_id", userId);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "set_role") {
      if (role === "admin") {
        await adminClient.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      } else {
        await adminClient.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reset_password") {
      const { password } = await req.json().catch(() => ({ password: null }));
      // Generate a random password if none provided
      const newPass = password || crypto.randomUUID().slice(0, 12);
      const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPass });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, newPassword: newPass }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
