"use client";

import { useEffect, useState } from "react";

import { apiFetch, ApiError } from "@/lib/api";
import type { MatchOfferOut, OfferParty } from "@/types";

function actorLabel(party: OfferParty): string {
  return party === "GENERATOR" ? "Generator" : "Facility";
}

const ACTION_VERB: Record<MatchOfferOut["action"], string> = {
  REQUEST: "sent a request",
  COUNTER: "proposed a counter-offer",
  ACCEPT: "accepted",
  REJECT: "rejected",
  WITHDRAW: "withdrew the request",
};

/** The full back-and-forth behind one match, fetched lazily (only once the
 * card expands it) since most cards are never opened. */
export function NegotiationThread({ matchId }: { matchId: string }) {
  const [offers, setOffers] = useState<MatchOfferOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<MatchOfferOut[]>(`/api/matching/${matchId}/offers`)
      .then((data) => !cancelled && setOffers(data))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Failed to load history"));
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (error) return <p className="text-xs text-destructive">{error}</p>;
  if (!offers) return <p className="text-xs text-muted-foreground">Loading history...</p>;

  return (
    <ol className="space-y-2.5">
      {offers.map((o) => (
        <li key={o.id} className="border-l-2 border-border pl-3">
          <p className="text-xs font-medium text-foreground">
            {actorLabel(o.offered_by)} {ACTION_VERB[o.action]}
          </p>
          {(o.offer_price != null || o.offer_pickup_date) && (
            <p className="text-xs text-muted-foreground">
              {o.offer_price != null && `₹${o.offer_price.toLocaleString()}`}
              {o.offer_price != null && o.offer_pickup_date && " · "}
              {o.offer_pickup_date && `Pickup ${o.offer_pickup_date}`}
            </p>
          )}
          {o.note && <p className="text-xs italic text-muted-foreground">&ldquo;{o.note}&rdquo;</p>}
          <p className="text-[10px] text-muted-foreground/70">{new Date(o.created_at).toLocaleString()}</p>
        </li>
      ))}
    </ol>
  );
}
