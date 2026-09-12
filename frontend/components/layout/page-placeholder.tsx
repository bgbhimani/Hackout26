import { Card, CardContent } from "@/components/ui/card";

/** Used only until each page's real phase is built (see docs/architecture.md
 * for the phase plan) - deliberately labelled as a placeholder rather than
 * showing any invented data, per the project's "no fake features" rule. */
export function PagePlaceholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <Card>
        <CardContent className="p-8 text-sm text-muted-foreground">
          This page is built in <span className="font-medium text-foreground">{phase}</span>. Navigation and
          the application shell are working now (Phase 1); this screen will be replaced with real,
          backend-driven content in that phase.
        </CardContent>
      </Card>
    </div>
  );
}
