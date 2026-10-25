export const TEMPLATE_INDUSTRIES: { key: string; label: string }[] = [
  { key: "automotive", label: "Car Sales" },
  { key: "real_estate", label: "Real Estate" },
  { key: "medical", label: "Doctor" },
  { key: "dental", label: "Dentist" },
  { key: "pet_care", label: "Pet Care" },
  { key: "finance", label: "Finance" },
  { key: "fitness", label: "Fitness" },
  { key: "beauty", label: "Beauty" },
  { key: "legal", label: "Legal" },
  { key: "events", label: "Events" },
  { key: "consulting", label: "Coaching" },
];

export function industryLabel(key: string | null | undefined): string | null {
  return TEMPLATE_INDUSTRIES.find((i) => i.key === key)?.label ?? null;
}

/** Filter templates by industry key; "all" keeps everything. */
export function filterByIndustry<T extends { category?: string | null }>(list: T[], key: string): T[] {
  return key === "all" ? list : list.filter((t) => t.category === key);
}
