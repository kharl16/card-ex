UPDATE tools_orb_settings
SET items = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'links'
      THEN jsonb_set(elem, '{label}', '"Tools"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(items::jsonb) AS elem
)
WHERE id = '00000000-0000-0000-0000-000000000001';