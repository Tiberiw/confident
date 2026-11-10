import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { FullPageSpinner } from "@/app/FullPageSpinner";
import { FinishSetupPage } from "./FinishSetupPage";
import { useAuth } from "./useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, profileMissing } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (profileMissing) return <FinishSetupPage />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}
