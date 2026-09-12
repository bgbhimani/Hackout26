"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { ShellSkeleton } from "@/components/layout/shell-skeleton";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/hooks/use-auth";

/** Wraps every authenticated page: topbar + sidebar + content, and redirects
 * to /login if there is no valid session. Used by app/(app)/layout.tsx. */
export function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();

  if (loading) {
    return <ShellSkeleton />;
  }

  if (!user) {
    // Client-side guard - Phase 1 keeps auth simple (JWT in localStorage,
    // no server-side session), so route protection happens here rather
    // than in Next.js middleware.
    router.replace("/login");
    return null;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Topbar user={user} onLogout={logout} onMenuClick={() => setMobileNavOpen((v) => !v)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={mobileNavOpen} />
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-30 bg-foreground/20 md:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden
          />
        )}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
