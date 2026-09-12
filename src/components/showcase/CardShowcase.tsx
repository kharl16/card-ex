import React, { useMemo } from "react";
import ClassicShowcase from "@/components/showcase/ClassicShowcase";
import ImmersiveShowcase from "@/components/showcase/ImmersiveShowcase";
import { mergeCarouselSettings, type CarouselSettingsData } from "@/lib/carouselTypes";
import {
  buildShowcaseCategories,
  getShowcaseDisplayMode,
  type ShowcaseGlobals,
} from "@/lib/showcase";

interface CardShowcaseProps {
  card: any;
  globals?: ShowcaseGlobals;
  isInteractive?: boolean;
  shareUrl?: string;
}

/**
 * Entry point for the public card showcase.
 *
 * Both modes read the same normalised categories, so switching presentation
 * never changes, moves or deletes a card's existing media.
 */
export default function CardShowcase({
  card,
  globals,
  isInteractive = true,
  shareUrl,
}: CardShowcaseProps) {
  const settings: CarouselSettingsData = useMemo(
    () => mergeCarouselSettings(card?.carousel_settings ?? null),
    [card?.carousel_settings]
  );

  const categories = useMemo(
    () => buildShowcaseCategories(card, settings, globals),
    [card, settings, globals]
  );

  const mode = getShowcaseDisplayMode(card);
  const hasContent = categories.some((c) => c.isVisible);
  if (!hasContent) return null;

  const contactInfo = { phone: card?.phone, email: card?.email, website: card?.website };

  if (mode === "immersive") {
    return (
      <div className="my-2 overflow-hidden rounded-2xl">
        <ImmersiveShowcase
          categories={categories}
          settings={settings}
          contactInfo={contactInfo}
          isInteractive={isInteractive}
          shareUrl={shareUrl}
        />
      </div>
    );
  }

  return (
    <ClassicShowcase
      categories={categories}
      settings={settings}
      contactInfo={contactInfo}
      isInteractive={isInteractive}
      shareUrl={shareUrl}
      cardSlug={card?.slug}
    />
  );
}
