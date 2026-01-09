-- Insert default tools_orb_settings if not exists
INSERT INTO public.tools_orb_settings (id, enabled, orb_label, orb_image_url, items, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  true,
  'Tools',
  null,
  '[
    {"id": "trainings", "label": "Trainings", "route": "/tools/trainings", "icon_name": "GraduationCap", "order": 1, "enabled": true},
    {"id": "links", "label": "IAM Links", "route": "/tools/links", "icon_name": "Link", "order": 2, "enabled": true},
    {"id": "files", "label": "Files", "route": "/tools/files", "icon_name": "FolderOpen", "order": 3, "enabled": true},
    {"id": "directory", "label": "Branches", "route": "/tools/directory", "icon_name": "Building2", "order": 4, "enabled": true},
    {"id": "presentations", "label": "Presentations", "route": "/tools/presentations", "icon_name": "Presentation", "order": 5, "enabled": true}
  ]'::jsonb,
  now()
)
ON CONFLICT (id) DO NOTHING;