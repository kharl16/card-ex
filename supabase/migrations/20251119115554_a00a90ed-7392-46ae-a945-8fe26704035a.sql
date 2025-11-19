-- Create card_images table for product gallery
create table if not exists public.card_images (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  url text not null,
  sort_index int not null default 0,
  created_at timestamptz not null default now()
);

-- Create indexes
create index if not exists card_images_card_idx on public.card_images(card_id, sort_index);
create unique index if not exists card_images_unique_order on public.card_images(card_id, sort_index);

-- Function to enforce 20 images limit per card
create or replace function public.enforce_20_images()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.card_images where card_id = new.card_id) >= 20 then
    raise exception 'Limit is 20 images per card';
  end if;
  return new;
end $$;

-- Create trigger
drop trigger if exists trg_card_images_limit on public.card_images;
create trigger trg_card_images_limit
before insert on public.card_images
for each row execute function public.enforce_20_images();

-- Enable RLS
alter table public.card_images enable row level security;

-- RLS: Anyone can read published card images
drop policy if exists "read card images" on public.card_images;
create policy "read card images" on public.card_images 
for select using (true);

-- RLS: Card owners can manage their card images
drop policy if exists "write card images (owner)" on public.card_images;
create policy "write card images (owner)" on public.card_images
for all to authenticated
using (
  exists (
    select 1 from public.cards c
    where c.id = card_images.card_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.cards c
    where c.id = card_images.card_id
      and c.user_id = auth.uid()
  )
);