import React from "react";
import CarouselSectionRenderer from "@/components/carousel/CarouselSectionRenderer";
import VideoSectionRenderer from "@/components/video/VideoSectionRenderer";
import type { CarouselSettingsData } from "@/lib/carouselTypes";
import type { ShowcaseCategory } from "@/lib/showcase";

interface ContactInfo {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

interface ClassicShowcaseProps {
  categories: ShowcaseCategory[];
  settings: CarouselSettingsData;
  contactInfo?: ContactInfo;
  isInteractive?: boolean;
  shareUrl?: string;
  cardSlug?: string;
}

/**
 * The original Card-Ex carousel presentation, unchanged in look and behaviour.
 * It now simply renders the shared showcase categories in the canonical order
 * (Company Brochure → Videos → Products → Packages → Testimonies).
 */
export default function ClassicShowcase({
  categories,
  settings,
  contactInfo = {},
  isInteractive = true,
  shareUrl,
  cardSlug,
}: ClassicShowcaseProps) {
  return (
    <>
      {categories.map((category) => {
        if (!category.isVisible) return null;

        if (category.key === "videos") {
          return (
            <div key={category.key} className="px-6 my-1">
              <VideoSectionRenderer
                section={settings.videos}
                videos={category.videos}
                contactInfo={contactInfo}
                isInteractive={isInteractive}
                shareUrl={shareUrl}
              />
            </div>
          );
        }

        // Structured brochure: one titled block per brochure section.
        if (category.groups?.length) {
          return (
            <div key={category.key} className="px-6 my-1 space-y-2">
              {category.intro && (
                <p className="text-sm leading-relaxed opacity-80">{category.intro}</p>
              )}
              {category.groups.map((group) => (
                <div key={group.id} className="space-y-1">
                  <CarouselSectionRenderer
                    carouselKey={category.key}
                    section={{ ...settings[category.key], title: group.heading || category.title }}
                    images={group.images}
                    contactInfo={contactInfo}
                    isInteractive={isInteractive}
                    shareUrl={shareUrl}
                    cardSlug={cardSlug}
                  />
                  {group.body && (
                    <p className="text-sm leading-relaxed opacity-75">{group.body}</p>
                  )}
                </div>
              ))}
            </div>
          );
        }

        return (
          <div key={category.key} className="px-6 my-1">
            <CarouselSectionRenderer
              carouselKey={category.key}
              section={settings[category.key]}
              images={category.images}
              contactInfo={contactInfo}
              isInteractive={isInteractive}
              shareUrl={shareUrl}
              cardSlug={cardSlug}
            />
          </div>
        );
      })}
    </>
  );
}
