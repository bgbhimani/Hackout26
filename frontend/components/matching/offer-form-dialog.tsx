"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";

/** Local (not UTC) today, as the "YYYY-MM-DD" a date input expects - a
 * pickup date in the past isn't a real option, so it's excluded at the
 * picker level rather than merely discouraged after the fact. */
function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export interface OfferFormValues {
  offer_price: number | null;
  offer_pickup_date: string | null;
  note: string | null;
}

/**
 * The one form both "Send Request" (a fresh ask) and "Counter Offer"
 * (proposing different terms on an existing match) actually need - price,
 * pickup date, and a note are all optional either way. `resetKey` (e.g. a
 * facility or match id) is what re-seeds the fields when the dialog reopens
 * for a different target rather than every parent re-render clobbering
 * whatever the user is mid-typing.
 */
export function OfferFormDialog({
  open,
  onOpenChange,
  resetKey,
  title,
  description,
  submitLabel,
  initialPrice = "",
  initialPickupDate = "",
  initialNote = "",
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetKey: string;
  title: string;
  description: string;
  submitLabel: string;
  initialPrice?: string;
  initialPickupDate?: string;
  initialNote?: string;
  onSubmit: (values: OfferFormValues) => Promise<void>;
}) {
  const [price, setPrice] = useState(initialPrice);
  const [pickupDate, setPickupDate] = useState(initialPickupDate);
  const [note, setNote] = useState(initialNote);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPrice(initialPrice);
      setPickupDate(initialPickupDate);
      setNote(initialNote);
      setError(null);
    }
    // Only re-seed when the dialog opens or its target changes - not on
    // every parent re-render (initialPrice/etc. are fresh strings each
    // render, which would otherwise wipe out what the user is typing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resetKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        offer_price: price.trim() ? Number(price) : null,
        offer_pickup_date: pickupDate || null,
        note: note.trim() || null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="offer-price">Offered Price (₹) - optional</Label>
            <Input
              id="offer-price"
              type="number"
              min={0}
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 15000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-pickup">Proposed Pickup Date - optional</Label>
            <Input
              id="offer-pickup"
              type="date"
              min={todayIso()}
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-note">Note - optional</Label>
            <Input
              id="offer-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any terms or context for the other side"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
