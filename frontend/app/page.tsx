"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Factory,
  Leaf,
  Map as MapIcon,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  Sprout,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#roles", label: "Who it's for" },
];

const TRUST_ITEMS = [
  "Real Google OR-Tools routing",
  "Real PostGIS geodesic distances",
  "Real XGBoost forecasting",
  "IPCC-cited carbon math",
];

const PIPELINE_STEPS = [
  { icon: TrendingUp, label: "Predict", detail: "XGBoost forecasts next month's waste availability from real historical patterns" },
  { icon: Sparkles, label: "Match", detail: "A transparent, weighted score finds the best conversion facility - never a black box" },
  { icon: RouteIcon, label: "Route", detail: "Google OR-Tools solves a real capacitated vehicle routing problem" },
  { icon: Leaf, label: "Measure", detail: "A cited methodology estimates the CO₂e impact of every tonne diverted" },
];

// Each feature card gets one of these three tones, cycling in order - gives
// the grid visual rhythm instead of six identical gray icon tiles.
const ICON_TONES = [
  "bg-primary-light text-primary",
  "bg-accent-light text-accent-foreground",
  "bg-secondary text-secondary-foreground",
] as const;

const FEATURES = [
  { icon: TrendingUp, title: "AI Waste Forecasting", desc: "Random Forest baseline, XGBoost final model, time-based train/test split - a real confidence score, not a fabricated one." },
  { icon: Sparkles, title: "Smart Facility Matching", desc: "Compatibility, distance, capacity, and utilization blended into one explainable score with real PostGIS distances." },
  { icon: RouteIcon, title: "Route Optimization", desc: "A genuine single-vehicle CVRP solved with Google OR-Tools - not a straight line between points." },
  { icon: Leaf, title: "Carbon Impact Engine", desc: "Four separate, cited calculation steps - biochar sequestration and biogas avoided-emissions are never conflated." },
  { icon: MapIcon, title: "Interactive Network Map", desc: "Every generator, facility, and optimized route plotted on a live, filterable map." },
  { icon: Factory, title: "Full Fleet Management", desc: "Complete CRUD for generators and facilities, with role-gated permissions and live capacity tracking." },
];

const ROLES = [
  { icon: Sprout, label: "Waste Generators", desc: "Farms, food processors, and municipalities logging available waste and finding facilities." },
  { icon: Building2, label: "Facility Operators", desc: "Biochar, biogas, and biomass conversion plants managing intake and capacity." },
  { icon: ShieldCheck, label: "Administrators", desc: "Full network oversight - every generator, facility, route, and carbon record." },
];

const SHOWCASE = [
  {
    image: "/images/aerial-farm.jpg",
    alt: "Aerial view of agricultural fields",
    eyebrow: "Predict",
    title: "Know what's coming before it's ready for pickup",
    desc: "A model trained on six years of calibrated historical data forecasts next month's waste availability for every generator - with a real, inspectable confidence score.",
  },
  {
    image: "/images/conversion-facility.jpg",
    alt: "Industrial conversion facility with pipes",
    eyebrow: "Match",
    title: "Find the right facility, and know exactly why",
    desc: "Compatibility, distance, spare capacity, and current utilization blend into one transparent score - every recommendation ships with plain-English reasons.",
    reverse: true,
  },
  {
    image: "/images/punjab-tractor.jpg",
    alt: "Tractor collecting crop residue in a Punjab field",
    eyebrow: "Route",
    title: "One truck, the optimal stop order, every time",
    desc: "A real constraint solver - not a heuristic - decides which stops fit under vehicle and facility capacity, and reports honestly when something has to be dropped.",
  },
  {
    image: "/images/rice-field.jpg",
    alt: "Aerial view of a rice field",
    eyebrow: "Measure",
    title: "Every tonne, traced to an estimated CO₂e impact",
    desc: "Biochar sequestration and biogas avoided-emissions are modelled as the physically different mechanisms they are - never a universal 1-tonne-equals-X shortcut.",
    reverse: true,
  },
];

