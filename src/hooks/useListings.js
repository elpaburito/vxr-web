import { useEffect, useState } from "react";
import { fetchListings } from "../lib/listingsService";
import { withTimeout } from "../lib/supabase";

/**
 * Hook that loads listings from Supabase.
 * options: { limit, orderBy, ascending } — reloads when they change.
 *
 * Robustness contract: `loading` is guaranteed to flip to `false` whether the
 * request resolves, rejects, or times out. Errors are reported via `error`,
 * never swallowed into an infinite spinner.
 */
export function useListings(options = {}) {
  const { limit, orderBy = "created_at", ascending = false } = options;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const result = await withTimeout(
          fetchListings({ limit, orderBy, ascending }),
          15000,
          "Loading listings"
        );
        if (!mounted) return;
        setListings(result.data ?? []);
        setError(result.error ?? null);
      } catch (err) {
        console.error("[useListings] fetch failed:", err);
        if (!mounted) return;
        setListings([]);
        setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [limit, orderBy, ascending]);

  return { listings, loading, error };
}
