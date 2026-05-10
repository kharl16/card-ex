import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { buildCardInsertFromSnapshot, buildCardLinksInsertFromSnapshot, type CardSnapshot } from "@/lib/cardSnapshot";
import type { CardTemplate } from "@/hooks/useTemplates";
import type { User } from "@supabase/supabase-js";

type CardInsert = Database["public"]["Tables"]["cards"]["Insert"];
type CardLinkInsert = Database["public"]["Tables"]["card_links"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type SocialLinkJson = Record<string, Json | undefined> & { kind?: string };

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

  const productImages: Json[] = [];

  const iamId8 = isIamMember && iamId ? iamId : null;
  const substituteIamId = (url: string | undefined | null): string | undefined | null => {
    if (!url || !iamId8) return url;
    return url
      .replace(/(idno=)\d{6,}/gi, `$1${iamId8}`)
      .replace(/(\?|&)(ref|referrer|referral|iamid|iam_id)=\d{6,}/gi, `$1$2=${iamId8}`);
  };
  const substituteInItems = <T extends { link?: string | null; url?: string | null }>(items: T[] | undefined | null): T[] | undefined | null => {
    if (!Array.isArray(items)) return items;
    return items.map((it) => ({ ...it, link: substituteIamId(it.link) ?? it.link }));
  };
  const substituteInCarouselSettings = (cs: unknown): unknown => {
    if (!cs || typeof cs !== "object" || Array.isArray(cs)) return cs;
    const next = { ...(cs as Record<string, unknown>) };
    const section = next.products;
    if (section && typeof section === "object" && !Array.isArray(section)) {
      const sectionRecord = section as Record<string, unknown>;
      const cta = sectionRecord.cta;
      if (!cta || typeof cta !== "object" || Array.isArray(cta)) return next;
      const ctaRecord = cta as Record<string, unknown>;
      const href = typeof ctaRecord.href === "string" ? ctaRecord.href : null;
      next.products = {
        ...sectionRecord,
        cta: { ...ctaRecord, href: href ? substituteIamId(href) ?? href : ctaRecord.href },
      };
    }
    return next;
  };

  const extractFbHandle = (url: string): string | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\.|^web\.|^m\.|^mobile\./i, "").toLowerCase();
      if (host === "facebook.com" || host === "fb.com" || host === "fb.me") {
        const id = parsed.searchParams.get("id");
        if (parsed.pathname.toLowerCase().includes("profile.php") && id) return id;
        const [handle] = parsed.pathname.split("/").filter(Boolean);
        return handle || null;
      }
    } catch {
      const match = url.match(/(?:facebook\.com|fb\.com|fb\.me)\/([^/?#]+)/i);
      return match?.[1] || null;
    }
    return null;
  };
  const fbHandle = extractFbHandle(facebookUrl);
  const messengerUrl = fbHandle ? `https://m.me/${fbHandle}` : "https://m.me/";

  // Desired ordering for social-style kinds: Facebook → Website → Messenger
  const SOCIAL_ORDER: Record<string, number> = {
    facebook: 0,
    url: 1,
    website: 1,
    messenger: 2,
  };
  const orderForKind = (k: string) =>
    SOCIAL_ORDER[k] !== undefined ? SOCIAL_ORDER[k] : 100;

  const buildOnboardingSocialLinks = (existingSocial: any[] = []) => {
    const normalizedExisting = existingSocial.filter((s: any) => {
      const kind = (s?.kind || "").toLowerCase();
      return kind !== "facebook" && kind !== "messenger";
    });
    const nextLinks = [
      ...normalizedExisting,
      { id: `link-facebook-${Date.now()}`, kind: "facebook", label: "Facebook", icon: "Facebook", url: facebookUrl, value: facebookUrl },
      { id: `link-messenger-${Date.now()}`, kind: "messenger", label: "Messenger", icon: "Messenger", url: messengerUrl, value: messengerUrl },
    ];
    return nextLinks.sort((a: any, b: any) => {
      const ao = orderForKind((a.kind || "").toLowerCase());
      const bo = orderForKind((b.kind || "").toLowerCase());
      return ao === bo ? 0 : ao - bo;
    });
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
    insertData.social_links = buildOnboardingSocialLinks(existingSocial);

    if (!snapshot.product_images || snapshot.product_images.length === 0) {
      insertData.product_images = [];
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
      social_links: buildOnboardingSocialLinks(),
    };
  }

  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .insert(insertData as any)
    .select()
    .single();

  if (cardErr) throw cardErr;

  let facebookHandled = false;
  let messengerHandled = false;
  if (selectedTemplate) {
    const snapshot = selectedTemplate.layout_data as CardSnapshot;
    if (snapshot.card_links && snapshot.card_links.length > 0) {
      const linkInserts = buildCardLinksInsertFromSnapshot(snapshot, card.id).map((link) => {
        const k = (link.kind || "").toLowerCase();
        if (k === "phone" || k === "sms" || k === "whatsapp" || k === "viber" || k === "telegram") {
          return { ...link, value: phone };
        }
        if (k === "email") return { ...link, value: email };
        if (k === "facebook") {
          facebookHandled = true;
          return { ...link, value: facebookUrl };
        }
        if (k === "messenger") {
          messengerHandled = true;
          return { ...link, value: messengerUrl };
        }
        if (k === "url" || k === "custom") {
          return { ...link, value: substituteIamId(link.value) ?? link.value };
        }
        return link;
      });
      // Reorder Facebook → Website → Messenger; preserve relative order otherwise
      linkInserts.sort((a, b) => {
        const ao = orderForKind((a.kind || "").toLowerCase());
        const bo = orderForKind((b.kind || "").toLowerCase());
        if (ao !== bo) return ao - bo;
        return (a.sort_index ?? 0) - (b.sort_index ?? 0);
      });
      linkInserts.forEach((l, i) => {
        l.sort_index = i;
      });
      await supabase.from("card_links").insert(linkInserts);
    }
  }

  const baseLinks: Array<{
    card_id: string;
    kind: "facebook" | "messenger";
    label: string;
    value: string;
    icon: string;
    sort_index: number;
  }> = [];
  if (!facebookHandled) {
    baseLinks.push({ card_id: card.id, kind: "facebook" as const, label: "Facebook", value: facebookUrl, icon: "Facebook", sort_index: 0 });
  }
  if (!messengerHandled) {
    baseLinks.push({ card_id: card.id, kind: "messenger" as const, label: "Messenger", value: messengerUrl, icon: "Messenger", sort_index: 2 });
  }
  if (baseLinks.length > 0) {
    const { error: linkErr } = await supabase.from("card_links").insert(baseLinks as any);
    if (linkErr) console.warn("Default social link insert failed:", linkErr);
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
