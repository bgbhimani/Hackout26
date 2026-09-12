"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Leaf, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

const DEMO_ACCOUNTS = [
  { email: "admin@example.com", role: "Administrator", desc: "Network-wide Oversight" },
  { email: "generator1@example.com", role: "Waste Generator 1", desc: "Anand Dairy Manure" },
  { email: "generator2@example.com", role: "Waste Generator 2", desc: "Kheda Paddy & Cotton" },
  { email: "facility1@example.com", role: "Facility Operator 1", desc: "Anand BioGas Plant" },
  { email: "facility2@example.com", role: "Facility Operator 2", desc: "Kheda BioCarbon Plant" },
];

const DEMO_PASSWORD = "Demo@1234";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemoAccount(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="h-screen overflow-hidden bg-background p-3 sm:p-4 lg:p-5">
      {/* No max-w cap here - the panel should fill the full window width
          (the right brand panel scales with it via lg:w-[44%]) rather than
          floating in a centered column that leaves dead, unbounded-looking
          margin on both sides at wide viewports. The form itself still
          stays a readable width via its own inner max-w-sm below. */}
      <div className="flex h-full flex-col lg:flex-row lg:gap-6">
        {/* ── Left: sign-in form ────────────────────────────────────────────
             overflow-y-auto here (not on the page) means: if this column's
             content is ever taller than the viewport - e.g. before the demo
             accounts card below is removed - only this column scrolls, and
             the page itself never grows a scrollbar. */}
        <div className="flex flex-1 flex-col justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
          <div className="w-full max-w-xl">
            <Link href="/" className="mb-10 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="text-base font-semibold tracking-tight text-foreground">Waste-to-Carbon Tracker</span>
            </Link>

            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <span className="text-xs font-medium text-muted-foreground">Forgot password?</span>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Sign up as Generator or Facility
              </Link>
            </p>

            <div className="mt-8 rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Demo accounts — click to autofill
              </div>
              <div className="space-y-1.5">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemoAccount(account.email)}
                    className="flex w-full items-center justify-between rounded-md border border-transparent px-2 py-1.5 text-left text-xs transition-colors hover:border-border hover:bg-muted/60"
                  >
                    <div>
                      <span className="block font-mono text-foreground">{account.email}</span>
                      <span className="text-[11px] text-muted-foreground">{account.desc}</span>
                    </div>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                      {account.role}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Password for all demo accounts: <span className="font-mono text-foreground">{DEMO_PASSWORD}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: brand panel (hidden below lg) ─────────────────────── */}
        <div className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-[#2f4d37] lg:flex lg:w-[44%] lg:flex-col lg:p-10">
          {/* Decorative layered glow circles - abstract, no stock photo needed */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />

          <div className="relative flex flex-1 flex-col">
            <Badge className="w-fit border border-white/25 bg-white/10 text-white backdrop-blur">
              Circular Carbon Ecosystem
            </Badge>

            <div className="flex flex-1 flex-col items-start justify-center gap-5 py-8 text-white">
              <h2 className="text-4xl font-bold leading-tight">
                Welcome to the Circular Carbon Network
              </h2>
              <div className="h-px w-16 bg-white/40" />
              <p className="max-w-sm text-sm leading-relaxed text-white/80">
                Real PostGIS matching, OR-Tools routing, and a cited carbon methodology — connecting farms,
                food processors, and municipalities to biochar, biogas, and biomass facilities.
              </p>
              <Button asChild size="lg" className="rounded-full bg-white px-6 text-foreground shadow-lg hover:bg-white/90">
                <Link href="/" className="flex items-center gap-2">
                  Back to Home
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <p className="text-xs text-white/60">Team Gentalmen · HackOut&apos;26 at DAIICT</p>
          </div>
        </div>
      </div>
    </div>
  );
}
