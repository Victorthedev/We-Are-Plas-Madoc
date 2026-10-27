// Postcode -> list of addresses for the transport booking form.
//
// The postcode is always validated against postcodes.io (free, no key). The
// address list itself comes from ADDRESS_PROVIDER:
//   mock (default) - fake numbered addresses, for dev only
// A real provider (OS Places / getAddress.io, which license Royal Mail PAF
// data) slots in as another case below. Google Places can't list every
// address in a postcode, so it would need a type-ahead form instead.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, clientIp, corsHeaders, formatPostcode, json, looksLikePostcode, rateLimited } from "../_shared/transport.ts";

interface PostcodeInfo {
  postcode: string;
  admin_ward: string | null;
  admin_district: string | null;
}

async function lookupPostcode(pc: string): Promise<PostcodeInfo | null> {
  const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`postcodes.io returned ${res.status}`);
  const body = await res.json();
  return body.result as PostcodeInfo;
}

function mockAddresses(info: PostcodeInfo): string[] {
  const area = [info.admin_ward, info.admin_district].filter(Boolean).join(", ");
  return Array.from({ length: 12 }, (_, i) => `${i + 1} Example Road, ${area}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { postcode } = await req.json();
    if (!postcode || !looksLikePostcode(postcode)) return json({ error: "Please enter a valid UK postcode" }, 400);

    if (await rateLimited(adminClient(), "address-lookup", clientIp(req), 60, 15)) {
      return json({ error: "Too many lookups. Please wait a few minutes and try again." }, 429);
    }

    const info = await lookupPostcode(formatPostcode(postcode));
    if (!info) return json({ error: "We couldn't find that postcode. Please check it and try again." }, 404);

    const provider = Deno.env.get("ADDRESS_PROVIDER") || "mock";
    let addresses: string[];
    switch (provider) {
      case "mock":
        addresses = mockAddresses(info);
        break;
      default:
        return json({ error: `Address provider "${provider}" is not set up` }, 500);
    }

    return json({ postcode: info.postcode, addresses });
  } catch (err) {
    console.error("transport-address-lookup error:", err);
    return json({ error: "Address lookup is unavailable right now. You can type your address instead." }, 502);
  }
});
