import { ArrowDown } from "lucide-react";

import type { CarbonRecord } from "@/types";

function Step({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

/** The literal pipeline the spec asks for, rendered as a vertical flow with
 * the actual numbers from one calculated CarbonRecord - never a static
 * diagram, always this specific result. */
export function CalculationBreakdown({ record }: { record: CarbonRecord }) {
  return (
    <div className="space-y-2">
      <Step label="Waste quantity" value={`${record.waste_quantity_tonnes} t`} note={record.conversion_type} />
      <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
      <Step
        label="Conversion output"
        value={`${record.conversion_output_tonnes} t`}
        note="Product mass after processing (biochar / digestate / processed fuel)"
      />
      <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
      <Step
        label="Carbon content (reference)"
        value={`${record.carbon_content_percent}%`}
        note="Only used directly in the Biochar route - see methodology note below"
      />
      <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
      <Step
        label="Estimated sequestered / avoided CO₂e"
        value={`${record.estimated_sequestered_co2_tonnes} t CO₂e`}
      />
      <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
      <Step label="Transport emissions" value={`${record.transport_emissions_tonnes} t CO₂e`} note="Real distance × DEFRA freight factor" />
      <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
      <Step
        label="Net estimated CO₂ impact"
        value={`${record.net_co2_impact_tonnes} t CO₂e`}
        note="Sequestered/avoided minus transport - this is an estimate, not a certified offset"
      />

      <div className="mt-3 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Methodology: </span>
        {record.methodology_note}
      </div>
    </div>
  );
}
