import type { Tables } from "@/integrations/supabase/types";
import { profileToVCardV3, type Profile } from "./canonicalVCard";
import { supabase } from "@/integrations/supabase/client";

type CardData = Tables<"cards">;

// ... keep your mapCardToProfile and generateVCard EXACTLY as they are ...

export async function generateVCard(card: CardData, additionalContacts?: AdditionalContact[]): Promise<string> {
  const profile = mapCardToProfile(card, additionalContacts);
  return await profileToVCardV3(profile);
}

export async function downloadVCard(card: CardData, additionalContacts?: AdditionalContact[]): Promise<void> {
  const vcardContent = await generateVCard(card, additionalContacts);

  const safeName =
    card.full_name
      ?.trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "") || "contact";

  const filePath = `cards/${card.id}/${safeName}.vcf`;

  // 1) Upload vCard text to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("vcards") // 👈 make sure this matches your bucket name
    .upload(filePath, vcardContent, {
      cacheControl: "3600",
      upsert: true,
      contentType: "text/vcard;charset=utf-8",
    });

  if (uploadError) {
    console.error("Failed to upload vCard:", uploadError);
    // Fallback: still let the user download via blob so UX is not broken
    const blob = new Blob([vcardContent], {
      type: "text/vcard;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // 2) Get public URL from Storage
  const { data: publicData } = supabase.storage.from("vcards").getPublicUrl(filePath);

  const publicUrl = publicData?.publicUrl;

  // 3) Save vcard_url in the cards table
  if (publicUrl) {
    const { error: updateError } = await supabase.from("cards").update({ vcard_url: publicUrl }).eq("id", card.id);

    if (updateError) {
      console.error("Failed to update card with vcard_url:", updateError);
    }
  }

  // 4) Trigger the actual download for the user
  if (publicUrl) {
    const link = document.createElement("a");
    link.href = publicUrl;
    link.download = `${safeName}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Fallback again: blob download if somehow no URL
    const blob = new Blob([vcardContent], {
      type: "text/vcard;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
