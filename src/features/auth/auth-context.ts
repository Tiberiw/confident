import { createContext } from "react";
import type { UserProfile } from "@/types/domain";

export interface AuthState {
  /** The signed-in user's profile, or null. */
  user: UserProfile | null;
  /** True until the first sign-in check (and profile load) finishes. */
  loading: boolean;
  isDemo: boolean;
  /** Signed in, but no Confident profile exists for this login. */
  profileMissing: boolean;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);
