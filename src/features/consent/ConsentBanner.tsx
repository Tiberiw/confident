import { useState } from "react";
import { initAnalytics } from "@/lib/firebase";
import { Button } from "@/ui";
import { getConsent, setConsent, type Consent } from "./consent";

export function ConsentBanner() {
  const [choice, setChoice] = useState<Consent | null>(getConsent);
  if (choice) return null;

  const decide = (v: Consent) => {
    setConsent(v);
    setChoice(v);
    if (v === "accepted") void initAnalytics();
  };

  return (
    <div role="region" aria-label="Analytics consent" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <p className="min-w-0 flex-1 text-sm text-ink">
          We use analytics to understand how Confident is used. No patient data is ever sent.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => decide("declined")}>
            Decline
          </Button>
          <Button size="sm" onClick={() => decide("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
