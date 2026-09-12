"use client";

import { useCallback, useEffect, useState } from "react";
import { SendHorizontal } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { NegotiationCard } from "@/components/matching/negotiation-card";
import { apiFetch, ApiError } from "@/lib/api";
import type { PendingMatchOut } from "@/types";

/** A Waste Generator's sent-requests tracker: every request they've sent
 * from Smart Matching, across every status - respond to a facility's
 * counter-offer, withdraw one that's still pending, or just see what
 * happened to ones that were accepted/rejected. */
export default function MyRequestsPage() {
  const [matches, setMatches] = useState<PendingMatchOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    apiFetch<PendingMatchOut[]>("/api/matching/my-requests")
      .then(setMatches)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load your requests"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Requests</h1>
        <p className="text-sm text-muted-foreground">
          Every request you&apos;ve sent from Smart Matching. Respond when a facility counters your offer, withdraw one
          you no longer want, or check what happened to the rest.
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
              icon={SendHorizontal}
              title="No requests sent yet"
              description="Find a facility from the Smart Matching page and send it a request - it'll show up here so you can track its status."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => (
            <NegotiationCard key={m.id} match={m} viewer="GENERATOR" onActionComplete={load} />
          ))}
        </div>
      )}
    </div>
  );
}
