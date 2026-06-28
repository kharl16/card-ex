import { useEffect } from "react";
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
