import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { z } from 'zod';
import ProductRingCarousel from './ProductRingCarousel';

type ImgRow = { id: string; url: string; sort_index: number };

// Validation schema for image URLs
const imageUrlSchema = z.string()
  .trim()
  .min(1, 'URL cannot be empty')
  .max(2048, 'URL too long')
  .url('Invalid URL format')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'Only HTTP(S) URLs are allowed'
  )
  .refine(
    (url) => !/^(javascript|data|vbscript):/i.test(url),
    'Invalid URL scheme detected'
  );

// Allowed image MIME types for file uploads
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export default function GalleryManager({ cardId }: { cardId: string }) {
  const [rows, setRows] = useState<ImgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [urlInput, setUrlInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('card_images')
      .select('id,url,sort_index')
      .eq('card_id', cardId)
      .order('sort_index');
    
    if (!error && data) {
      setRows(data as ImgRow[]);
    }
    setLoading(false);
  }, [cardId]);

  useEffect(() => { load(); }, [load]);

  const canAdd = rows.length < 20;

  async function addUrls(urls: string[]) {
    const available = Math.max(0, 20 - rows.length);
    const slice = urls.slice(0, available);
    if (slice.length === 0) {
      toast.error('Limit is 20 images per card');
      return;
    }

    // Validate all URLs before insertion
    const validatedUrls: string[] = [];
    for (const url of slice) {
      try {
        const validated = imageUrlSchema.parse(url);
        validatedUrls.push(validated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMsg = error.errors[0]?.message || 'Invalid URL';
          toast.error(`URL validation failed: ${errorMsg}`);
          return;
        }
        toast.error('URL validation failed');
        return;
      }
    }

    const base = rows.length;
    const payload = validatedUrls.map((u, i) => ({ 
      card_id: cardId, 
      url: u, 
      sort_index: base + i 
    }));
    
    const { error } = await supabase.from('card_images').insert(payload);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Images added');
    }
    await load();
    setRefreshKey(k => k + 1);
  }

  async function onFileChoose(files: FileList | null) {
    if (!files || files.length === 0) return;
    
    const avail = Math.max(0, 20 - rows.length);
    const list = Array.from(files).slice(0, avail);
    if (list.length === 0) {
      toast.error('Limit is 20 images per card');
      return;
    }

    // Validate file types
    const invalidFiles = list.filter(f => !ALLOWED_IMAGE_TYPES.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error(`Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.`);
      return;
    }

    // Validate file sizes (10MB max per file)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = list.filter(f => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(`File size exceeds 10MB limit.`);
      return;
    }

    const urls: string[] = [];
    for (const f of list) {
      try {
        const path = `${cardId}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
        const up = await supabase.storage.from('card-images').upload(path, f, { upsert: false });
        
        if (up.error) {
          toast.error('Storage bucket "card-images" missing or not public. Using URLs instead.');
          break;
        }
        const pub = supabase.storage.from('card-images').getPublicUrl(path);
        urls.push(pub.data.publicUrl);
      } catch (e: any) {
        toast.error(String(e?.message || e));
        break;
      }
    }
    if (urls.length) await addUrls(urls);
  }

  async function remove(id: string, url: string) {
    setSaving(true);
    await supabase.from('card_images').delete().eq('id', id);
    
    // Best-effort: delete storage object if from our bucket
    try {
      const m = url.match(/card-images\/([^?]+)/);
      if (m) await supabase.storage.from('card-images').remove([m[1]]);
    } catch {}
    
    setSaving(false);
    toast.success('Image removed');
    await load();
    setRefreshKey(k => k + 1);
  }

  // Drag & Drop reorder
  const dragSrc = useRef<number | null>(null);
  
  function onDragStart(i: number) { 
    dragSrc.current = i; 
  }
  
  function onDragOver(e: React.DragEvent) { 
    e.preventDefault(); 
  }
  
  async function onDrop(i: number) {
    const from = dragSrc.current;
    dragSrc.current = null;
    if (from == null || from === i) return;
    
    const next = rows.slice();
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    
    // Reindex and persist
    next.forEach((r, idx) => (r.sort_index = idx));
    setRows(next);
    setSaving(true);
    
    // Update each row with full data
    for (const r of next) {
      await supabase
        .from('card_images')
        .update({ sort_index: r.sort_index })
        .eq('id', r.id);
    }
    
    setSaving(false);
    toast.success('Order updated');
    setRefreshKey(k => k + 1);
  }

  async function addUrl() {
    if (!urlInput.trim()) return;
    await addUrls([urlInput.trim()]);
    setUrlInput('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Product Gallery</h2>
        <p className="text-sm text-muted-foreground">Max 20 images per card • Drag to reorder • Live preview below</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={(e) => onFileChoose(e.target.files)} 
          disabled={!canAdd}
          className="max-w-xs"
        />
        <span className="text-muted-foreground">or</span>
        <Input 
          value={urlInput} 
          onChange={e => setUrlInput(e.target.value)} 
          placeholder="Paste image URL" 
          className="max-w-sm"
        />
        <Button onClick={addUrl} disabled={!canAdd || !urlInput.trim()}>
          Add URL
        </Button>
        {!canAdd && <span className="text-sm text-amber-600">Limit reached (20)</span>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {loading ? (
          <div className="col-span-full text-center text-muted-foreground">Loading…</div>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.id}
              className="group relative cursor-move rounded-lg border border-border bg-card p-2 transition hover:border-primary"
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(i)}
            >
              <img src={r.url} alt="" className="h-32 w-full rounded object-cover" />
              <span className="absolute left-3 top-3 rounded bg-black/70 px-2 py-1 text-xs text-white">
                #{i + 1}
              </span>
              <Button
                variant="destructive"
                size="sm"
                className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100"
                onClick={() => remove(r.id, r.url)}
                disabled={saving}
              >
                Delete
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Live Preview</h3>
        <div key={refreshKey} className="rounded-lg border border-border bg-card p-4">
          <ProductRingCarousel cardId={cardId} />
        </div>
      </div>
    </div>
  );
}
