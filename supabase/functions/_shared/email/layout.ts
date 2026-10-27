// Shared, Outlook-safe email building blocks (table layout + inline styles,
// following the Cerberus hybrid pattern). Every site email renders through
// emailLayout() so they all look consistent across Outlook, Gmail and Apple Mail.

export const SITE_URL = "https://www.weareplasmadoc.co.uk";
const LOGO_URL = "https://aurcamruwoameygvyecv.supabase.co/storage/v1/object/public/media/email/wapm-logo.png";

const C = {
  purple: "#7B2D8E",
  deep: "#2D1B4E",
  lavender: "#F5F0FF",
  lavenderBorder: "#E6DCF5",
  page: "#F4F1F8",
  text: "#3F3550",
  muted: "#7A7287",
  white: "#FFFFFF",
};
const FONT = "'Poppins', 'Segoe UI', Helvetica, Arial, sans-serif";

export const esc = (s: string | number | null | undefined) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Escapes, then keeps the sender's line breaks.
export const multiline = (s: string | null | undefined) => esc(s).replace(/\r?\n/g, "<br>");

export const formatLongDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
export const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

// ---------------------------------------------------------------------------
// Content components (each returns a full-width table row's inner HTML)
// ---------------------------------------------------------------------------

export const paragraph = (html: string) =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.text};">${html}</p>`;

export const smallNote = (html: string) =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">${html}</p>`;

export const link = (href: string, label: string) =>
  `<a href="${esc(href)}" style="color:${C.purple};text-decoration:underline;">${esc(label)}</a>`;

// Label/value rows in a soft panel. Values are HTML (escape before passing).
export function details(rows: [string, string | null | undefined][]) {
  const body = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([label, value]) => `
      <tr>
        <td valign="top" class="label-cell" style="padding:6px 12px 6px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};width:120px;">${esc(label)}</td>
        <td valign="top" style="padding:6px 0;font-family:${FONT};font-size:15px;line-height:22px;color:${C.deep};font-weight:600;word-break:break-word;">${value}</td>
      </tr>`).join("");
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 20px;">
    <tr>
      <td style="background:${C.lavender};border:1px solid ${C.lavenderBorder};border-radius:12px;padding:16px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${body}</table>
      </td>
    </tr>
  </table>`;
}

// A set-apart block for someone else's words (a message, a reply).
export const quote = (html: string, caption?: string) => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;">
    ${caption ? `<tr><td style="padding:0 0 8px;font-family:${FONT};font-size:12px;line-height:18px;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};font-weight:600;">${esc(caption)}</td></tr>` : ""}
    <tr>
      <td style="border-left:4px solid ${C.purple};background:${C.white};padding:4px 0 4px 18px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.text};">${html}</td>
    </tr>
  </table>`;

