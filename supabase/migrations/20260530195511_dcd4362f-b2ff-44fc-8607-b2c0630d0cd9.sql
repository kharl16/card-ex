UPDATE public.global_testimony_images
SET caption = regexp_replace(
  regexp_replace(
    regexp_replace(caption, '\mPcos\M', 'PCOS', 'g'),
    '\mUti\M', 'UTI', 'g'),
  '\mIcu\M', 'ICU', 'g')
WHERE caption ~ '\m(Pcos|Uti|Icu)\M';