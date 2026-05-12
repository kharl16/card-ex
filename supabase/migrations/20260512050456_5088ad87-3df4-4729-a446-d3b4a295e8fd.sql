UPDATE public.cards
SET 
  cover_url = 'https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/media/a0efd175-4704-495e-a755-a18d1bd8dab8/1778560867994.jpg',
  image_carousels = COALESCE(image_carousels, '{}'::jsonb) || jsonb_build_object(
    'cover', jsonb_build_object(
      'autoPlayMs', 7000,
      'items', jsonb_build_array(
        jsonb_build_object('url', 'https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/media/carousel-cover/a0efd175-4704-495e-a755-a18d1bd8dab8/1778526030576.jpg'),
        jsonb_build_object('url', 'https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/media/carousel-cover/a0efd175-4704-495e-a755-a18d1bd8dab8/1778526052388.jpg')
      )
    )
  ),
  updated_at = now()
WHERE company ILIKE '%IAM Worldwide%';