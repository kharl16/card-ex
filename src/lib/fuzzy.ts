// Lightweight fuzzy matching utilities (no deps).
// Returns a score in [0, 1] where 1 is a perfect match. 0 means no match.

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const prev = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= bl; j++) {
      const tmp = prev[j];
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, prevDiag + cost);
      prevDiag = tmp;
    }
  }
  return prev[bl];
}

/** Token-aware fuzzy score with substring + Levenshtein tolerance. */
export function fuzzyScore(query: string, target: string): number {
  const q = norm(query);
  const t = norm(target);
  if (!q || !t) return 0;
  if (t.includes(q)) return 1;

  const qTokens = q.split(" ").filter(Boolean);
  const tTokens = t.split(" ").filter(Boolean);
  if (!qTokens.length || !tTokens.length) return 0;

  let total = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const tt of tTokens) {
      if (tt.includes(qt) || qt.includes(tt)) {
        best = Math.max(best, 0.9);
        continue;
      }
      const maxLen = Math.max(qt.length, tt.length);
      if (maxLen < 3) continue;
      const allowed = qt.length <= 4 ? 1 : qt.length <= 7 ? 2 : 3;
      const d = levenshtein(qt, tt);
      if (d <= allowed) {
        best = Math.max(best, 1 - d / maxLen);
      }
    }
    total += best;
  }
  return total / qTokens.length;
}

export function fuzzyMatch(query: string, target: string, threshold = 0.55): boolean {
  return fuzzyScore(query, target) >= threshold;
}

/** Match against multiple candidate fields; returns the best score. */
export function fuzzyScoreAny(query: string, targets: Array<string | null | undefined>): number {
  let best = 0;
  for (const t of targets) {
    if (!t) continue;
    const s = fuzzyScore(query, t);
    if (s > best) best = s;
    if (best === 1) break;
  }
  return best;
}
