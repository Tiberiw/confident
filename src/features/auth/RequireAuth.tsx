import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { FullPageSpinner } from "@/app/FullPageSpinner";
import { Wordmark } from "@/app/Wordmark";
import { Button } from "@/ui";
import { signOutUser } from "./auth.api";
import { useAuth } from "./useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, profileMissing } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (profileMissing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <Wordmark className="text-display" />
        <h1 className="mt-4 text-title font-semibold">This login has no clinic yet</h1>
        <p className="max-w-sm text-muted">Sign out, then create a clinic or sign in with another account.</p>
        <Button variant="secondary" className="mt-3" onClick={() => void signOutUser()}>
          Sign out
        </Button>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}
