export type PhotoCategory = "packages" | "products" | "brochures" | "testimonies";

export const PHOTO_CATEGORY_TABLES: Record<PhotoCategory, string> = {
  packages: "global_package_images",
  products: "global_product_images",
  brochures: "global_brochure_images",
  testimonies: "global_testimony_images",
};

export interface DraftQA {
  key: string;
  imageId: string;
  question: string;
  answer: string;
  selected: boolean;
  duplicate: boolean;
  /** Numbers key the admin explicitly confirmed; stale once the flagged numbers change. */
  confirmedFor?: string | null;
}

/** Split ids into scan batches so each request stays well inside time limits. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error("size must be >= 1");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Turn extracted pairs into reviewable drafts. Questions already in the
 * repository (or repeated in this scan) are flagged and left unselected,
 * so saving never creates duplicate entries by default.
 */
export function buildDrafts(
  photos: { image_id: string; qa: { question: string; answer: string }[] }[],
  existingQuestions: string[],
  seen: Set<string> = new Set(existingQuestions.map(normalizeQuestion)),
): DraftQA[] {
  const drafts: DraftQA[] = [];
  for (const photo of photos) {
    photo.qa.forEach((qa, i) => {
      const norm = normalizeQuestion(qa.question);
      if (!norm || !qa.answer.trim()) return;
      const duplicate = seen.has(norm);
      seen.add(norm);
      drafts.push({
        key: `${photo.image_id}-${i}-${norm.slice(0, 24)}`,
        imageId: photo.image_id,
        question: qa.question.trim(),
        answer: qa.answer.trim(),
        selected: !duplicate,
        duplicate,
      });
    });
  }
  return drafts;
}

/** What the scanner keeps for each photo so admins can verify drafts against it. */
export interface PhotoSource {
  imageId: string;
  url: string;
  url2: string | null;
  caption: string | null;
  srp: string | null;
  extractedText: string;
}

function numberTokens(text: string): string[] {
  const matches = text.match(/\d(?:[\d,]*\d)?(?:\.\d+)?/g) ?? [];
  return matches
    .map((m) => m.replace(/,/g, "").replace(/\.0+$/, ""))
    .filter((m) => m.length > 0);
}

/**
 * Numbers (prices, quantities, PV) mentioned in an answer that do not appear
 * anywhere in the photo's extracted text or listed price. These are the
 * figures most worth double-checking before saving.
 */
export function findUnverifiedNumbers(answer: string, sourceText: string): string[] {
  const known = new Set(numberTokens(sourceText));
  const out: string[] = [];
  for (const raw of answer.match(/\d(?:[\d,]*\d)?(?:\.\d+)?/g) ?? []) {
    const norm = raw.replace(/,/g, "").replace(/\.0+$/, "");
    if (!known.has(norm) && !out.includes(raw)) out.push(raw);
  }
  return out;
}

/** All source text a number may legitimately come from. */
export function sourceCheckText(src: { extractedText?: string | null; srp?: string | null; caption?: string | null }): string {
  return [src.extractedText, src.srp, src.caption].filter(Boolean).join("\n");
}

export function numbersKey(numbers: string[]): string {
  return numbers.join("|");
}

/** A draft needs no confirmation when nothing is flagged; otherwise only an explicit confirmation of these exact numbers counts. */
export function isDraftConfirmed(draft: Pick<DraftQA, "confirmedFor">, unverified: string[]): boolean {
  return unverified.length === 0 || draft.confirmedFor === numbersKey(unverified);
}

export interface RepositoryRow {
  question: string;
  answer: string;
  card_id: null;
  sort_order: number;
  is_active: boolean;
  unverified_numbers: string[];
  numbers_confirmed_at: string | null;
  source_category: PhotoCategory;
  source_image_id: string;
  source_image_url: string;
  source_image_url_2: string | null;
  source_caption: string | null;
  source_srp: string | null;
  source_extracted_text: string;
}

/**
 * Build the repository row for a reviewed draft. The source photo and its
 * extracted text travel with the answer; flagged answers the admin has not
 * confirmed are saved switched off so no chatbot can use them.
 */
