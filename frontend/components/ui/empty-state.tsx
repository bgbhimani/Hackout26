import type { LucideIcon } from "lucide-react";

/** Shown wherever a chart or list has genuinely zero real data - e.g. Carbon
 * Impact before Phase 8 exists, or Routes before Phase 6 exists. The spec
 * explicitly forbids showing an invented number here, so an honest empty
 * state is the correct behaviour, not a placeholder to feel embarrassed about. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
      <Icon className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
