"use client";

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
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Network Map", icon: MapIcon },
  { href: "/waste", label: "Waste Generators", icon: Sprout },
  { href: "/facilities", label: "Facilities", icon: Factory },
  { href: "/forecast", label: "AI Forecast", icon: TrendingUp },
  { href: "/matching", label: "Smart Matching", icon: Sparkles },
  { href: "/routes", label: "Routes", icon: RouteIcon },
  { href: "/carbon", label: "Carbon Impact", icon: Leaf },
] as const;

/** Nav-only sidebar - the logo/brand lives in the full-width Topbar per the
 * layout spec, so it isn't duplicated here. On mobile it becomes a fixed
 * off-canvas drawer, toggled by Shell via the `open` prop. */
export function Sidebar({ className, open = true }: { className?: string; open?: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "z-40 flex h-full w-64 shrink-0 flex-col border-r border-border bg-card transition-transform duration-200",
        "fixed inset-y-0 left-0 md:static",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        className
      )}
    >
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 pt-20 md:pt-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-light text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
