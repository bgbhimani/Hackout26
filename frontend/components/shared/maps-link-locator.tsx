"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, resolveMapsLink } from "@/lib/api";
import { isShortGoogleMapsLink, looksLikeMapsInput, parseGoogleMapsLink } from "@/lib/google-maps-link";

// Waits for a short pause in typing/pasting before acting, so a link that's
// still being pasted in (or a coordinate half-typed) doesn't fire a lookup
// or flash an error on every keystroke.
const AUTO_DETECT_DELAY_MS = 400;

/**
 * Lets the user paste a Google Maps link (or raw "lat, lng" text) instead of
 * hunting down coordinates themselves - coordinates are detected and filled
 * in automatically, no button to click. Fills the caller's latitude/
 * longitude fields on success; the caller keeps those fields editable
 * underneath this for manual correction/fallback.
 */
export function MapsLinkLocator({ onLocated }: { onLocated: (latitude: string, longitude: string) => void }) {
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const pasted = link.trim();
    if (!pasted || !looksLikeMapsInput(pasted)) {
      // Empty, or not maps-shaped yet (still mid-paste/mid-typing) - stay
      // quiet rather than erroring on every keystroke.
      setStatus("idle");
      setMessage(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setStatus("loading");
      setMessage(null);
      try {
        // Shortened links (maps.app.goo.gl/..., goo.gl/maps/...) only reveal
        // their coordinates after a redirect the browser can't follow
        // cross-origin - expand those server-side first.
        const target = isShortGoogleMapsLink(pasted) ? await resolveMapsLink(pasted) : pasted;
        if (cancelled) return;
        const coords = parseGoogleMapsLink(target);

        if (!coords) {
          setStatus("error");
          setMessage(
            "Couldn't find coordinates in that link. In Google Maps, drop a pin on the exact spot, tap Share, Copy link, and paste that here."
          );
          return;
        }

        onLocated(coords.latitude.toFixed(6), coords.longitude.toFixed(6));
        setStatus("success");
        setMessage(`Location detected: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Couldn't resolve that link. Try pasting the full address-bar URL instead.");
      }
    }, AUTO_DETECT_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // onLocated is a fresh function identity every render (it closes over
    // setForm) but always applies via a functional state update, so it's
    // safe to omit here - only `link` should restart this timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor="maps-link">Set Location from Google Maps</Label>
      <div className="relative">
        <Input
          id="maps-link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Paste a Google Maps link, e.g. https://maps.app.goo.gl/..."
          className="pr-9"
        />
        {status === "loading" && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Open the spot in Google Maps, tap <span className="font-medium">Share</span> and copy the link, or paste
        coordinates directly (e.g. 22.5645, 72.9289) - it fills in below automatically.
      </p>
      {message && (
        <p className={`flex items-start gap-1.5 text-xs ${status === "error" ? "text-destructive" : "text-primary"}`}>
          {status === "error" ? (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          {message}
        </p>
      )}
    </div>
  );
}
