import { Skeleton } from "@/components/ui/skeleton";

/** Shown for the brief window while useAuth() resolves the current session
 * (checking a token that's already in localStorage against /api/auth/me).
 * Mirrors the real Topbar+Sidebar+content shape so there's no layout shift
 * when the real content swaps in - a plain spinner or "Loading..." text
 * would flash and then jump, this doesn't. */
export function ShellSkeleton() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Topbar skeleton */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="hidden h-4 w-48 sm:block" />
        </div>
        <Skeleton className="hidden h-9 w-64 rounded-md md:block" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton */}
        <aside className="hidden w-64 shrink-0 flex-col gap-1 border-r border-border bg-card p-3 md:flex">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </aside>

        {/* Content skeleton - generic card grid, close enough to every real page's shape */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Skeleton className="mb-2 h-7 w-48" />
          <Skeleton className="mb-6 h-4 w-80" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px]" />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-[280px]" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
