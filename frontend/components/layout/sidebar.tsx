"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map as MapIcon,
  Sprout,
  Factory,
  TrendingUp,
  Sparkles,
  Route as RouteIcon,
  Leaf,
  ShieldCheck,
  Building2,
  Inbox,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import type { PendingMatchOut, UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Network Map", icon: MapIcon },
  { href: "/waste", label: "Waste Generators", icon: Sprout },
  { href: "/facilities", label: "Facilities", icon: Factory },
  { href: "/forecast", label: "AI Forecast", icon: TrendingUp },
  { href: "/matching", label: "Smart Matching", icon: Sparkles },
  { href: "/routes", label: "Route Logistics", icon: RouteIcon },
  { href: "/carbon", label: "Carbon Impact", icon: Leaf },
];

const GENERATOR_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Partner Map", icon: MapIcon },
  { href: "/waste", label: "Log Waste Batches", icon: Sprout, badge: "CRUD" },
  { href: "/forecast", label: "AI Yield Forecast", icon: TrendingUp, badge: "ML" },
  { href: "/matching", label: "Smart Matching", icon: Sparkles, badge: "AI Match" },
  { href: "/matching/my-requests", label: "My Requests", icon: Inbox },
  { href: "/carbon", label: "Carbon Offsets", icon: Leaf },
];

const FACILITY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Operations Map", icon: MapIcon },
  { href: "/facilities", label: "Facility Management", icon: Factory, badge: "Capacity" },
  { href: "/matching/requests", label: "Requests", icon: Inbox },
  { href: "/routes", label: "Logistics & Routes", icon: RouteIcon, badge: "OR-Tools" },
  { href: "/matching", label: "Feedstock Sourcing", icon: Sparkles, badge: "Intake" },
  { href: "/carbon", label: "Carbon Sequestration", icon: Leaf },
];

const ROLE_META: Record<
  UserRole,
  { label: string; icon: typeof ShieldCheck; color: string; badgeClass: string; description: string }
> = {
  ADMIN: {
    label: "Admin Portal",
    icon: ShieldCheck,
    color: "text-primary",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    description: "System Oversight",
  },
  WASTE_GENERATOR: {
    label: "Generator Portal",
    icon: Sprout,
    color: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    description: "Waste Logging & Offsets",
  },
  FACILITY_OPERATOR: {
    label: "Facility Portal",
    icon: Building2,
    color: "text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    description: "Intake, Routing & Plant Specs",
  },
};

/** Nav-only sidebar - role-aware, displaying features tailored to the logged-in user's role. */
export function Sidebar({ className, open = true }: { className?: string; open?: boolean }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const role: UserRole = user?.role || "ADMIN";
  const roleMeta = ROLE_META[role] || ROLE_META.ADMIN;

  const navItems =
    role === "WASTE_GENERATOR"
      ? GENERATOR_NAV
      : role === "FACILITY_OPERATOR"
      ? FACILITY_NAV
      : ADMIN_NAV;

  // A real count, not a fabricated badge: how many negotiations actually
  // need THIS user's action right now (can_respond), not just how many
  // exist - a request awaiting the other side's response shouldn't nag
  // either party to re-open it. Facility Operators poll their inbox,
  // Waste Generators poll their sent requests; an admin has neither.
  const [actionableCount, setActionableCount] = useState<number | null>(null);
  const badgeHref = role === "FACILITY_OPERATOR" ? "/matching/requests" : "/matching/my-requests";
  useEffect(() => {
    if (role !== "FACILITY_OPERATOR" && role !== "WASTE_GENERATOR") return;
    const path = role === "FACILITY_OPERATOR" ? "/api/matching/pending" : "/api/matching/my-requests";
    let cancelled = false;
    apiFetch<PendingMatchOut[]>(path)
      .then((matches) => !cancelled && setActionableCount(matches.filter((m) => m.can_respond).length))
      .catch(() => !cancelled && setActionableCount(null));
    return () => {
      cancelled = true;
    };
  }, [role, pathname]);

  const RoleIcon = roleMeta.icon;

  return (
    <aside
      className={cn(
        "z-40 flex h-full w-64 shrink-0 flex-col border-r border-border bg-card transition-transform duration-200",
        "fixed inset-y-0 left-0 md:static",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        className
      )}
    >
      {/* Role Banner Indicator in Sidebar */}
      <div className="border-b border-border/70 p-3 pt-20 md:pt-3">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <RoleIcon className={cn("h-4 w-4", roleMeta.color)} />
            <div>
              <p className="text-xs font-semibold leading-none text-foreground">{roleMeta.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{roleMeta.description}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            {role.split("_")[0]}
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <div className="px-2 py-1 text-[11px] font-medium tracking-wider text-muted-foreground/70 uppercase">
          Navigation
        </div>
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-light text-primary font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </div>
              {href === badgeHref && actionableCount !== null && actionableCount > 0 ? (
                <Badge className="ml-auto px-1.5 py-0 text-[10px] font-semibold leading-tight">
                  {actionableCount}
                </Badge>
              ) : (
                badge && (
                  <Badge
                    variant="outline"
                    className="ml-auto px-1.5 py-0 text-[10px] font-normal leading-tight"
                  >
                    {badge}
                  </Badge>
                )
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
