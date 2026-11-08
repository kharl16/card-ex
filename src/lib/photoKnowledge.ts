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
