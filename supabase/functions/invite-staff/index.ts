import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPERBASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Decode JWT to get user ID without relying on session type
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  let userId: string | null = null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
    const payload = JSON.parse(atob(padded));
    userId = payload.sub ?? null;
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!userId) return json({ error: "Unauthorized" }, 401);

  // Verify the caller is a super_admin (a caller may hold several roles, so check membership, not a single row)
  const { data: roleRows } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (!roleRows?.some((r) => r.role === "super_admin")) return json({ error: "Forbidden: super_admin only" }, 403);

  try {
    const { email, full_name, roles } = await req.json();
    const roleList: string[] = Array.isArray(roles) ? roles : roles ? [roles] : [];

    if (!email || !full_name || roleList.length === 0) {
      return json({ error: "Email, name and at least one role are required" }, 400);
    }

    // Invite via Supabase Auth — this sends the invitation email automatically
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name },
    });

    if (error) return json({ error: error.message }, 400);

    const newUser = data.user;

    // Create profile and assign role immediately so the account is ready when they accept
    await adminClient.from("profiles").upsert({
      id: newUser.id,
      email,
      full_name,
    });

    await adminClient.from("user_roles").upsert(
      roleList.map((role) => ({ user_id: newUser.id, role })),
      { onConflict: "user_id,role" }
    );

    return json({ success: true });
  } catch (err) {
    console.error("invite-staff error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
