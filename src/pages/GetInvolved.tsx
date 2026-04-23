import { useState, useEffect } from "react";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { toast } from "sonner";
import { supabase } from "@/integrations/superbase/client";

type VolunteerPosition = {
  id: string;
  title: string;
  commitment: string;
  involved: string;
  requirements: string;
};

export default function GetInvolved() {
  const [positions, setPositions] = useState<VolunteerPosition[]>([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", position: "", startDate: "", message: "", cvLink: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("volunteer_positions")
      .select("id, title, commitment, involved, requirements")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => setPositions(data || []));
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (!form.phone.trim()) e.phone = "Required";
    if (!form.position) e.position = "Please select a position";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const { error } = await supabase.functions.invoke("handle-volunteer", {
      body: {
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        position: form.position,
        start_date: form.startDate || null,
        cv_link: form.cvLink || null,
        message: form.message,
      },
    });

    setLoading(false);
    if (error) {
      toast.error("Failed to submit application. Please try again or contact us directly.");
    } else {
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    }
  };

  const update = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

  const inputCls = (field: string) => `input-wapm ${errors[field] ? "input-wapm-error" : "border-input"}`;

  return (
    <main id="main">
      <PageHero title="Want To Get Involved?" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Get Involved" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-foreground mb-8">Why Volunteer With WAPM?</h2>
              <div className="space-y-4 mb-8">
                {[
                  { icon: "💜", text: "Make a real difference in your local community" },
                  { icon: "🤝", text: "Meet amazing people and build friendships" },
                  { icon: "📚", text: "Gain valuable skills and experience" },
                  { icon: "⭐", text: "Flexible commitment — give as much time as you can" },
                ].map((b) => (
                  <div key={b.text} className="flex items-start gap-3">
                    <span className="text-2xl">{b.icon}</span>
                    <p className="text-muted-foreground">{b.text}</p>
                  </div>
                ))}
              </div>
              <blockquote className="relative border-l-4 border-primary pl-6 py-2">
                <span className="text-6xl text-primary/20 absolute -top-4 -left-2 font-serif leading-none">"</span>
                <p className="text-foreground italic">Volunteering with WAPM has been the best thing I've ever done for my local area.</p>
                <footer className="text-sm text-muted-foreground mt-2">— Community Volunteer</footer>
              </blockquote>
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
              <div className="card-wapm p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Thank you {form.firstName}!</h3>
                    <p className="text-muted-foreground">We've received your application and will be in touch soon.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl font-semibold text-primary mb-6">Come Work With Us</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-sm font-medium text-foreground mb-1 block">First Name *</label><input value={form.firstName} onChange={e => update("firstName", e.target.value)} className={inputCls("firstName")} />{errors.firstName && <p className="text-destructive text-xs mt-1">{errors.firstName}</p>}</div>
                        <div><label className="text-sm font-medium text-foreground mb-1 block">Last Name *</label><input value={form.lastName} onChange={e => update("lastName", e.target.value)} className={inputCls("lastName")} />{errors.lastName && <p className="text-destructive text-xs mt-1">{errors.lastName}</p>}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-sm font-medium text-foreground mb-1 block">Email *</label><input type="email" value={form.email} onChange={e => update("email", e.target.value)} className={inputCls("email")} />{errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}</div>
                        <div><label className="text-sm font-medium text-foreground mb-1 block">Phone *</label><input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} className={inputCls("phone")} />{errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}</div>
                      </div>
                      <div><label className="text-sm font-medium text-foreground mb-1 block">Position *</label><select value={form.position} onChange={e => update("position", e.target.value)} className={inputCls("position")}><option value="">Select a position</option>{positions.map(p => <option key={p.id} value={p.title}>{p.title}</option>)}<option value="Admin Support">Admin Support</option><option value="Fundraising">Fundraising</option><option value="General Volunteer">General Volunteer</option><option value="Other">Other</option></select>{errors.position && <p className="text-destructive text-xs mt-1">{errors.position}</p>}</div>
                      <div><label className="text-sm font-medium text-foreground mb-1 block">Start Date</label><input type="date" value={form.startDate} onChange={e => update("startDate", e.target.value)} className="input-wapm border-input" /></div>
                      <div><label className="text-sm font-medium text-foreground mb-1 block">Why do you want to volunteer?</label><textarea value={form.message} onChange={e => update("message", e.target.value)} rows={4} className="input-wapm border-input resize-none" /></div>
                      <div><label className="text-sm font-medium text-foreground mb-1 block">Link to CV/LinkedIn (optional)</label><input value={form.cvLink} onChange={e => update("cvLink", e.target.value)} className="input-wapm border-input" /></div>
                      <button type="submit" disabled={loading} className="btn-primary w-full py-4 disabled:opacity-60">{loading ? "Sending..." : "Send Application"}</button>
                    </form>
                  </>
                )}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
      <section className="section-padding bg-wapm-lavender">
        <div className="container mx-auto">
          <AnimatedSection className="text-center mb-12"><h2 className="text-3xl font-bold text-foreground">Current Volunteer Vacancies</h2></AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {positions.map((v, i) => (
              <AnimatedSection key={v.id} delay={i * 0.1}>
                <div className="card-wapm p-8 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold text-primary">{v.title}</h3>
                    <span className="pill-badge-cyan text-xs flex-shrink-0">{v.commitment}</span>
                  </div>
                  <h4 className="font-medium text-foreground text-sm mb-2">What's involved:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                    {v.involved.split("\n").filter(Boolean).map(item => <li key={item}>• {item}</li>)}
                  </ul>
                  {v.requirements && (
                    <>
                      <h4 className="font-medium text-foreground text-sm mb-2">Requirements:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 mb-6">
                        {v.requirements.split("\n").filter(Boolean).map(item => <li key={item}>• {item}</li>)}
                      </ul>
                    </>
                  )}
                  <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn-outline-primary text-sm">Express Interest →</button>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
