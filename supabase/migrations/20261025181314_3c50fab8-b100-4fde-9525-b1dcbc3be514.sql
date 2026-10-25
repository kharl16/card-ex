ALTER TABLE public.card_templates ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS idx_card_templates_category ON public.card_templates(category);

DO $$
DECLARE
  r record;
  sec_tpl jsonb := '{"images":[],"settings":{"enabled":true,"autoPlayMs":4000,"direction":"ltr","imageGap":4,"imageSize":"sm","maxImages":50},"background":{"enabled":true,"type":"gradient","borderColor":"#D4AF37","borderWidth":1,"innerPadding":4,"gradient":{"direction":"to-r","from":"#050509","to":"#1a1405"}}}';
  cta_tpl jsonb := '{"action":"contact","contact_method":"messenger","placement":"below","target":"_self"}';
  sty jsonb;
BEGIN
  FOR r IN SELECT * FROM (VALUES
  ('automotive','Car Sales','Car Sales Consultant','#3B82F6','Helping families and business owners drive home the right vehicle with the best financing terms. Book a test drive today.','Featured Vehicles','Monthly Promos','Happy Owners','Schedule Test Drive','Request Financing Quote','Message Me'),
  ('real_estate','Real Estate','Licensed Real Estate Agent','#10B981','Helping families and investors secure prime residential and commercial properties. Let''s find your next home.','Active Listings','Pre-Selling Projects','Closed Deals','Book Property Viewing','Ask Payment Terms','Message Me'),
  ('medical','Medical Doctor','Physician / Specialist','#E5E7EB','Compassionate, evidence-based care for you and your family. View my clinic schedule and book a consultation.','Specialties','Clinic Schedule','Patient Stories','Book Consultation','View Clinic Hours','Message Clinic'),
  ('dental','Dentist','Dentist / Orthodontist','#67E8F9','Healthy, confident smiles through gentle and modern dental care. Book your cleaning or treatment today.','Popular Treatments','Smile Packages','Before & After','Book Dental Appointment','Ask for Price List','Message Clinic'),
  ('pet_care','Pet Care','Veterinarian / Pet Groomer','#F59E0B','Loving care for your furry family members: grooming, check-ups, and vaccinations.','Our Services','Care Packages','Happy Pets','Book Grooming / Vet Visit','View Service Menu','Message Me'),
  ('finance','Financial Advisor','Financial Advisor / Insurance','#22C55E','Protect what matters and grow your wealth. Get a free financial health review and a plan built for your goals.','Investment Plans','Protection Packages','Client Stories','Get Free Financial Review','Request a Quote','Message Me'),
  ('fitness','Fitness Coach','Personal Trainer / Fitness Coach','#EF4444','Stronger, healthier, and more confident with a program designed around you. Claim your free trial session.','Programs','Coaching Packages','Transformations','Claim Free Trial','Start Coaching','Message Me'),
  ('beauty','Beauty Specialist','Beauty Specialist / Salon','#EC4899','Hair, nails, and skin services that make you look and feel your best. Reserve your appointment today.','Services','Treatment Packages','Client Looks','Reserve Appointment','View Service Menu','Message Me'),
  ('legal','Legal Counsel','Lawyer / Notary Public','#A78BFA','Clear, confidential legal guidance for individuals and businesses. Schedule a consultation.','Practice Areas','Service Packages','Client Feedback','Schedule Legal Consultation','Ask About Fees','Message Office'),
  ('events','Events & Photography','Events Coordinator / Photographer','#F472B6','Capturing and creating unforgettable moments: weddings, birthdays, and corporate events.','Portfolio','Event Packages','Client Reviews','Check Date Availability','Get Event Package','Message Me'),
  ('consulting','Business Coach','Consultant / Business Coach','#D4AF37','Helping entrepreneurs grow with clear strategy, systems, and accountability. Book a 15-minute discovery call.','Case Studies','Coaching Programs','Client Wins','Book Discovery Call','View Programs','Message Me')
  ) AS v(cat,nm,ttl,acc,bio,t1,t2,t3,c1,c2,c3)
  LOOP
    IF EXISTS (SELECT 1 FROM public.card_templates WHERE category = r.cat AND is_global) THEN CONTINUE; END IF;
    sty := jsonb_build_object('glow',true,'glowColorMode','custom','glowCustomColor',r.acc,'glowIntensity',70,'shape','pill','size','sm','variant','outline','width','fit');
    INSERT INTO public.card_templates(owner_id,name,description,layout_data,is_global,visibility,category)
    VALUES ('a0efd175-4704-495e-a755-a18d1bd8dab8', r.nm || ' Template',
      'Ready-made for ' || r.ttl || ': client-focused bio, buttons and showcase sections.',
      jsonb_build_object(
        'theme', jsonb_build_object('name','Black&Gold','baseMode','dark','mode','dark','text','#F8F8F8','primary','#D4AF37','accent',r.acc,'background','#0B0B0C','buttonColor','#D4AF37','font','Montserrat','backgroundType','solid'),
        'carousel_enabled', true, 'cover_url', null, 'logo_url', null, 'avatar_url', null, 'image_carousels', null,
        'show_daily_quote', true, 'show_referral_earnings', false,
        'full_name', null, 'first_name', null, 'middle_name', null, 'last_name', null, 'prefix', null, 'suffix', null,
        'title', r.ttl, 'company', null, 'bio', r.bio, 'email', null, 'phone', null, 'website', null, 'location', null,
        'social_links', '[]'::jsonb, 'card_links', '[]'::jsonb,
        'carousel_settings', jsonb_build_object(
          'products', sec_tpl || jsonb_build_object('title', r.t1, 'cta', cta_tpl || jsonb_build_object('enabled',true,'label',r.c1,'style',sty)),
          'packages', sec_tpl || jsonb_build_object('title', r.t2, 'cta', cta_tpl || jsonb_build_object('enabled',true,'label',r.c2,'style',sty)),
          'testimonies', sec_tpl || jsonb_build_object('title', r.t3, 'cta', cta_tpl || jsonb_build_object('enabled',false,'label',r.c3,'style',sty))
        ),
        'product_images','[]'::jsonb,'package_images','[]'::jsonb,'testimony_images','[]'::jsonb,'video_items','[]'::jsonb,'brochure_images','[]'::jsonb,
        'showcase_display_mode','immersive','source_card_id', null
      ), true, 'global', r.cat);
  END LOOP;
END $$;