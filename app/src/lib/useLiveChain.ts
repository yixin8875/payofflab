import { useCallback, useEffect, useRef, useState } from "react";
import { cachedChain, loadLiveChain, type LiveChain } from "./live";

type LiveState = {
  chain?: LiveChain;
  loading: boolean;
  error?: string;
};

/**
 * Loads the delayed CBOE chain for a symbol once and keeps it cached for the
 * rest of the session. Falls back to whatever the caller has offline.
 */
export function useLiveChain(symbol: string) {
  const key = symbol.toUpperCase();
  const [state, setState] = useState<LiveState>(() => {
    const hit = cachedChain(key);
    return { chain: hit, loading: !hit };
  });
  const request = useRef(0);

  const run = useCallback(
    (force: boolean) => {
      if (!key) {
        setState({ loading: false });
        return;
      }
      const id = ++request.current;
      if (!force) {
        const hit = cachedChain(key);
        if (hit) {
          setState({ chain: hit, loading: false });
          return;
        }
      }
      setState((prev) => ({ chain: prev.chain, loading: true, error: undefined }));
      loadLiveChain(key, force)
        .then((chain) => {
          if (request.current !== id) return;
          setState({ chain, loading: false });
        })
        .catch((error: unknown) => {
          if (request.current !== id) return;
          setState((prev) => ({
            chain: prev.chain,
            loading: false,
            error: error instanceof Error ? error.message : "在线行情连接失败",
          }));
        });
    },
    [key],
  );

  useEffect(() => {
    run(false);
  }, [run]);

  // Never expose a chain fetched for the previously selected symbol.
  const active = state.chain?.symbol === key ? state.chain : undefined;
  return {
    chain: active,
    loading: state.loading || (!active && !state.error),
    error: state.error,
    reload: () => run(true),
  };
}
