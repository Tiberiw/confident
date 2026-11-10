import { useCallback, useEffect, useRef, useState } from "react";

export interface LoadState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
  setData: (update: (prev: T | undefined) => T | undefined) => void;
}

/** Runs an async loader on mount and whenever `deps` change; ignores results of stale runs. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): LoadState<T> {
  const [data, setDataState] = useState<T>();
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    loadRef.current().then(
      (v) => current && (setDataState(v), setLoading(false)),
      (e) => current && (setError(e), setLoading(false)),
    );
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((u: (prev: T | undefined) => T | undefined) => setDataState(u), []);
  return { data, error, loading, reload, setData };
}
