WITH desired AS (
  SELECT * FROM (VALUES
    ('Copper', 0),
    ('Bronze', 1),
    ('Silver', 2),
    ('Gold', 3),
    ('Platinum', 4),
    ('Jade', 5),
    ('Hope', 6)
  ) AS t(alt, ord)
),
target_cards AS (
  SELECT id, package_images
  FROM cards
  WHERE id NOT IN ('8bf1af4d-61a6-4196-9ce4-f58de7f75b33', '3e66e43a-a01e-4f55-8e7e-885ba94875a9')
    AND package_images::text LIKE '%0594ee28-d4e3-4243-a545-727df67c5e23%'
),
reordered AS (
  SELECT
    tc.id,
    jsonb_agg(
      (elem - 'order') || jsonb_build_object('order', d.ord)
      ORDER BY d.ord
    ) AS new_pkgs
  FROM target_cards tc
  CROSS JOIN LATERAL jsonb_array_elements(tc.package_images) AS elem
  JOIN desired d ON d.alt = elem->>'alt'
  GROUP BY tc.id
)
UPDATE cards c
SET package_images = r.new_pkgs
FROM reordered r
WHERE c.id = r.id;