import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";

export type ResourceStatus = "loading" | "error" | "empty" | "ready";

interface Options {
  /** Poll on this interval (ms) after the first successful load. */
  pollMs?: number;
  /** Data counts as "empty" when this returns true (defaults to checking array length). */
  isEmpty?: (data: unknown) => boolean;
}

/**
 * Gives every backend-driven page the same loading/error/empty/ready states
 * instead of ad hoc console.error + stale UI.
 */
export function useApiResource<T>(fetcher: () => Promise<T>, deps: unknown[], options?: Options) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ResourceStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setStatus((prev) => (prev === "ready" ? prev : "loading"));
    try {
      const result = await fetcher();
      if (!mountedRef.current) return;
      setData(result);
      setError(null);
      const empty = options?.isEmpty ? options.isEmpty(result) : Array.isArray(result) && result.length === 0;
      setStatus(empty ? "empty" : "ready");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof ApiError ? err.message : "Something went wrong loading this data.");
      setStatus("error");
    }
    // A generic resource hook takes its dependency array from the caller by
    // design, so it can't be a static array literal here.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    load();

    let interval: number | undefined;
    if (options?.pollMs) {
      interval = window.setInterval(() => load(true), options.pollMs);
    }

    return () => {
      mountedRef.current = false;
      if (interval) window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { data, status, error, reload: () => load() };
}
