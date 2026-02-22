/**
 * Video utilities for parsing YouTube/Google Drive URLs
 * and generating embed/thumbnail/download URLs.
 */

export type VideoSource = "youtube" | "gdrive" | "unknown";

export interface VideoItem {
  url: string;
  source: VideoSource;
  title?: string;
  thumbnail?: string;
  order?: number;
}

/** Extract YouTube video ID from various URL formats */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Extract Google Drive file ID from various URL formats */
export function extractGDriveId(url: string): string | null {
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/.*\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Detect the video source from a URL */
export function detectVideoSource(url: string): VideoSource {
  if (extractYouTubeId(url)) return "youtube";
  if (extractGDriveId(url)) return "gdrive";
  return "unknown";
}

/** Get an embeddable URL for the video */
export function getEmbedUrl(url: string, autoplay = false): string | null {
  const ytId = extractYouTubeId(url);
  if (ytId) {
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
    });
    if (autoplay) {
      params.set("autoplay", "1");
      params.set("mute", "1");
    }
    return `https://www.youtube.com/embed/${ytId}?${params.toString()}`;
  }

  const gdriveId = extractGDriveId(url);
  if (gdriveId) {
    return `https://drive.google.com/file/d/${gdriveId}/preview`;
  }

  return null;
}

/** Get a thumbnail URL for the video */
export function getThumbnailUrl(url: string): string | null {
  const ytId = extractYouTubeId(url);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }

  // Google Drive doesn't have a reliable public thumbnail API
  // Return null - we'll show a placeholder
  return null;
}

/** Get a shareable URL for the video */
export function getShareUrl(url: string): string {
  const ytId = extractYouTubeId(url);
  if (ytId) return `https://youtu.be/${ytId}`;

  const gdriveId = extractGDriveId(url);
  if (gdriveId) return `https://drive.google.com/file/d/${gdriveId}/view`;

  return url;
}

/** Get a download URL (only for Google Drive) */
export function getDownloadUrl(url: string): string | null {
  const gdriveId = extractGDriveId(url);
  if (gdriveId) {
    return `https://drive.google.com/uc?export=download&id=${gdriveId}`;
  }
  // YouTube doesn't support direct download
  return null;
}

/** Parse a raw URL input into a VideoItem */
export function parseVideoUrl(url: string, order?: number): VideoItem | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const source = detectVideoSource(trimmed);
  if (source === "unknown") return null;

  return {
    url: trimmed,
    source,
    thumbnail: getThumbnailUrl(trimmed) || undefined,
    order,
  };
}
