import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Saves values one at a time. While a save runs, only the newest queued value is kept,
 * so the last edit always wins and writes never overlap.
 */
export function useAutosave<T>(save: (value: T) => Promise<void>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const saveRef = useRef(save);
  saveRef.current = save;
  const running = useRef(false);
  const pending = useRef<{ value: T } | null>(null);
  const lastFailed = useRef<{ value: T } | null>(null);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (pending.current) {
      const next = pending.current;
      pending.current = null;
      if (mounted.current) setStatus("saving");
      try {
        await saveRef.current(next.value);
        lastFailed.current = null;
        if (mounted.current && !pending.current) setStatus("saved");
      } catch {
        // A newer value will retry by itself; otherwise remember this one for retry().
        if (!pending.current) {
          lastFailed.current = next;
          if (mounted.current) setStatus("error");
        }
      }
    }
    running.current = false;
  }, []);

  const queue = useCallback(
    (value: T) => {
      pending.current = { value };
      void run();
    },
    [run],
  );

  const retry = useCallback(() => {
    if (lastFailed.current) queue(lastFailed.current.value);
  }, [queue]);

  return { status, queue, retry };
}
