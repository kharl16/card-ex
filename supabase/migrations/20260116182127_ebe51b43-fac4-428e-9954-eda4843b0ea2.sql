
-- Delete mismatched referral records where correct records already exist
DELETE FROM referrals
WHERE id IN (
  '2769a769-0f6e-4d06-8190-3ef8a552f2bf',
  'a9934597-cd1b-4991-8c03-cc3129208fa3',
  '0fd36fe9-dd2c-40fa-a31f-2f13b3acc485',
  '07deb7ce-1d41-4af0-a4df-8c0b2589a72c',
  'b800f68c-fa2f-48a3-8759-3e9daaeb037a',
  '98e264d7-edd8-4461-a340-d259f32beb29',
  '17151ec9-602f-40e4-ace4-577d9278bbfd',
  '38558828-8145-4c40-bf12-42c6902924e4',
  '0d0b7b8e-2ed0-434c-bcf8-47803e58624c',
  'c7bb0ec2-7da3-4bd9-a82a-92db626b93ef'
);
