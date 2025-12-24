-- Add default_template_id to app_settings for "Default Theme for New Cards"
INSERT INTO public.app_settings (key, value)
VALUES ('default_template_id', '')
ON CONFLICT (key) DO NOTHING;