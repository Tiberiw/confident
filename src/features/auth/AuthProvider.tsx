import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { UserProfile } from "@/types/domain";
import { AuthContext, type AuthState } from "./auth-context";
import { getUserProfile, subscribeToAuth } from "./auth.api";

const RETRIES = 5;
const RETRY_DELAY_MS = 500;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The profile doc is written right after sign-up, so it may not exist yet: retry a few times. */
async function loadProfile(uid: string, isCurrent: () => boolean): Promise<UserProfile | null> {
  for (let attempt = 0; attempt < RETRIES && isCurrent(); attempt++) {
    try {
      const p = await getUserProfile(uid);
      if (p) return p;
    } catch {
      // Permission errors right after sign-up are expected; try again.
    }
    if (attempt < RETRIES - 1) await wait(RETRY_DELAY_MS);
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Each load gets a number; results from older loads are ignored.
  const loadId = useRef(0);
  const uidRef = useRef<string | null>(null);

  const load = useCallback(async (nextUid: string | null) => {
    const id = ++loadId.current;
    uidRef.current = nextUid;
    setUid(nextUid);
    if (!nextUid) {
      setUser(null);
      setLoading(false);
      return;
    }
    const profile = await loadProfile(nextUid, () => id === loadId.current);
    if (id !== loadId.current) return;
    setUser(profile);
    setLoading(false);
  }, []);

  useEffect(() => subscribeToAuth((next) => void load(next)), [load]);

  const refreshProfile = useCallback(() => load(uidRef.current), [load]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isDemo: user?.role === "demo",
      profileMissing: !loading && uid !== null && user === null,
      refreshProfile,
    }),
    [user, loading, uid, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
