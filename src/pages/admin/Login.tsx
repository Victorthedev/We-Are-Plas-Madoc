import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import DotPattern from "@/components/ui/DotPattern";

export default function AdminLogin() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="min-h-screen bg-wapm-lavender flex items-center justify-center"><div className="w-8 h-8 border-4 border-wapm-purple border-t-transparent rounded-full animate-spin" /></div>;
  if (user) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-wapm-deep-purple relative items-center justify-center overflow-hidden">
        <DotPattern className="absolute inset-0 opacity-[0.08]" />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-full bg-wapm-purple mx-auto flex items-center justify-center text-white font-bold text-3xl mb-6">W</div>
          <h2 className="text-white text-2xl font-bold">We Are Plas Madoc</h2>
          <p className="text-white/60 mt-2 text-sm">Staff Portal</p>
          <p className="text-white/30 mt-12 text-xs italic max-w-xs mx-auto">"Built by volunteers, for the community."</p>
        </div>
      </div>

      {/* Right - login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold text-wapm-deep-purple mb-1">Welcome Back</h1>
          <p className="text-muted-foreground text-sm mb-8">Sign in to manage WAPM content</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="rounded-[10px] mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input id="password" type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="rounded-[10px] pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="text-right">
              <Link to="/admin/forgot-password" className="text-xs text-wapm-purple hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-full bg-wapm-purple hover:bg-wapm-dark-purple text-white font-semibold">
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Don't have an account? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
