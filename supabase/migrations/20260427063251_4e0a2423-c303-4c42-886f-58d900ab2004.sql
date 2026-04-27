UPDATE cards
SET package_images = REPLACE(
  REPLACE(
    REPLACE(
      package_images::text,
      'a0efd175-4704-495e-a755-a18d1bd8dab8/c0be7ee2-5dc7-4a28-978d-d75da4d7cf1f/packages/a77a94ef-1aad-4af3-85c4-a4f8cbeffaa1.jpg',
      'a0efd175-4704-495e-a755-a18d1bd8dab8/8bf1af4d-61a6-4196-9ce4-f58de7f75b33/packages/0594ee28-d4e3-4243-a545-727df67c5e23.jpg'
    ),
    'a0efd175-4704-495e-a755-a18d1bd8dab8/c0be7ee2-5dc7-4a28-978d-d75da4d7cf1f/packages/7d84bc81-5982-4d1c-bb5f-7824c9fd0ff2.jpg',
    'a0efd175-4704-495e-a755-a18d1bd8dab8/8bf1af4d-61a6-4196-9ce4-f58de7f75b33/packages/570d13cf-2d77-40f9-ba99-b390df571dee.jpg'
  ),
  'a0efd175-4704-495e-a755-a18d1bd8dab8/c0be7ee2-5dc7-4a28-978d-d75da4d7cf1f/packages/68a98be1-9495-412d-9b0d-e8203aa571bb.jpg',
  'a0efd175-4704-495e-a755-a18d1bd8dab8/8bf1af4d-61a6-4196-9ce4-f58de7f75b33/packages/0b00ea25-20e5-4eca-a237-3bd1d64f9815.jpg'
)::jsonb
WHERE id NOT IN ('8bf1af4d-61a6-4196-9ce4-f58de7f75b33', '3e66e43a-a01e-4f55-8e7e-885ba94875a9')
  AND package_images::text LIKE '%a77a94ef-1aad-4af3-85c4-a4f8cbeffaa1%';