"use client";

import { Bell, Leaf, Menu, Search, ShieldCheck, Sprout, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { User, UserRole } from "@/types";

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; icon: typeof ShieldCheck; badgeClass: string }
> = {
  ADMIN: {
    label: "Admin",
    icon: ShieldCheck,
    badgeClass: "bg-primary/15 text-primary border-primary/30",
  },
  WASTE_GENERATOR: {
    label: "Waste Generator",
    icon: Sprout,
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  FACILITY_OPERATOR: {
    label: "Facility Operator",
    icon: Building2,
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  },
};

export function Topbar({
  user,
  onLogout,
  onMenuClick,
}: {
  user: User | null;
  onLogout: () => void;
  onMenuClick: () => void;
}) {
  const roleConfig = user ? ROLE_CONFIG[user.role] || ROLE_CONFIG.ADMIN : ROLE_CONFIG.ADMIN;
  const RoleIcon = roleConfig.icon;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={onMenuClick}
          className="mr-1 rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
          <Leaf className="h-5 w-5" />
        </div>
        <span className="hidden text-sm font-semibold text-foreground sm:inline">
          Waste-to-Carbon Value Chain Tracker
        </span>
      </div>

      <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground md:flex mx-6">
        <Search className="h-4 w-4" />
        <span>Search generators, facilities, routes...</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
        </button>

        {user && (
          <div className="flex items-center gap-3 border-l border-border pl-4">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <p className="text-sm font-medium leading-none text-foreground">{user.name}</p>
                <Badge
                  variant="outline"
                  className={`text-[10px] py-0 px-1.5 gap-1 font-medium ${roleConfig.badgeClass}`}
                >
                  <RoleIcon className="h-2.5 w-2.5" />
                  {roleConfig.label}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout}>
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

