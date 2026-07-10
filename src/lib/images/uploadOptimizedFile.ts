/**
 * Thin uploader wrapper that runs `optimizeForUpload` first, then writes to
 * Supabase Storage with an immutable Cache-Control and a content-hashed
 * filename. Use this from every uploader that currently calls
 * `supabase.storage.from(...).upload(path, file, ...)` directly.
 */

import { supabase } from "@/integrations/supabase/client";
import { optimizeForUpload } from "./optimizeForUpload";
import { IMMUTABLE_CACHE_CONTROL, type ImageKind } from "./presets";

export interface UploadOptimizedOptions {
  bucket: string;
  /** Folder prefix inside the bucket, e.g. `${userId}/${cardId}`. */
  folder: string;
  kind: ImageKind;
  /** Force JPEG/WebP even if source PNG has alpha. */
  forceOpaque?: boolean;
}

export interface UploadOptimizedResult {
  publicUrl: string;
  path: string;
  optimizedBytes: number;
  originalBytes: number;
}

export async function uploadOptimizedFile(
  file: File | Blob,
  { bucket, folder, kind, forceOpaque }: UploadOptimizedOptions
): Promise<UploadOptimizedResult> {
  const optimized = await optimizeForUpload(file, { kind, forceOpaque });
  const path = `${folder.replace(/\/+$/, "")}/${kind}/${optimized.contentHash}.${optimized.extension}`;

  const { data, error } = await supabase.storage.from(bucket).upload(path, optimized.blob, {
    cacheControl: IMMUTABLE_CACHE_CONTROL,
    upsert: true,
    contentType: optimized.mime,
  });

  URL.revokeObjectURL(optimized.previewUrl);

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return {
    publicUrl: urlData.publicUrl,
    path: data.path,
    optimizedBytes: optimized.optimizedBytes,
    originalBytes: optimized.originalBytes,
  };
}
