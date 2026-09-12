"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Inbox, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError } from "@/lib/api";
import type { PendingMatchOut } from "@/types";

const WASTE_TYPE_LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
};

/** A Facility Operator's incoming-requests inbox: every RECOMMENDED match a
 * Waste Generator's Smart Matching search produced for a facility this
 * operator runs, with a real Accept/Reject action - not a static list. This
 * is the actual confirmation step: nothing becomes a route until it's
 * accepted here (route_service.optimize_route re-validates this server-side,
 * so this page can't be bypassed by calling the API directly either). */
export default function PendingMatchesPage() {
  const [matches, setMatches] = useState<PendingMatchOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    apiFetch<PendingMatchOut[]>("/api/matching/pending")
      .then(setMatches)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load pending requests"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(matchId: string, action: "accept" | "reject") {
    setActingOn(matchId);
    setError(null);
    try {
      await apiFetch(`/api/matching/${matchId}/${action}`, { method: "POST" });
      // Remove it optimistically rather than refetching - it's no longer
      // RECOMMENDED either way, so it can't still belong in this list.
      setMatches((prev) => (prev ? prev.filter((m) => m.id !== matchId) : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${action} match`);
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Pending Match Requests</h1>
        <p className="text-sm text-muted-foreground">
          Waste generators have requested to send you these loads. Accepting reserves the waste for pickup and
          makes it available on the Routes page; rejecting leaves it free for another facility to match.
        </p>
      </div>

      {error && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {matches === null ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px]" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Inbox}
              title="No pending requests"
              description="When a waste generator finds your facility through Smart Matching, their request will appear here for you to accept or reject."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => (
            <Card key={m.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{m.generator_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {m.quantity_tonnes} t of {WASTE_TYPE_LABEL[m.waste_type] ?? m.waste_type} ·{" "}
                      {m.distance_km} km away
                    </p>
                  </div>
                  <Badge className="shrink-0 text-sm">{m.compatibility_score}% match</Badge>
                </div>

                <div className="space-y-1 border-t border-border pt-3">
                  {m.reasons.map((reason) => (
                    <p key={reason} className="text-sm text-foreground">
                      {reason}
                    </p>
                  ))}
                </div>

                <div className="flex gap-2 border-t border-border pt-3">
                  <Button
                    size="sm"
                    disabled={actingOn === m.id}
                    onClick={() => act(m.id, "accept")}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actingOn === m.id}
                    onClick={() => act(m.id, "reject")}
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
