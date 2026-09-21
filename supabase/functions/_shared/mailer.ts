import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export async function sendEmail(to: string, subject: string, html: string, options?: { cc?: string[]; replyTo?: string }): Promise<boolean> {
  const user = Deno.env.get("GMAIL_SMTP_USER");
  const password = Deno.env.get("GMAIL_SMTP_PASSWORD");
  if (!user || !password) {
    console.error("GMAIL_SMTP_USER/GMAIL_SMTP_PASSWORD not configured");
    return false;
  }

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: user, password },
    },
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
    await client.close();
  }
}
