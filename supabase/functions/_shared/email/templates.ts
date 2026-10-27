// Every email the site sends. Each builder returns its subject and HTML so
// wording and design live in one place; functions only decide who receives it.
import {
  SITE_URL, buttons, details, emailLayout, esc, formatLongDate, formatShortDate, formatTime,
  link, multiline, notice, paragraph, quote, smallNote,
} from "./layout.ts";

// Where replies from the public land, and the email shown to them as a contact.
export const STAFF_INBOX = "claire.pugh@avow.org";
export const STAFF_CC = ["katie.st.john@avow.org"];
const PHONE = "01978 813912";

type Email = { subject: string; html: string };

const firstName = (full: string) => (full || "").trim().split(/\s+/)[0] || "there";
const mailto = (email: string) => link(`mailto:${email}`, email);
const tel = (phone: string | null | undefined) => (phone ? link(`tel:${phone.replace(/\s/g, "")}`, phone) : null);
const mapsLink = (location: string) => link(`https://www.google.com/maps/search/${encodeURIComponent(location)}`, location);
const PLAYGROUND_LABELS: Record<string, string> = { caia_park: "Caia Park", plas_madoc: "Plas Madoc" };

const contactPanel = () => details([
  ["Phone", tel(PHONE)],
  ["Email", mailto(STAFF_INBOX)],
]);

// ---------------------------------------------------------------------------
// Staff notifications (replyTo is set to the member of the public by the caller)
// ---------------------------------------------------------------------------

