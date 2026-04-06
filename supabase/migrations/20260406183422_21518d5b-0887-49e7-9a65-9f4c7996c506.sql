
UPDATE card_templates
SET layout_data = jsonb_set(
  layout_data::jsonb,
  '{logo_url}',
  '"https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/media/shared/iam-worldwide-logo.png"'
)
WHERE id = '95ab9081-ddfe-4b10-b1a7-2490a738b357';
