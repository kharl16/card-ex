import { supabase } from "@/integrations/supabase/client";

export type ImageType = "avatar" | "logo" | "cover";

interface UploadResult {
  publicUrl: string;
  path: string;
}

/**
 * Upload a processed image blob to Supabase storage
 * Uses the existing 'media' bucket with organized folder structure
 */
export async function uploadProcessedImage(
  file: Blob,
  imageType: ImageType,
  cardId?: string
): Promise<UploadResult> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to upload images");
  }

  // Generate file path based on image type and card/user
  const timestamp = Date.now();
  const extension = "webp";
  
  let path: string;
  if (cardId) {
    // Card-specific images
    path = `cards/${cardId}/${imageType}-${timestamp}.${extension}`;
  } else {
    // User-specific images (fallback)
    path = `${user.id}/${imageType}-${timestamp}.${extension}`;
  }

  const bucket = "media";

  // Upload to Supabase storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: "image/webp",
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    publicUrl: urlData.publicUrl,
    path: data.path,
  };
}
