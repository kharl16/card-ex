-- 1. Create enum for roles (reuse existing app_role enum if it exists)
-- Note: app_role enum already exists with 'owner', 'admin', 'member'
-- We'll add 'user' to it if needed, or reuse 'member' as the default role

-- 2. Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  granted_at timestamp with time zone default now(),
  granted_by uuid references auth.users(id),
  unique (user_id, role)
);

-- 3. Enable RLS on user_roles
alter table public.user_roles enable row level security;

-- 4. Create SECURITY DEFINER function to check roles (prevents RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- 5. Add RLS policies to user_roles
create policy "Users can view own roles"
  on user_roles for select
  using (auth.uid() = user_id);

-- NO insert/update/delete policies - roles must be managed via secure edge function only

-- 6. Update is_super_admin() function to use new roles table
create or replace function public.is_super_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin')
$$;

-- 7. Migrate existing admin user from profiles to user_roles
insert into public.user_roles (user_id, role, granted_at, granted_by)
select id, 'admin'::app_role, created_at, id
from public.profiles
where is_super_admin = true
on conflict (user_id, role) do nothing;

-- 8. Create index for performance
create index idx_user_roles_user_id on public.user_roles(user_id);
create index idx_user_roles_role on public.user_roles(role);

-- Note: We keep is_super_admin column in profiles for now to avoid breaking existing code
-- It will be removed in a future migration after all code is updated