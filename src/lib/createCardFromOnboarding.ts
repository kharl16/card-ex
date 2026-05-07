import { supabase } from "@/integrations/supabase/client";
import { buildCardInsertFromSnapshot, buildCardLinksInsertFromSnapshot, type CardSnapshot } from "@/lib/cardSnapshot";
import type { CardTemplate } from "@/hooks/useTemplates";
import type { User } from "@supabase/supabase-js";

const DEFAULT_THEME = {
  name: "Black&Gold",
  text: "#F8F8F8",
  primary: "#D4AF37",
  accent: "#FACC15",
  background: "#0B0B0C",
  buttonColor: "#D4AF37",
  baseMode: "dark",
};

export interface CreateCardInput {
  user: User;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  facebookUrl: string;
  isIamMember: boolean;
  iamId?: string;
  selectedTemplate: CardTemplate | null;
  /** When true, also updates the profiles row with onboarding info. */
  updateProfile?: boolean;
}

export async function createCardFromOnboarding(input: CreateCardInput): Promise<{ cardId: string }> {
  const { user, firstName, lastName, phone, email, facebookUrl, isIamMember, iamId, selectedTemplate, updateProfile } = input;

  const fullName = `${firstName} ${lastName}`.trim();
  const slug = `${user.id.slice(0, 8)}-${Date.now()}`;

  const productImages: any[] = [];

  const iamId8 = isIamMember && iamId ? iamId : null;
  const substituteIamId = (url: string | undefined | null): string | undefined | null => {
    if (!url || !iamId8) return url;
    return url
      .replace(/(idno=)\d{6,}/gi, `$1${iamId8}`)
      .replace(/(\?|&)(ref|referrer|referral|iamid|iam_id)=\d{6,}/gi, `$1$2=${iamId8}`);
  };
  const substituteInItems = <T extends { link?: string | null; url?: string | null }>(items: T[] | undefined | null): T[] | undefined | null => {
    if (!Array.isArray(items)) return items;
    return items.map((it) => ({ ...it, link: substituteIamId((it as any).link) ?? (it as any).link })) as T[];
  };
  const substituteInCarouselSettings = (cs: any): any => {
    if (!cs || typeof cs !== "object") return cs;
    const next = { ...cs };
    const section = next.products;
    if (section && typeof section === "object" && section.cta) {
      next.products = {
        ...section,
        cta: { ...section.cta, href: substituteIamId(section.cta.href) ?? section.cta.href },
      };
    }
    return next;
  };

  let insertData: Record<string, any>;

  if (selectedTemplate) {
    const snapshot = selectedTemplate.layout_data as CardSnapshot;
    insertData = buildCardInsertFromSnapshot(snapshot, user.id, slug, {
      full_name: fullName,
      owner_name: fullName,
      is_published: false,
    });
    insertData.theme = { ...DEFAULT_THEME, ...(snapshot.theme || {}) };

    insertData.carousel_settings = substituteInCarouselSettings(insertData.carousel_settings);
    insertData.product_images = substituteInItems(insertData.product_images);

    insertData.full_name = fullName;
    insertData.owner_name = fullName;
    insertData.first_name = firstName;
    insertData.last_name = lastName;
    insertData.middle_name = null;
    insertData.prefix = null;
    insertData.suffix = null;
    insertData.phone = phone;
    insertData.email = email;

    const existingSocial = Array.isArray(insertData.social_links) ? insertData.social_links : [];
    const filteredSocial = existingSocial.filter((s: any) => (s?.kind || "").toLowerCase() !== "facebook");
    insertData.social_links = [
      ...filteredSocial,
      { kind: "facebook", label: "Facebook", url: facebookUrl, value: facebookUrl },
    ];

    if (!snapshot.product_images || snapshot.product_images.length === 0) {
      insertData.product_images = productImages;
    }
  } else {
    insertData = {
      user_id: user.id,
      slug,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      owner_name: fullName,
      phone,
      email,
      theme: DEFAULT_THEME,
      carousel_enabled: true,
      card_type: "publishable",
      is_published: false,
      is_paid: false,
      product_images: productImages,
    };
  }

  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .insert(insertData as any)
    .select()
    .single();

  if (cardErr) throw cardErr;

  let facebookHandled = false;
  if (selectedTemplate) {
    const snapshot = selectedTemplate.layout_data as CardSnapshot;
    if (snapshot.card_links && snapshot.card_links.length > 0) {
      const linkInserts = buildCardLinksInsertFromSnapshot(snapshot, card.id).map((link) => {
        const k = (link.kind || "").toLowerCase();
        if (k === "phone" || k === "sms" || k === "whatsapp" || k === "viber" || k === "telegram") {
          return { ...link, value: phone };
        }
        if (k === "email") return { ...link, value: email };
        if (k === "facebook" || k === "messenger") {
          facebookHandled = true;
          return { ...link, value: facebookUrl };
        }
        if (k === "url" || k === "custom") {
          return { ...link, value: substituteIamId(link.value) ?? link.value };
        }
        return link;
      });
      await supabase.from("card_links").insert(linkInserts);
    }
  }

  if (!facebookHandled) {
    const { error: linkErr } = await supabase.from("card_links").insert({
      card_id: card.id,
      kind: "facebook",
      label: "Facebook",
      value: facebookUrl,
      icon: "facebook",
      sort_index: 999,
    } as any);
    if (linkErr) console.warn("Facebook link insert failed:", linkErr);
  }

  if (updateProfile) {
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        iam_id: isIamMember ? iamId : null,
        facebook_url: facebookUrl,
        onboarding_completed_at: new Date().toISOString(),
      } as any)
      .eq("id", user.id);
    if (profileErr) console.warn("Profile update failed:", profileErr);
  }

  return { cardId: card.id };
}

export const onboardingCardSchema = {
  // re-export shape via zod in callers; kept here as docs only
};
