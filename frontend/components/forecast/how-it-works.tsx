import { ArrowRight, Database, Sparkles, TrendingUp } from "lucide-react";

const STEPS = [
  { icon: Database, label: "Historical data", detail: "Recent monthly quantities for this generator + waste type" },
  { icon: Sparkles, label: "Feature preparation", detail: "Month, season, previous quantity, 3-month rolling average" },
  { icon: TrendingUp, label: "XGBoost", detail: "Trained on 6 years of calibrated historical data, time-based split" },
  { icon: ArrowRight, label: "Future waste prediction", detail: "A quantity estimate, with a confidence score - not a guarantee" },
];

export function HowItWorks() {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex flex-1 items-center gap-3">
              <div className="flex flex-1 items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Predictions are model estimates based on historical patterns, not guarantees of future waste
        availability. Confidence reflects how consistently the model&apos;s underlying decision trees agree on
        this specific input - a real, inspectable signal, not a claim of scientific certainty.
      </p>
    </div>
  );
}
