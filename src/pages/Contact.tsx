import { useState } from "react";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "How do I book a community transport journey?", a: "Call us on 01978 813912 or 07423503836 to book. We'll arrange a volunteer driver for your date and time." },
  { q: "Is the Kettle Club free to attend?", a: "Yes! The Kettle Club is completely free and open to all Plas Madoc residents. Just turn up!" },
  { q: "How do I enrol my child at Little Sunflowers?", a: "Get in touch with us via phone or email and we'll walk you through the enrolment process." },
  { q: "Can I volunteer even if I have limited time?", a: "Absolutely. We have flexible volunteering options to suit your availability." },
  { q: "How is WAPM funded?", a: "WAPM is a registered CIO charity funded through grants, donations, and community fundraising." },
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (!form.subject.trim()) e.subject = "Required";
    if (!form.message.trim()) e.message = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setSent(true);
    toast.success("Message sent successfully!");
  };

  const update = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

  const inputCls = (field: string) => `input-wapm ${errors[field] ? "input-wapm-error" : "border-input"}`;

  return (
    <main id="main">
      <PageHero title="Contact Us" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Contact Us" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <AnimatedSection>
              <div className="card-wapm p-8 bg-secondary/30 h-full">
                <h3 className="text-xl font-semibold text-foreground mb-6">Get In Touch</h3>
                <div className="space-y-6">
                  {[
                    { name: "Claire Pugh", role: "AVOW Play Department Manager & Community Development Manager", phone: "01978 813912" },
                    { name: "Donna Jordan", role: "AVOW Play Team & Community Development Officer", phone: "07394465113" },
                    { name: "Community Transport", role: "Transport booking line", phone: "07423503836" },
                  ].map(person => (
                    <div key={person.name}>
                      <p className="font-semibold text-foreground text-sm">{person.name}</p>
                      <p className="text-xs text-muted-foreground mb-1">{person.role}</p>
                      <a href={`tel:${person.phone.replace(/\s/g, "")}`} className="text-sm text-primary hover:text-accent transition-colors">📞 {person.phone}</a>
                    </div>
                  ))}
                  <a href="mailto:weareplasmadoc@avow.org" className="text-sm text-primary hover:text-accent transition-colors block">✉️ weareplasmadoc@avow.org</a>
                </div>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.1}>
              <div className="card-wapm p-8 bg-secondary/30 h-full">
                <h3 className="text-xl font-semibold text-foreground mb-6">Find Us</h3>
                <div className="rounded-xl overflow-hidden mb-4 h-[250px]">
                  <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4800!2d-3.155!3d52.995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zUGxhcyBNYWRvYw!5e0!3m2!1sen!2suk!4v1" className="w-full h-full border-0" allowFullScreen loading="lazy" title="WAPM Location" />
                </div>
                <p className="text-sm text-muted-foreground">📍 The Opportunities Centre, Plas Madoc, Wrexham, LL14 3US</p>
                <div className="flex gap-3 mt-4">
                  <a href="https://facebook.com/WeArePlasMadoc" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all font-bold">f</a>
                  <a href="https://twitter.com/WePlas" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all font-bold">𝕏</a>
                </div>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
              <div className="card-wapm p-8 bg-secondary/30 h-full">
                <h3 className="text-xl font-semibold text-foreground mb-6">Send a Message</h3>
                {sent ? (
                  <div className="text-center py-8"><div className="text-5xl mb-3">✅</div><p className="text-foreground font-semibold">Message sent!</p><p className="text-sm text-muted-foreground">We'll get back to you within 2 working days.</p></div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div><input placeholder="Name *" value={form.name} onChange={e => update("name", e.target.value)} className={inputCls("name")} />{errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}</div>
                    <div><input placeholder="Email *" type="email" value={form.email} onChange={e => update("email", e.target.value)} className={inputCls("email")} />{errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}</div>
                    <div><input placeholder="Phone (optional)" type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} className="input-wapm border-input" /></div>
                    <div><input placeholder="Subject *" value={form.subject} onChange={e => update("subject", e.target.value)} className={inputCls("subject")} />{errors.subject && <p className="text-destructive text-xs mt-1">{errors.subject}</p>}</div>
                    <div><textarea placeholder="Message *" rows={4} value={form.message} onChange={e => update("message", e.target.value)} className={`${inputCls("message")} resize-none`} />{errors.message && <p className="text-destructive text-xs mt-1">{errors.message}</p>}</div>
                    <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">{loading ? "Sending..." : "Send Message"}</button>
                  </form>
                )}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
      <section className="section-padding bg-wapm-lavender">
        <div className="container mx-auto max-w-3xl">
          <AnimatedSection className="text-center mb-12"><h2 className="text-3xl font-bold text-foreground">Frequently Asked Questions</h2></AnimatedSection>
          <AnimatedSection>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-b border-secondary">
                  <AccordionTrigger className="text-foreground font-semibold text-left hover:text-primary transition-colors py-5">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}
