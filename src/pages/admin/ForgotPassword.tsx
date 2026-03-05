import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DotPattern from "@/components/ui/DotPattern";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await resetPassword(email);
    setSent(true);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-wapm-deep-purple relative items-center justify-center overflow-hidden">
        <DotPattern className="absolute inset-0 opacity-[0.08]" />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-full bg-wapm-purple mx-auto flex items-center justify-center text-white font-bold text-3xl mb-6">W</div>
          <h2 className="text-white text-2xl font-bold">We Are Plas Madoc</h2>
          <p className="text-white/60 mt-2 text-sm">Staff Portal</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4">
                <span className="text-2xl">✉️</span>
              </div>
              <h2 className="text-xl font-bold text-wapm-deep-purple mb-2">Check Your Email</h2>
              <p className="text-muted-foreground text-sm mb-6">We've sent a password reset link to your email.</p>
              <Link to="/admin/login" className="text-wapm-purple hover:underline text-sm">Back to login</Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-wapm-deep-purple mb-1">Reset Password</h1>
              <p className="text-muted-foreground text-sm mb-6">Enter your email to receive a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="rounded-[10px] mt-1" />
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-12 rounded-full bg-wapm-purple hover:bg-wapm-dark-purple text-white font-semibold">
                  {submitting ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
              <div className="text-center mt-4">
                <Link to="/admin/login" className="text-wapm-purple text-sm hover:underline">Back to login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