export function contactMessageStaff(m: {
  name: string; email: string; phone?: string | null; subject?: string | null; message: string;
  receivedAt: string; late?: boolean;
}): Email {
  const subjectLine = (m.subject || "").trim() || "(no subject)";
  return {
    subject: `New message: ${subjectLine}`,
    html: emailLayout({
      audience: "staff",
      preheader: `${m.name} sent a message through the website: ${subjectLine}`,
      eyebrow: "Website contact form",
      title: `New message from ${m.name}`,
      body: [
        m.late ? notice("This message arrived on the date below, but its notification was delayed by an email problem that has now been fixed.") : "",
        details([
          ["Name", esc(m.name)],
          ["Email", mailto(m.email)],
          ["Phone", tel(m.phone)],
          ["Subject", esc(subjectLine)],
          ["Received", `${esc(formatShortDate(m.receivedAt))}, ${esc(formatTime(m.receivedAt))}`],
        ]),
        quote(multiline(m.message), "Their message"),
        buttons([
          { href: `${SITE_URL}/admin/messages`, label: "Open in admin portal" },
          { href: `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${subjectLine}`)}`, label: `Reply to ${firstName(m.name)}`, variant: "secondary" },
        ]),
        smallNote(`Pressing Reply on this email goes straight to ${esc(m.name)}.`),
      ].join(""),
    }),
  };
}

export function volunteerApplicationStaff(a: {
  first_name: string; last_name: string; email: string; phone: string; position: string;
  start_date?: string | null; message?: string | null; cv_link?: string | null;
}): Email {
  const name = `${a.first_name} ${a.last_name}`;
  return {
    subject: `New volunteer application: ${a.position} (${name})`,
    html: emailLayout({
      audience: "staff",
      preheader: `${name} has applied to volunteer as ${a.position}`,
      eyebrow: "Volunteer application",
      title: `${name} wants to volunteer`,
      body: [
        details([
          ["Name", esc(name)],
          ["Email", mailto(a.email)],
          ["Phone", tel(a.phone)],
          ["Position", esc(a.position)],
          ["Available from", a.start_date ? esc(formatShortDate(a.start_date)) : null],
          ["CV", a.cv_link ? link(a.cv_link, "View CV") : null],
        ]),
        a.message ? quote(multiline(a.message), "Why they want to volunteer") : "",
        buttons([
          { href: `${SITE_URL}/admin/volunteers`, label: "Open in admin portal" },
          { href: `mailto:${a.email}`, label: `Reply to ${a.first_name}`, variant: "secondary" },
        ]),
        smallNote(`Pressing Reply on this email goes straight to ${esc(name)}.`),
      ].join(""),
    }),
  };
}

export function rsvpStaff(r: {
  first_name: string; last_name?: string | null; email: string; phone?: string | null; party_size: number;
  eventTitle: string; eventStart: string; totalRsvps: number;
}): Email {
  const name = `${r.first_name} ${r.last_name || ""}`.trim();
  return {
    subject: `New RSVP: ${r.eventTitle} (${name})`,
    html: emailLayout({
      audience: "staff",
      preheader: `${name} is coming to ${r.eventTitle}. ${r.totalRsvps} RSVP${r.totalRsvps === 1 ? "" : "s"} so far.`,
      eyebrow: "Event RSVP",
      title: `${name} is coming to ${r.eventTitle}`,
      body: [
        details([
          ["Name", esc(name)],
          ["Email", mailto(r.email)],
          ["Phone", tel(r.phone)],
          ["Party size", esc(r.party_size)],
          ["Event", esc(r.eventTitle)],
          ["Date", esc(formatLongDate(r.eventStart))],
          ["RSVPs so far", `<span style="color:#7B2D8E;">${esc(r.totalRsvps)}</span>`],
        ]),
        buttons([{ href: `${SITE_URL}/admin/events`, label: "Open in admin portal" }]),
        smallNote(`Pressing Reply on this email goes straight to ${esc(name)}.`),
      ].join(""),
    }),
  };
}

export function taskAssigned(t: { assigneeName: string; title: string; description?: string | null; playground?: string | null }): Email {
  return {
    subject: `New task: ${t.title}`,
    html: emailLayout({
      audience: "staff",
      preheader: `You've been assigned a task on the Daily Log: ${t.title}`,
      eyebrow: "Daily Log",
      title: "You've been assigned a task",
      body: [
        paragraph(`Hi ${esc(firstName(t.assigneeName))}, a task on the Daily Log has been assigned to you.`),
        details([
          ["Task", esc(t.title)],
          ["Details", t.description ? multiline(t.description) : null],
          ["Playground", t.playground ? esc(PLAYGROUND_LABELS[t.playground] || t.playground) : null],
        ]),
        buttons([{ href: `${SITE_URL}/admin/checks/tasks`, label: "Open tasks" }]),
        smallNote("Update the task in the admin portal once it's done."),
      ].join(""),
    }),
  };
}

export function taskReminder(t: { assigneeName: string; title: string; description?: string | null; playground?: string | null }): Email {
  return {
    subject: `Reminder: ${t.title}`,
    html: emailLayout({
      audience: "staff",
      preheader: `This Daily Log task is still open: ${t.title}`,
      eyebrow: "Task reminder",
      title: "This task is still open",
      body: [
        paragraph(`Hi ${esc(firstName(t.assigneeName))}, just a reminder that this task assigned to you hasn't been marked as done yet.`),
        details([
          ["Task", esc(t.title)],
          ["Details", t.description ? multiline(t.description) : null],
          ["Playground", t.playground ? esc(PLAYGROUND_LABELS[t.playground] || t.playground) : null],
        ]),
        buttons([{ href: `${SITE_URL}/admin/checks/tasks`, label: "Open tasks" }]),
        smallNote("Already done? Mark it resolved in the admin portal and the reminders will stop."),
      ].join(""),
    }),
  };
}

// ---------------------------------------------------------------------------
// Emails to the public (callers set replyTo: STAFF_INBOX)
// ---------------------------------------------------------------------------

export function volunteerApplicationReceived(a: { first_name: string; position: string }): Email {
  return {
    subject: "Thanks for applying to volunteer with We Are Plas Madoc",
    html: emailLayout({
      preheader: `We've received your application for ${a.position}. Here's what happens next.`,
      eyebrow: "Application received",
      title: `Thanks for applying, ${a.first_name}`,
      body: [
        paragraph(`We've received your application to volunteer as <strong>${esc(a.position)}</strong>. A member of our team will be in touch soon.`),
        paragraph("Volunteers are at the heart of everything we do, and we're looking forward to welcoming you. If you have any questions in the meantime, just get in touch:"),
        contactPanel(),
      ].join(""),
    }),
  };
}

export function rsvpConfirmed(r: {
  first_name: string; party_size: number; eventTitle: string; eventStart: string; location?: string | null;
  googleCalendarUrl: string; appleCalendarUrl: string; cancelUrl: string;
}): Email {
  return {
    subject: `You're booked in: ${r.eventTitle}`,
    html: emailLayout({
      preheader: `See you on ${formatLongDate(r.eventStart)}. Your RSVP details are inside.`,
      eyebrow: "RSVP confirmed",
      title: `You're all set, ${r.first_name}!`,
      body: [
        paragraph("Thanks for letting us know you're coming. Here are the details:"),
        details([
          ["Event", esc(r.eventTitle)],
          ["Date", esc(formatLongDate(r.eventStart))],
          ["Time", esc(formatTime(r.eventStart))],
          ["Location", r.location ? mapsLink(r.location) : null],
          ["Party size", esc(r.party_size)],
        ]),
        buttons([
          { href: r.googleCalendarUrl, label: "Add to Google Calendar" },
          { href: r.appleCalendarUrl, label: "Add to Apple Calendar", variant: "secondary" },
        ]),
        smallNote(`Can't make it anymore? ${link(r.cancelUrl, "Cancel your RSVP")} so we can plan numbers.`),
      ].join(""),
    }),
  };
}

export function rsvpCancelled(r: { first_name: string; eventTitle: string }): Email {
  return {
    subject: `RSVP cancelled: ${r.eventTitle}`,
    html: emailLayout({
      preheader: `Your RSVP for ${r.eventTitle} has been cancelled.`,
      eyebrow: "RSVP cancelled",
      title: "Your RSVP has been cancelled",
      body: [
        paragraph(`Hi ${esc(r.first_name)}, your RSVP for <strong>${esc(r.eventTitle)}</strong> has been cancelled. Thanks for letting us know.`),
        paragraph("We hope to see you at a future event."),
        buttons([{ href: `${SITE_URL}/events`, label: "Browse upcoming events" }]),
      ].join(""),
    }),
  };
}

export function eventCancelled(r: { first_name: string; eventTitle: string }): Email {
  return {
    subject: `Important update: ${r.eventTitle} has been cancelled`,
    html: emailLayout({
      preheader: `Unfortunately ${r.eventTitle} has been cancelled. We're sorry for any inconvenience.`,
      eyebrow: "Event update",
      title: `${r.eventTitle} has been cancelled`,
      body: [
        paragraph(`Hi ${esc(r.first_name)}, we're sorry to let you know that <strong>${esc(r.eventTitle)}</strong> has been cancelled. Apologies for any inconvenience.`),
        paragraph("Keep an eye on our website for future events, we'd love to see you there."),
        buttons([{ href: `${SITE_URL}/events`, label: "Browse upcoming events" }]),
      ].join(""),
    }),
  };
}

export function eventReminder(r: {
  first_name: string; eventTitle: string; eventStart: string; location?: string | null; cancelUrl: string;
}): Email {
  return {
    subject: `Reminder: ${r.eventTitle} is coming up`,
    html: emailLayout({
      preheader: `${r.eventTitle}, ${formatLongDate(r.eventStart)} at ${formatTime(r.eventStart)}. See you there!`,
      eyebrow: "Event reminder",
      title: `${r.eventTitle} is coming up`,
      body: [
        paragraph(`Hi ${esc(r.first_name)}, just a friendly reminder that you're booked in. Here are the details:`),
        details([
          ["Event", esc(r.eventTitle)],
          ["Date", esc(formatLongDate(r.eventStart))],
          ["Time", esc(formatTime(r.eventStart))],
          ["Location", r.location ? mapsLink(r.location) : null],
        ]),
        smallNote(`Can't make it anymore? ${link(r.cancelUrl, "Cancel your RSVP")} so we can plan numbers.`),
      ].join(""),
    }),
  };
}

export function staffReply(r: { toName: string; originalSubject?: string | null; body: string; staffName: string }): Email {
  return {
    subject: r.originalSubject ? `Re: ${r.originalSubject}` : "Reply from We Are Plas Madoc",
    html: emailLayout({
      preheader: r.body.slice(0, 120),
      eyebrow: r.originalSubject ? `About: ${r.originalSubject}` : "We Are Plas Madoc",
      title: "We've replied to your message",
      body: [
        paragraph(`Hi ${esc(r.toName)},`),
        paragraph(multiline(r.body)),
        paragraph(`Best wishes,<br><strong>${esc(r.staffName)}</strong><br>We Are Plas Madoc`),
        smallNote(`You can reply to this email, or call us on ${tel(PHONE)}.`),
      ].join(""),
    }),
  };
}
