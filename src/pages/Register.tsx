import { useState } from "react";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { toast } from "sonner";
import { supabase } from "@/integrations/superbase/client";
import { PLAYGROUNDS } from "@/lib/vms";
import { CheckCircleIcon, UsersIcon } from "@phosphor-icons/react";

export default function Register() {
  const [form, setForm] = useState({
    childFirstName: "",
    childLastName: "",
    dateOfBirth: "",
    playground: "",
    ethnicity: "",
    medicalConditions: "",
    allergies: "",
    additionalLearningNeeds: "",
    includeParent: false,
    parentFirstName: "",
    parentLastName: "",
    parentPhone: "",
    relationship: "",
    parentDateOfBirth: "",
    parentLanguage: "",
    parentCulturalBackground: "",
    parentReligion: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.childFirstName.trim()) e.childFirstName = "Required";
    if (!form.childLastName.trim()) e.childLastName = "Required";
    if (!form.dateOfBirth) e.dateOfBirth = "Required";
    if (!form.playground) e.playground = "Please select a playground";
    if (form.includeParent) {
      if (!form.parentFirstName.trim()) e.parentFirstName = "Required";
      if (!form.parentLastName.trim()) e.parentLastName = "Required";
      if (!form.parentPhone.trim()) e.parentPhone = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const update = (field: string, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const { error } = await supabase.functions.invoke("handle-child-registration", {
      body: {
        child_first_name: form.childFirstName,
        child_last_name: form.childLastName,
        date_of_birth: form.dateOfBirth,
        playground: form.playground,
        ethnicity: form.ethnicity || null,
        medical_conditions: form.medicalConditions || null,
        allergies: form.allergies || null,
        additional_learning_needs: form.additionalLearningNeeds || null,
        ...(form.includeParent
          ? {
              parent_first_name: form.parentFirstName,
              parent_last_name: form.parentLastName,
              parent_phone: form.parentPhone,
              relationship: form.relationship || null,
              parent_date_of_birth: form.parentDateOfBirth || null,
              parent_language: form.parentLanguage || null,
              parent_cultural_background: form.parentCulturalBackground || null,
              parent_religion: form.parentReligion || null,
              is_primary_contact: true,
            }
          : {}),
      },
    });

    setLoading(false);
    if (error) {
      toast.error("Failed to submit registration. Please try again or contact us directly.");
    } else {
      setSubmitted(true);
      toast.success("Registration submitted!");
    }
  };

  const inputCls = (field: string) => `input-wapm ${errors[field] ? "input-wapm-error" : "border-input"}`;

  return (
    <main id="main">
      <PageHero title="Register With Us" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Register" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto max-w-2xl">
          <AnimatedSection>
            <div className="card-wapm p-8">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-wapm-green/10 text-wapm-green flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-9 h-9" weight="duotone" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Thank you!</h3>
                  <p className="text-muted-foreground">
                    {form.childFirstName}'s registration has been received and is being reviewed by our team. We'll be in touch if we need anything else.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <UsersIcon className="w-5 h-5" weight="duotone" />
                    </span>
                    <h3 className="text-2xl font-semibold text-primary">Register a Child or Young Person</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Fill this in to register for the playground or Youth Club. Age determines which sessions your child is eligible for, so there's nothing else to choose.
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Child's First Name *</label>
                        <input value={form.childFirstName} onChange={(e) => update("childFirstName", e.target.value)} className={inputCls("childFirstName")} />
                        {errors.childFirstName && <p className="text-destructive text-xs mt-1">{errors.childFirstName}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Child's Last Name *</label>
                        <input value={form.childLastName} onChange={(e) => update("childLastName", e.target.value)} className={inputCls("childLastName")} />
                        {errors.childLastName && <p className="text-destructive text-xs mt-1">{errors.childLastName}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Date of Birth *</label>
                        <input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} className={inputCls("dateOfBirth")} />
                        {errors.dateOfBirth && <p className="text-destructive text-xs mt-1">{errors.dateOfBirth}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Playground *</label>
                        <select value={form.playground} onChange={(e) => update("playground", e.target.value)} className={inputCls("playground")}>
                          <option value="">Select a playground</option>
                          {PLAYGROUNDS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                        {errors.playground && <p className="text-destructive text-xs mt-1">{errors.playground}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Ethnicity (optional)</label>
                      <input value={form.ethnicity} onChange={(e) => update("ethnicity", e.target.value)} className="input-wapm border-input" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Medical Conditions (optional)</label>
                      <textarea value={form.medicalConditions} onChange={(e) => update("medicalConditions", e.target.value)} rows={2} className="input-wapm border-input resize-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Allergies (optional)</label>
                      <textarea value={form.allergies} onChange={(e) => update("allergies", e.target.value)} rows={2} className="input-wapm border-input resize-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Additional Learning Needs (optional)</label>
                      <textarea value={form.additionalLearningNeeds} onChange={(e) => update("additionalLearningNeeds", e.target.value)} rows={2} className="input-wapm border-input resize-none" />
                    </div>

                    <label className="flex items-center gap-2 pt-2 cursor-pointer">
                      <input type="checkbox" checked={form.includeParent} onChange={(e) => update("includeParent", e.target.checked)} className="w-4 h-4 accent-primary" />
                      <span className="text-sm font-medium text-foreground">Add a parent or guardian contact</span>
                    </label>

                    {form.includeParent && (
                      <div className="space-y-4 border-t border-border pt-4 mt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">Parent/Guardian First Name *</label>
                            <input value={form.parentFirstName} onChange={(e) => update("parentFirstName", e.target.value)} className={inputCls("parentFirstName")} />
                            {errors.parentFirstName && <p className="text-destructive text-xs mt-1">{errors.parentFirstName}</p>}
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">Parent/Guardian Last Name *</label>
                            <input value={form.parentLastName} onChange={(e) => update("parentLastName", e.target.value)} className={inputCls("parentLastName")} />
                            {errors.parentLastName && <p className="text-destructive text-xs mt-1">{errors.parentLastName}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">Phone *</label>
                            <input type="tel" value={form.parentPhone} onChange={(e) => update("parentPhone", e.target.value)} className={inputCls("parentPhone")} />
                            {errors.parentPhone && <p className="text-destructive text-xs mt-1">{errors.parentPhone}</p>}
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">Relationship to Child</label>
                            <input placeholder="e.g. Mother, Father, Guardian" value={form.relationship} onChange={(e) => update("relationship", e.target.value)} className="input-wapm border-input" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">Date of Birth (optional)</label>
                            <input type="date" value={form.parentDateOfBirth} onChange={(e) => update("parentDateOfBirth", e.target.value)} className="input-wapm border-input" />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">Language (optional)</label>
                            <input value={form.parentLanguage} onChange={(e) => update("parentLanguage", e.target.value)} className="input-wapm border-input" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">Cultural Background (optional)</label>
                            <input value={form.parentCulturalBackground} onChange={(e) => update("parentCulturalBackground", e.target.value)} className="input-wapm border-input" />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">Religion (optional)</label>
                            <input value={form.parentReligion} onChange={(e) => update("parentReligion", e.target.value)} className="input-wapm border-input" />
                          </div>
                        </div>
                      </div>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary w-full py-4 disabled:opacity-60">
                      {loading ? "Submitting..." : "Submit Registration"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}
