import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export async function sendEmail(to: string, subject: string, html: string, options?: { cc?: string[]; replyTo?: string }): Promise<boolean> {
  // Local dev only: MAIL_DEV_MAILPIT=true delivers everything to the local
  // Supabase Mailpit inbox (http://127.0.0.1:54324) instead of Gmail, so
  // emails can be tested end to end without sending anything real.
  const devMailpit = Deno.env.get("MAIL_DEV_MAILPIT") === "true";

  const user = devMailpit ? "dev@weareplasmadoc.local" : Deno.env.get("GMAIL_SMTP_USER");
  const password = Deno.env.get("GMAIL_SMTP_PASSWORD");
  if (!devMailpit && (!user || !password)) {
    console.error("GMAIL_SMTP_USER/GMAIL_SMTP_PASSWORD not configured");
    return false;
  }

  const client = new SMTPClient({
    connection: devMailpit
      // Mailpit's in-network alias and SMTP port on the Supabase Docker network.
      ? { hostname: "inbucket", port: 1025, tls: false }
      : {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: user!, password: password! },
      },
    // denomailer refuses plain-text SMTP unless told otherwise; Mailpit has no TLS.
    ...(devMailpit ? { debug: { allowUnsecure: true, noStartTLS: true } } : {}),
  });

  try {
    await client.send({
      from: `"We Are Plas Madoc" <${user}>`,
      to,
      ...(options?.cc ? { cc: options.cc } : {}),
      ...(options?.replyTo ? { replyTo: options.replyTo } : {}),
      subject,
      html,
      content: "text/html",
    });
    return true;
  } catch (err) {
    console.error("Gmail SMTP error:", err);
    return false;
  } finally {
    // close() throws if the connection never opened; don't let that mask the real error.
    await client.close().catch(() => {});
  }
}