export function toRepositoryRow(
  draft: DraftQA,
  source: PhotoSource,
  category: PhotoCategory,
  sortOrder: number,
  now: string = new Date().toISOString(),
): RepositoryRow {
  const answer = draft.answer.trim();
  const unverified = findUnverifiedNumbers(answer, sourceCheckText(source));
  const confirmed = unverified.length > 0 && isDraftConfirmed(draft, unverified);
  return {
    question: draft.question.trim(),
    answer,
    card_id: null,
    sort_order: sortOrder,
    is_active: unverified.length === 0 || confirmed,
    unverified_numbers: unverified,
    numbers_confirmed_at: confirmed ? now : null,
    source_category: category,
    source_image_id: source.imageId,
    source_image_url: source.url,
    source_image_url_2: source.url2,
    source_caption: source.caption,
    source_srp: source.srp,
    source_extracted_text: source.extractedText,
  };
}

/** Saved answers whose flagged numbers were never confirmed stay out of the chatbot. */
export function isOnHold(row: { unverified_numbers?: string[] | null; numbers_confirmed_at?: string | null }): boolean {
  return (row.unverified_numbers?.length ?? 0) > 0 && !row.numbers_confirmed_at;
}

export type RepositoryFilter = "all" | "held" | "unsourced";

export function hasPhotoSource(row: { source_image_url?: string | null; source_extracted_text?: string | null }): boolean {
  return Boolean(row.source_image_url || row.source_extracted_text);
}

/** Narrow the repository list to the answers an admin wants to review. */
export function filterRepository<T extends Parameters<typeof isOnHold>[0] & Parameters<typeof hasPhotoSource>[0]>(
  rows: T[],
  filter: RepositoryFilter,
): T[] {
  if (filter === "held") return rows.filter(isOnHold);
  if (filter === "unsourced") return rows.filter((r) => !hasPhotoSource(r));
  return rows;
}

const STOP_WORDS = new Set(
  "the a an and or of to in on for with is are was were be by at as it its this that what how much does do you your our from can i my me we has have".split(
    " ",
  ),
);

function words(text: string): Set<string> {
  return new Set(
    normalizeQuestion(text)
      .split(" ")
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

export interface MatchablePhoto {
  id: string;
  caption: string | null;
  srp?: string | null;
}

/**
 * Order library photos by how many distinctive words they share with an
 * answer, using the caption, listed price and any text already read from the
 * photo. Ties keep library order. Only a suggestion — the admin picks.
 */
export function rankPhotoMatches<P extends MatchablePhoto>(
  qa: { question: string; answer: string },
  photos: P[],
  knownText: Record<string, string> = {},
): { photo: P; score: number }[] {
  const target = words(`${qa.question} ${qa.answer}`);
  return photos
    .map((photo, index) => {
      const captionWords = words(photo.caption ?? "");
      const textWords = words(`${photo.srp ?? ""} ${knownText[photo.id] ?? ""}`);
      let score = 0;
      target.forEach((w) => {
        if (captionWords.has(w)) score += 3;
        else if (textWords.has(w)) score += 1;
      });
      return { photo, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ photo, score }) => ({ photo, score }));
}

export interface SourcePatch {
  source_category: PhotoCategory;
  source_image_id: string;
  source_image_url: string;
  source_image_url_2: string | null;
  source_caption: string | null;
  source_srp: string | null;
  source_extracted_text: string;
  unverified_numbers: string[];
  numbers_confirmed_at: string | null;
  is_active: boolean;
}

/**
 * Attach a reviewed source photo to an existing answer. The answer is checked
 * against the new photo's text; a confirmation for the old photo never carries
 * over, so unconfirmed flagged numbers put the answer on hold.
 */
export function buildSourcePatch(
  row: { answer: string; is_active: boolean; unverified_numbers?: string[] | null; numbers_confirmed_at?: string | null },
  source: PhotoSource,
  category: PhotoCategory,
  confirmedFor: string | null,
  now: string = new Date().toISOString(),
): SourcePatch {
  const unverified = findUnverifiedNumbers(row.answer, sourceCheckText(source));
  const confirmed = unverified.length > 0 && confirmedFor === numbersKey(unverified);
  const held = unverified.length > 0 && !confirmed;
  return {
    source_category: category,
    source_image_id: source.imageId,
    source_image_url: source.url,
    source_image_url_2: source.url2,
    source_caption: source.caption,
    source_srp: source.srp,
    source_extracted_text: source.extractedText,
    unverified_numbers: unverified,
    numbers_confirmed_at: confirmed ? now : null,
    // Answers released from hold go back to chatbots; others keep the admin's on/off choice.
    is_active: held ? false : isOnHold(row) ? true : row.is_active,
  };
}
