import Link from "next/link";
import { ArrowRight, Factory, Leaf, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OptimizedRoute } from "@/types";

export function RouteTimeline({ route }: { route: OptimizedRoute }) {
  const items = [
    ...route.stops.map((s) => ({
      order: s.stop_order,
      name: s.generator_name,
      detail: `${s.quantity_tonnes} t`,
      icon: MapPin,
      isFinal: false,
      // Carbon impact is calculated per waste_record + facility pair - link
      // using this stop's first waste record (Route → Carbon integration, Phase 9).
      carbonLink: `/carbon?wasteId=${s.waste_record_ids[0]}&facilityId=${route.facility_id}`,
    })),
    {
      order: route.stops.length + 1,
      name: route.facility_name,
      detail: `${route.total_waste_tonnes} t total delivered`,
      icon: Factory,
      isFinal: true,
      carbonLink: null,
    },
  ];

  return (
    <div className="space-y-0">
      {items.map((item, i) => {
        const Icon = item.icon;
        const isLast = i === items.length - 1;
        return (
          <div key={`${item.order}-${item.name}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  item.isFinal ? "bg-primary text-primary-foreground" : "bg-primary-light text-primary"
                }`}
              >
                {String(item.order).padStart(2, "0")}
              </div>
              {!isLast && <div className="my-1 h-8 w-px bg-border" />}
            </div>
            <div className="flex flex-1 items-start justify-between gap-2 pb-6">
              <div>
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="font-medium text-foreground">{item.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              {item.carbonLink && (
                <Button asChild variant="ghost" size="sm" className="h-7 shrink-0 text-xs">
                  <Link href={item.carbonLink}>
                    <Leaf className="h-3 w-3" />
                    Carbon Impact
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
