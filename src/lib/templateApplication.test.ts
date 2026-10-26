import { describe, it, expect, vi } from "vitest";
import templates from "./__fixtures__/industryTemplates.json";
import { buildTemplateDesignUpdate } from "./templateApplication";
import { buildCardInsertFromSnapshot, type CardSnapshot } from "./cardSnapshot";
import { buildShowcaseCategories } from "./showcase";
import { mergeCarouselSettings } from "./carouselTypes";
import { TEMPLATE_INDUSTRIES, filterByIndustry } from "./templateIndustries";
import { createCardFromOnboarding } from "./createCardFromOnboarding";
import type { CardTemplate } from "@/hooks/useTemplates";
import type { User } from "@supabase/supabase-js";

const { inserts, linkInserts } = vi.hoisted(() => ({ inserts: [] as Record<string, unknown>[], linkInserts: [] as unknown[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => ({ insert: (payload: Record<string, unknown>) => {
    if (table === "cards") {
      inserts.push(payload);
      return { select: () => ({ single: async () => ({ data: { ...payload, id: "test-card" }, error: null }) }) };
    }
    linkInserts.push(payload);
    return Promise.resolve({ error: null });
  } }),
} }));

const identity = {
  prefix: "Dr.", first_name: "Ana", middle_name: "Reyes", last_name: "Santos", suffix: "III",
  full_name: "Dr. Ana Reyes Santos III", owner_name: "Ana Santos", title: "My own title",
  company: "My clinic", bio: "My personal bio", avatar_url: "/my-photo.jpg",
  phone: "09170000000", email: "ana@example.test", website: "https://example.test", location: "Manila",
  social_links: [{ kind: "facebook", value: "https://facebook.com/ana" }],
  slug: "ana", custom_slug: "ana-santos", is_paid: true, is_published: true,
  user_id: "owner", owner_referral_code: "CEX-ABC123", disc_result: { type: "D" },
};

describe("all 11 industry template paths", () => {
  it("matches the required industry inventory exactly", () => {
    expect(TEMPLATE_INDUSTRIES.map(i => i.key).sort()).toEqual([
      "automotive", "real_estate", "medical", "dental", "pet_care", "finance", "fitness", "beauty", "legal", "events", "consulting",
    ].sort());
    expect(templates.map(t => t.category).sort()).toEqual(TEMPLATE_INDUSTRIES.map(i => i.key).sort());
  });
  for (const template of templates) {
    it(`${template.category}: selection and onboarding use the member's contact details`, async () => {
      expect(filterByIndustry(templates, template.category)).toEqual([template]);
      await createCardFromOnboarding({
        user: { id: "12345678-owner" } as User, firstName: "Ana", lastName: "Santos",
        phone: "09170000000", email: "ana@example.test", facebookUrl: "https://facebook.com/ana",
        isIamMember: true, iamId: "12345678", selectedTemplate: template as unknown as CardTemplate,
      });
      const card = inserts.at(-1);
      expect(card).toMatchObject({ first_name: "Ana", last_name: "Santos", full_name: "Ana Santos", phone: "09170000000", email: "ana@example.test", is_published: false });
      const settings = mergeCarouselSettings(card?.carousel_settings as CardSnapshot["carousel_settings"]);
      expect(settings.products.title).toBe(template.layout_data.carousel_settings.products.title);
      expect(settings.products.cta.label).toBe(template.layout_data.carousel_settings.products.cta.label);
      expect(linkInserts.at(-1)).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "facebook", value: "https://facebook.com/ana" }), expect.objectContaining({ kind: "messenger", value: "https://m.me/ana" })]));
    });
    it(`${template.category}: switching preserves personal fields and applies showcase settings`, () => {
      const snapshot = template.layout_data as unknown as CardSnapshot;
      const patch = buildTemplateDesignUpdate(snapshot);
      const next = { ...identity, ...patch };
      for (const key of Object.keys(identity)) expect(next[key as keyof typeof next]).toEqual(identity[key as keyof typeof identity]);
      expect(patch.showcase_display_mode).toBe("immersive");
      expect(patch.brochure_images).toEqual([]);
      const settings = mergeCarouselSettings(snapshot.carousel_settings);
      const categories = buildShowcaseCategories(next, settings);
      for (const key of ["products", "packages", "testimonies"] as const) {
        expect(categories.find(c => c.key === key)?.title).toBe(snapshot.carousel_settings?.[key]?.title);
        expect(settings[key].cta.label).toBe(snapshot.carousel_settings?.[key]?.cta.label);
      }
      expect(buildCardInsertFromSnapshot(snapshot, "owner", "new").showcase_display_mode).toBe("immersive");
    });
  }
  it("applies classic mode and brochure photos when present", () => {
    const snapshot = { ...templates[0].layout_data, showcase_display_mode: "carousel", brochure_images: [{ url: "/brochure.jpg" }] } as unknown as CardSnapshot;
    expect(buildTemplateDesignUpdate(snapshot)).toMatchObject({ showcase_display_mode: "carousel", brochure_images: [{ url: "/brochure.jpg" }] });
  });
});