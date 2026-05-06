DELETE FROM public.global_product_images WHERE id IN (
  -- Broken (HTTP 400) image URLs
  '8b2de8b5-400e-4566-9ee2-8906b0bdd54f',
  'aca30270-c821-4e90-a327-0b6cbfe45fbd',
  '5fe298e8-8a39-4fb4-81e3-47e5567cea53',
  'd18e0d9b-7028-4d6c-b7d4-6305fa6b13e2',
  '53d8ee4c-44f6-42f2-a273-ebf902097774',
  '88ba8c68-002b-41c8-a665-95d62d192b18',
  '928940e0-5783-47e9-95a9-2913a8dc0d56',
  '3e43fb0b-3330-4a3c-93b1-2974dfb7e2e8',
  'c829bab8-399a-4899-8d8f-5fb391c5a269',
  'e4f147f3-3bbb-4301-b8c7-e00d49fa1dec',
  '0e07f089-70fa-4c76-ae74-c11eb5246ab0',
  '657a454a-2632-41a6-aa1b-a1ab9e367dcc',
  '31a56afd-5548-4ebb-a9eb-d8fc1233e8d9',
  '91b6a24d-e80e-4739-abf0-64d04fb235ea',
  'ffbcdb03-c8cb-4849-91dd-19daa540aa4e',
  '9fd2d69a-dece-4eb5-9a77-9d4cb4fa1613',
  -- Duplicate images (same content hash) — keep the earliest sort_index, delete the later copy
  '5a7b0742-12d0-4371-9786-369e9652d0fe',
  '125f1fe2-bfb0-4f62-8507-7e158b184071',
  'ce3439cf-d4d2-4b36-ae87-b680fe63e3ef',
  '50948ef7-0809-47a7-ad4f-41f102eae524',
  '80cd21e9-592a-4fe9-b16f-ad9ff52904d8',
  'ee17d978-5a36-45a9-a5cc-27848473acaf',
  '4e9314a7-f43c-4ee7-9f9b-21b95292e127',
  'db76d199-a68b-4b45-8511-2b0de2bd9904',
  'c3ac7d9f-3cc7-4df0-b1ba-14ad19e0fa97',
  'a45459be-ab8b-4843-b432-02ed2b02ffe3',
  'f70870ff-227e-45d7-b22a-15f033f5d6fd',
  '80d486e3-a67c-4b32-9609-2d1e7f8add5d',
  '3532577d-b533-4c51-8cfe-0325a0328eaf',
  '2807f76f-29d9-4450-bff9-bae792e15441'
);

-- Also clean up any per-card overrides that pointed at the removed rows (cascade is not defined)
DELETE FROM public.card_global_image_overrides
WHERE global_image_id NOT IN (SELECT id FROM public.global_product_images);