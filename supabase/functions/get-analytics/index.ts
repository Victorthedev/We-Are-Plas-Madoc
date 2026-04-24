import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const VERCEL_TOKEN = Deno.env.get("VERCEL_TOKEN");
  const VERCEL_PROJECT_ID = Deno.env.get("VERCEL_PROJECT_ID");
  const VERCEL_TEAM_ID = Deno.env.get("VERCEL_TEAM_ID"); // optional

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return json({ error: "Vercel credentials not configured", configured: false }, 200);
  }

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const days = parseInt(body.days ?? "30");
  const now = Date.now();
  const from = now - days * 24 * 60 * 60 * 1000;

  const params = new URLSearchParams({
    projectId: VERCEL_PROJECT_ID,
    from: from.toString(),
    to: now.toString(),
    tz: "Europe/London",
  });
  if (VERCEL_TEAM_ID) params.set("teamId", VERCEL_TEAM_ID);

  try {
    // Fetch aggregated page view data
    const [viewsRes, pagesRes] = await Promise.all([
      fetch(`https://api.vercel.com/v6/analytics?${params}&filter=%7B%7D`, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      }),
      fetch(`https://api.vercel.com/v6/analytics/pages?${params}`, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      }),
    ]);

    const views = viewsRes.ok ? await viewsRes.json() : null;
    const pages = pagesRes.ok ? await pagesRes.json() : null;

    return json({ configured: true, views, pages, from, to: now, days });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
