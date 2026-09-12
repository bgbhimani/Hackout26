"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { NegotiationCard } from "@/components/matching/negotiation-card";
import { apiFetch, ApiError } from "@/lib/api";
import type { PendingMatchOut } from "@/types";

/** A Facility Operator's Requests inbox: every REQUESTED/COUNTERED match a
 * Waste Generator's Smart Matching search sent to a facility this operator
 * runs, with real Accept/Reject/Counter-Offer actions - not a static list.
 * This is the actual confirmation step: nothing becomes a route until it's
 * accepted here (route_service.optimize_route re-validates this
 * server-side, so this page can't be bypassed by calling the API directly
 * either). */
export default function RequestsPage() {
  const [matches, setMatches] = useState<PendingMatchOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    apiFetch<PendingMatchOut[]>("/api/matching/pending")
      .then(setMatches)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load requests"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Requests</h1>
        <p className="text-sm text-muted-foreground">
          Waste generators have requested to send you these loads. Accept to reserve the waste for pickup, reject to
          free it up for another facility, or counter with different price/pickup terms.
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
              title="No requests yet"
              description="When a waste generator finds your facility through Smart Matching and sends a request, it will appear here for you to accept, reject, or negotiate."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => (
            <NegotiationCard key={m.id} match={m} viewer="FACILITY" onActionComplete={load} />
          ))}
        </div>
      )}
    </div>
  );
}