// Highlighted notice, e.g. "this notification is late".
export const notice = (html: string) => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr>
      <td style="background:#FFF7E6;border:1px solid #F5DFB0;border-radius:10px;padding:12px 16px;font-family:${FONT};font-size:13px;line-height:20px;color:#7A5410;">${html}</td>
    </tr>
  </table>`;

type Button = { href: string; label: string; variant?: "primary" | "secondary" };

// Padded-link buttons: render as real buttons in Outlook (mso-padding-alt), no images.
export function buttons(list: Button[]) {
  const cell = ({ href, label, variant = "primary" }: Button) => {
    const primary = variant === "primary";
    const bg = primary ? C.purple : C.white;
    const fg = primary ? C.white : C.purple;
    return `
      <td class="btn-cell" style="padding:0 6px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="btn-table">
          <tr>
            <td align="center" style="border-radius:999px;background:${bg};">
              <a href="${esc(href)}" class="btn-a" style="display:block;padding:12px 26px;border:2px solid ${C.purple};border-radius:999px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:600;color:${fg};text-decoration:none;white-space:nowrap;text-align:center;">${esc(label)}</a>
            </td>
          </tr>
        </table>
      </td>`;
  };
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" class="btn-row" style="margin:8px auto 16px;">
    <tr>${list.map(cell).join("")}</tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

type LayoutOptions = {
  preheader: string; // inbox preview text
  eyebrow?: string; // small label above the title
  title: string;
  body: string;
  audience?: "public" | "staff";
};

export function emailLayout({ preheader, eyebrow, title, body, audience = "public" }: LayoutOptions) {
  const footerNote = audience === "staff"
    ? "Sent automatically by the We Are Plas Madoc website to staff. Replies go to the person who got in touch, where there is one."
    : "You're receiving this because you contacted or booked with We Are Plas Madoc through our website.";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${esc(title)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <style>* { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
  <!--<![endif]-->
  <style>
    html, body { margin: 0 auto !important; padding: 0 !important; height: 100% !important; width: 100% !important; }
    * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    table { border-spacing: 0 !important; border-collapse: collapse !important; table-layout: fixed !important; }
    img { -ms-interpolation-mode: bicubic; }
    a { text-decoration: none; }
    a[x-apple-data-detectors], .unstyle-auto-detected-links a { border-bottom: 0 !important; cursor: default !important; color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: auto !important; }
      .card-pad { padding-left: 22px !important; padding-right: 22px !important; }
      .title { font-size: 22px !important; line-height: 30px !important; }
      .btn-row { width: 100% !important; }
      .btn-cell { display: block !important; width: 100% !important; padding: 0 0 10px !important; box-sizing: border-box; }
      .btn-table { width: 100% !important; }
      .btn-a { white-space: normal !important; }
      .label-cell { width: 88px !important; }
    }
  </style>
</head>
<body width="100%" style="margin:0;padding:0 !important;mso-line-height-rule:exactly;background-color:${C.page};">
  <center role="article" aria-roledescription="email" lang="en" style="width:100%;background-color:${C.page};">
    <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${C.page};"><tr><td><![endif]-->

    <div style="max-height:0;overflow:hidden;mso-hide:all;" aria-hidden="true">${esc(preheader)}</div>
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;font-family:sans-serif;">&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

    <div style="max-width:600px;margin:0 auto;" class="email-container">
      <!--[if mso]><table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600"><tr><td><![endif]-->

      <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:auto;">
        <tr><td style="height:28px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Card -->
        <tr>
          <td style="background-color:${C.white};border-radius:18px;overflow:hidden;">
            <!-- Brand stripe in the logo's colours -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td width="25%" height="6" style="background:#4E0B8C;font-size:0;line-height:0;">&nbsp;</td>
                <td width="25%" height="6" style="background:#9B51E0;font-size:0;line-height:0;">&nbsp;</td>
                <td width="25%" height="6" style="background:#DA2C93;font-size:0;line-height:0;">&nbsp;</td>
                <td width="25%" height="6" style="background:#4FB3E3;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>

            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td align="center" style="padding:28px 40px 8px;" class="card-pad">
                  <a href="${SITE_URL}" style="text-decoration:none;">
                    <img src="${LOGO_URL}" width="150" height="92" alt="We Are Plas Madoc" border="0" style="display:block;width:150px;height:auto;max-width:150px;font-family:${FONT};font-size:16px;color:${C.purple};font-weight:700;">
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 40px 8px;" class="card-pad">
                  ${eyebrow ? `<p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:18px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;color:${C.purple};">${esc(eyebrow)}</p>` : ""}
                  <h1 class="title" style="margin:0 0 20px;font-family:${FONT};font-size:26px;line-height:34px;font-weight:700;color:${C.deep};">${esc(title)}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:0 40px 24px;" class="card-pad">
                  ${body}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px 36px;font-family:${FONT};font-size:12px;line-height:19px;text-align:center;color:${C.muted};" class="card-pad">
            <p style="margin:0 0 6px;font-weight:600;color:${C.deep};">We Are Plas Madoc</p>
            <p style="margin:0 0 6px;">The Opportunities Centre, Plas Madoc, Wrexham, LL14 3US<br>Registered charity (CIO) No. 1197278</p>
            <p style="margin:0 0 12px;"><a href="${SITE_URL}" style="color:${C.purple};text-decoration:underline;">weareplasmadoc.co.uk</a></p>
            <p style="margin:0;color:#A49DB0;">${footerNote}</p>
          </td>
        </tr>
      </table>

      <!--[if mso]></td></tr></table><![endif]-->
    </div>

    <!--[if mso | IE]></td></tr></table><![endif]-->
  </center>
</body>
</html>`;
}
