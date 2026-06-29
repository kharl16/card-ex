import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Seeds a page's search input from the `?q=` URL parameter on mount
 * (and whenever the parameter changes). Used so global search deep-links
 * actually narrow results on the destination page.
 */
export function useSearchQueryParam(setter: (v: string) => void) {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  useEffect(() => {
    if (q) setter(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
}

/**
 * Returns a debounced copy of `value` plus an `isPending` flag that is true
 * while the debounce timer is still running. Lets pages render a subtle
 * "filtering…" indicator as the user types or when `?q=` is first applied.
 */
export function useDebouncedValue<T>(value: T, delay = 200): { debounced: T; isPending: boolean } {
  const [debounced, setDebounced] = useState(value);
  const [isPending, setIsPending] = useState(false);
  useEffect(() => {
    if (debounced === value) return;
    setIsPending(true);
    const t = setTimeout(() => {
      setDebounced(value);
      setIsPending(false);
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay, debounced]);
  return { debounced, isPending };
}
