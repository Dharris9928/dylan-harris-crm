import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Mail, Lock, Chrome, ArrowRight, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (search) => ({
    redirect: (search.redirect as string) || "/",
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      throw redirect({ to: search.redirect || "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const [email, setEmail] = useState("demo@dylanharriscrm.com");
  const [password, setPassword] = useState("Demo1234!");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      window.location.href = search.redirect;
    }
  };

  const handleGoogleLogin = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Google login failed");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-emerald-800 p-12 lg:flex">
        <div className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-gold-400" />
          <span className="font-mono text-xl font-bold text-white">Dwayne Harris CRM</span>
        </div>
        <div>
          <h2 className="mb-4 font-mono text-3xl font-bold text-white">
            Close more deals with intelligence.
          </h2>
          <p className="max-w-md text-emerald-100">
            A premium sales CRM built for modern revenue teams. Track leads, manage pipelines, and nurture relationships — all in one place.
          </p>
          <div className="mt-8 flex gap-4">
            <div className="rounded-lg bg-emerald-700/50 p-4">
              <p className="font-mono text-2xl font-bold text-gold-400">$12M+</p>
              <p className="text-sm text-emerald-100">Pipeline managed</p>
            </div>
            <div className="rounded-lg bg-emerald-700/50 p-4">
              <p className="font-mono text-2xl font-bold text-gold-400">200+</p>
              <p className="text-sm text-emerald-100">Active contacts</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-emerald-300">Demo app for interview portfolio</p>
      </div>

      {/* Right Panel */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              <span className="font-mono text-lg font-bold">Dwayne Harris CRM</span>
            </div>
          </div>

          <h1 className="mb-2 font-mono text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Sign in to your account or{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              create one
            </Link>
          </p>

          <Button
            variant="outline"
            className="mb-6 w-full"
            onClick={handleGoogleLogin}
            type="button"
          >
            <Chrome className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Demo credentials: <span className="font-mono font-medium">demo@dylanharriscrm.com</span> /{" "}
            <span className="font-mono font-medium">Demo1234!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
