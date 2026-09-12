"use client";

import { useState } from "react";
import { Ban, Check, ChevronDown, ChevronUp, Clock, Repeat2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OfferFormDialog, type OfferFormValues } from "@/components/matching/offer-form-dialog";
import { NegotiationThread } from "@/components/matching/negotiation-thread";
import { apiFetch, ApiError } from "@/lib/api";
import type { MatchStatus, PendingMatchOut } from "@/types";

const WASTE_TYPE_LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
};

const FACILITY_TYPE_LABEL: Record<string, string> = {
  BIOCHAR: "Biochar",
  BIOGAS: "Biogas",
  BIOMASS_CONVERSION: "Biomass Conversion",
};

const STATUS_META: Record<MatchStatus, { label: string; variant: "default" | "accent" | "destructive" | "outline" }> = {
  REQUESTED: { label: "Awaiting response", variant: "accent" },
  COUNTERED: { label: "Counter-offer on the table", variant: "accent" },
  ACCEPTED: { label: "Accepted", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  WITHDRAWN: { label: "Withdrawn", variant: "outline" },
};

/**
 * One negotiation, rendered the same way for both sides of it - a Facility
 * Operator's Requests inbox and a Waste Generator's My Requests page. Only
 * the `viewer` prop (which side the current user is) changes what's shown:
 * whose name is the headline, whose turn it is, and which actions apply.
 */
export function NegotiationCard({
  match,
  viewer,
  onActionComplete,
}: {
  match: PendingMatchOut;
  viewer: "FACILITY" | "GENERATOR";
  /** Called after accept/reject/counter/withdraw succeeds - the parent
   * refetches its list rather than this card trying to reconcile the
   * differently-shaped MatchOut those endpoints return. */
  onActionComplete: () => void;
}) {
  const [counterOpen, setCounterOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [acting, setActing] = useState<"accept" | "reject" | "withdraw" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const otherParty = viewer === "FACILITY" ? "generator" : "facility";
  const headline = viewer === "FACILITY" ? match.generator_name : match.facility_name;
  const subline =
    viewer === "FACILITY"
      ? `${match.quantity_tonnes} t of ${WASTE_TYPE_LABEL[match.waste_type] ?? match.waste_type} · ${match.distance_km} km away`
      : `${FACILITY_TYPE_LABEL[match.facility_type] ?? match.facility_type} · ${match.quantity_tonnes} t of ${
          WASTE_TYPE_LABEL[match.waste_type] ?? match.waste_type
        } · ${match.distance_km} km away`;

  const statusMeta = STATUS_META[match.status];
  const lastOfferByViewer =
    (match.last_offer_by === "GENERATOR" && viewer === "GENERATOR") ||
    (match.last_offer_by === "FACILITY" && viewer === "FACILITY");
  const hasOfferTerms = match.offer_price != null || match.offer_pickup_date || match.offer_note;

  async function act(action: "accept" | "reject" | "withdraw") {
    setActing(action);
    setError(null);
    try {
      await apiFetch(`/api/matching/${match.id}/${action}`, { method: "POST" });
      onActionComplete();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${action}`);
    } finally {
      setActing(null);
    }
  }

  async function submitCounter(values: OfferFormValues) {
    await apiFetch(`/api/matching/${match.id}/counter`, { method: "POST", body: JSON.stringify(values) });
    onActionComplete();
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">{headline}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{subline}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge className="text-sm">{match.compatibility_score}% match</Badge>
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </div>
        </div>

        {hasOfferTerms && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {lastOfferByViewer ? "Your current offer" : `${otherParty === "generator" ? "Generator's" : "Facility's"} current offer`}
              {match.offer_round > 1 && ` (round ${match.offer_round})`}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-foreground">
              {match.offer_price != null && <span>₹{match.offer_price.toLocaleString()}</span>}
              {match.offer_pickup_date && <span>Pickup {match.offer_pickup_date}</span>}
            </div>
            {match.offer_note && <p className="mt-1 italic text-muted-foreground">&ldquo;{match.offer_note}&rdquo;</p>}
          </div>
        )}

        <div className="space-y-1 border-t border-border pt-3">
          {match.reasons.map((reason) => (
            <p key={reason} className="text-sm text-foreground">
              {reason}
            </p>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {match.can_respond ? (
            <>
              <Button size="sm" disabled={acting !== null} onClick={() => act("accept")}>
                <Check className="h-3.5 w-3.5" />
                Accept
              </Button>
              <Button size="sm" variant="outline" disabled={acting !== null} onClick={() => act("reject")}>
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
              <Button size="sm" variant="outline" disabled={acting !== null} onClick={() => setCounterOpen(true)}>
                <Repeat2 className="h-3.5 w-3.5" />
                Counter Offer
              </Button>
            </>
          ) : (
            (match.status === "REQUESTED" || match.status === "COUNTERED") && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Awaiting the {otherParty}&apos;s response
              </span>
            )
          )}

          {viewer === "GENERATOR" && (match.status === "REQUESTED" || match.status === "COUNTERED") && (
            <Button size="sm" variant="ghost" disabled={acting !== null} onClick={() => act("withdraw")} className="text-muted-foreground">
              <Ban className="h-3.5 w-3.5" />
              Withdraw
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-muted-foreground"
            onClick={() => setHistoryOpen((v) => !v)}
          >
            {historyOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            History
          </Button>
        </div>

        {historyOpen && (
          <div className="border-t border-border pt-3">
            <NegotiationThread matchId={match.id} />
          </div>
        )}
      </CardContent>

      <OfferFormDialog
        open={counterOpen}
        onOpenChange={setCounterOpen}
        resetKey={match.id}
        title="Send a counter-offer"
        description="Propose different terms - the other side can accept, reject, or counter again."
        submitLabel="Send Counter-Offer"
        initialPrice={match.offer_price != null ? String(match.offer_price) : ""}
        initialPickupDate={match.offer_pickup_date ?? ""}
        initialNote=""
        onSubmit={submitCounter}
      />
    </Card>
  );
}
