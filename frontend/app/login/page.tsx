"use client";

import { useState } from "react";
import Link from "next/link";
import { Leaf } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Waste-to-Carbon Value Chain Tracker</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your email and password to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-border text-center text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Sign Up as Generator or Facility
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="font-medium text-foreground">Click to select Demo Account:</p>
            <div className="space-y-1.5 pt-1">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  type="button"
                  key={account.email}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(DEMO_PASSWORD);
                  }}
                  className="w-full flex items-center justify-between rounded-md p-1.5 text-left text-xs transition-colors hover:bg-background border border-transparent hover:border-border"
                >
                  <div>
                    <span className="font-medium text-foreground block">{account.email}</span>
                    <span className="text-[10px] text-muted-foreground">{account.desc}</span>
                  </div>
                  <span className="text-[10px] rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                    {account.role}
                  </span>
                </button>
              ))}
            </div>
            <p className="pt-2 text-xs text-muted-foreground border-t border-border">
              Password for all accounts: <span className="font-mono text-foreground font-semibold">{DEMO_PASSWORD}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
