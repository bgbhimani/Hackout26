"use client";

import { Bell, Leaf, Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { User } from "@/types";

const ROLE_LABEL: Record<User["role"], string> = {
  ADMIN: "Administrator",
  WASTE_GENERATOR: "Waste Generator",
  FACILITY_OPERATOR: "Facility Operator",
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
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
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
              <p className="text-sm font-medium leading-none text-foreground">{user.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
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
