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
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPERBASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const {
      child_first_name,
      child_last_name,
      date_of_birth,
      playground,
      ethnicity,
      medical_conditions,
      allergies,
      additional_learning_needs,
      parent_first_name,
      parent_last_name,
      parent_phone,
      parent_date_of_birth,
      parent_language,
      parent_cultural_background,
      parent_religion,
      relationship,
      is_primary_contact,
    } = await req.json();

    if (!child_first_name || !child_last_name || !date_of_birth || !playground) {
      return json({ error: "Required fields missing" }, 400);
    }

    const { data: child, error: childError } = await supabase
      .from("children")
      .insert({
        first_name: child_first_name,
        last_name: child_last_name,
        date_of_birth,
        playground,
        ethnicity: ethnicity || null,
        medical_conditions: medical_conditions || null,
        allergies: allergies || null,
        additional_learning_needs: additional_learning_needs || null,
        registration_source: "self",
        approval_status: "pending",
      })
      .select()
      .single();

    if (childError) return json({ error: childError.message }, 400);

    let parent: { id: string } | null = null;

    if (parent_first_name && parent_last_name && parent_phone) {
      const { data: parentRow, error: parentError } = await supabase
        .from("parents")
        .insert({
          first_name: parent_first_name,
          last_name: parent_last_name,
          phone: parent_phone,
          date_of_birth: parent_date_of_birth || null,
          language: parent_language || null,
          cultural_background: parent_cultural_background || null,
          religion: parent_religion || null,
          approval_status: "pending",
        })
        .select()
        .single();

      if (parentError) return json({ error: parentError.message }, 400);
      parent = parentRow;

      await supabase.from("child_parent_links").insert({
        child_id: child.id,
        parent_id: parent.id,
        relationship: relationship || null,
        is_primary_contact: is_primary_contact ?? true,
      });
    }

    await supabase.from("notifications").insert({
      notification_type: "new_registration",
      person_type: "child",
      child_id: child.id,
      message: `New self-registration pending review: ${child_first_name} ${child_last_name}`,
    });

    return json({ success: true, child_id: child.id });
  } catch (err) {
    console.error("handle-child-registration error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