/** Public landing page. Renders immediately with no data fetch, so a
 * logged-out visitor never sees a blank screen or an auth-error flash.
 * An already-logged-in visitor is redirected onward to their dashboard in
 * the background, without blocking this page's first render. */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card shadow-sm">
        {/* Full-width nav bar (no max-w column) - the logo and the auth
            buttons should sit at the literal edges of the window, not
            inset inside a centered content column like the sections below. */}
        <div className="grid grid-cols-2 items-center px-6 py-3.5 md:grid-cols-[1fr_auto_1fr] lg:px-10">
          {/* Left corner: logo + name, always anchored to the start */}
          <div className="flex items-center gap-2.5 justify-self-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">Waste-to-Carbon Tracker</span>
          </div>

          {/* Center: nav links - truly centered regardless of how wide the
              left/right columns are, since they live in their own grid track */}
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Right corner: Log In / Get Started, always anchored to the end */}
          <div className="flex items-center gap-2 justify-self-end">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild size="sm" className="shadow-sm">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Image src="/images/aerial-farm.jpg" alt="" fill priority className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-b from-foreground/90 via-foreground/70 to-background" />
          </div>

          <div className="relative mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
            <Badge className="mb-5 border border-white/30 bg-white/10 text-white backdrop-blur">
              Circular Carbon Ecosystem · HackOut&apos;26
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Turn waste into a<br className="hidden sm:block" /> carbon-negative value chain
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
              Connects farms, food processors, and municipalities with biochar, biogas, and biomass
              conversion facilities — forecasting availability, matching the right facility, optimizing
              the collection route, and estimating the CO₂ impact of every tonne diverted from landfill.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="shadow-lg shadow-primary/20">
                <Link href="/signup">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="/login">Log In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Trust strip ───────────────────────────────────────────── */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-5xl px-6 py-7">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {TRUST_ITEMS.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-primary-light/60 px-3.5 py-1.5 text-xs font-medium text-foreground sm:text-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────── */}
        <section id="how-it-works" className="bg-card">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="text-center">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">How it works</h2>
              <p className="mt-3 text-3xl font-bold text-foreground">Predict → Match → Route → Measure</p>
            </div>

            <div className="relative mt-12">
              {/* Connecting line across the pipeline - visible only where the
                  cards sit in a single row (lg+), giving the 4 steps a
                  visual "flow" instead of reading as 4 unrelated tiles. */}
              <div className="absolute inset-x-0 top-8 hidden h-px bg-border lg:block" aria-hidden />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {PIPELINE_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <Card
                      key={step.label}
                      className="relative border-border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <CardContent className="space-y-3 p-6">
                        <div className="flex items-center gap-3">
                          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Step {i + 1}
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-foreground">{step.label}</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Showcase (alternating image/text) ─────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="space-y-16">
            {SHOWCASE.map((item) => (
              <div key={item.title} className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
                <div className={item.reverse ? "md:order-2" : ""}>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-lg ring-1 ring-border">
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 50vw, 100vw"
                    />
                  </div>
                </div>
                <div className={item.reverse ? "md:order-1" : ""}>
                  <Badge variant="default" className="mb-3">
                    {item.eyebrow}
                  </Badge>
                  <h3 className="text-2xl font-bold text-foreground sm:text-3xl">{item.title}</h3>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature grid ──────────────────────────────────────────── */}
        <section id="features" className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="text-center">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">Platform</h2>
              <p className="mt-3 text-3xl font-bold text-foreground">Everything the value chain needs</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Card
                    key={f.title}
                    className="border-border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <CardContent className="space-y-3 p-6">
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-lg shadow-sm",
                          ICON_TONES[i % ICON_TONES.length]
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-base font-semibold text-foreground">{f.title}</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Roles ─────────────────────────────────────────────────── */}
        <section id="roles" className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">Who it&apos;s for</h2>
            <p className="mt-3 text-3xl font-bold text-foreground">Built for every role in the chain</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {ROLES.map((role, i) => {
              const Icon = role.icon;
              return (
                <Card
                  key={role.label}
                  className="border-border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <CardContent className="space-y-3 p-6">
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-lg shadow-sm",
                        ICON_TONES[i % ICON_TONES.length]
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-base font-semibold text-foreground">{role.label}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{role.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Image src="/images/solar-panels.jpg" alt="" fill className="object-cover" sizes="100vw" />
            {/* A directional, brand-tinted overlay - not a flat dark filter -
                so the photo reads as deliberately art-directed rather than a
                stock image with a plain darkening layer slapped on top. */}
            <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/80 to-primary/40" />
          </div>
          <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white shadow-lg backdrop-blur">
              <MapIcon className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to see it in action?</h2>
            <p className="max-w-md text-sm leading-relaxed text-white/85">
              Every figure in the demo is either real published data or clearly labelled as calibrated,
              synthetic data — never presented as verified without saying so.
            </p>
            <Button asChild size="lg" className="shadow-lg">
              <Link href="/login">
                Log In to Continue
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card">
        <div className="px-6 pt-10 pb-6 lg:px-10">
          <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Leaf className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold text-foreground">Waste-to-Carbon</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Team Gentalmen · HackOut&apos;26 at DAIICT</p>
              <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Tracking farm and municipal waste into biochar, biogas, and biomass conversion facilities.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Product</p>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li><Link href="/map" className="hover:text-foreground">Network Map</Link></li>
                <li><Link href="/forecast" className="hover:text-foreground">AI Forecast</Link></li>
                <li><Link href="/matching" className="hover:text-foreground">Smart Matching</Link></li>
                <li><Link href="/carbon" className="hover:text-foreground">Carbon Impact</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Account</p>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground">Log In</Link></li>
                <li><Link href="/signup" className="hover:text-foreground">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Theme</p>
              <p className="mt-3 text-xs text-muted-foreground">Circular Carbon Ecosystem</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-foreground">Stack</p>
              <p className="mt-3 text-xs text-muted-foreground">Next.js · FastAPI · PostGIS · OR-Tools</p>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-4 pb-1 text-center text-xs text-muted-foreground">
            Created by <span className="font-semibold text-foreground">Team Gentalmen</span> for HackOut&apos;26 at DAIICT
          </div>
        </div>
      </footer>
    </div>
  );
}
