import { supabase } from "@/integrations/supabase/client";
import { optimizeForUpload } from "@/lib/images/optimizeForUpload";
import { IMMUTABLE_CACHE_CONTROL } from "@/lib/images/presets";
import type { ImageKind } from "@/lib/images/presets";

export type ImageType = "avatar" | "logo" | "cover";

interface UploadResult {
  publicUrl: string;
  path: string;
}

/**
 * Upload a processed image blob to Supabase Storage.
 *
 * - Runs the blob through `optimizeForUpload` so we never store raw bytes.
 * - Names the object by content-hash so identical uploads dedupe automatically.
 * - Sets an immutable Cache-Control so the CDN never re-fetches.
 */
export async function uploadProcessedImage(
  file: Blob,
  imageType: ImageType,
  cardId?: string
): Promise<UploadResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to upload images");
  }

  // Editor image types map 1:1 onto our preset kinds.
  const kind: ImageKind = imageType;
  const optimized = await optimizeForUpload(file, { kind });

  const owner = cardId ? `cards/${cardId}` : user.id;
  const path = `${owner}/${imageType}/${optimized.contentHash}.${optimized.extension}`;

  const bucket = "media";

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, optimized.blob, {
      cacheControl: IMMUTABLE_CACHE_CONTROL,
      upsert: true,
      contentType: optimized.mime,
    });

  // Free the object URL created by the optimizer — the uploaded public URL
  // supersedes it.
  URL.revokeObjectURL(optimized.previewUrl);

  if (error) {
    console.error("Upload error:", error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return {
    publicUrl: urlData.publicUrl,
    path: data.path,
  };
}
