-- NusaMora: skema akun. Jalankan di Supabase > SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\+?[0-9]{8,15}$'),
  event_type text,
  template_id text,
  plan text check (plan is null or plan in ('essential','signature','luxe')),
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profil sendiri: baca" on public.profiles for select using (auth.uid() = id);
create policy "profil sendiri: ubah" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- insert hanya lewat trigger di bawah (sengaja tanpa policy insert untuk klien)

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, whatsapp, event_type, template_id, plan, terms_accepted_at)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email,'@',1)), 80),
    case when new.raw_user_meta_data->>'whatsapp' ~ '^\+?[0-9]{8,15}$' then new.raw_user_meta_data->>'whatsapp' end,
    nullif(new.raw_user_meta_data->>'event_type',''),
    nullif(new.raw_user_meta_data->>'template_id',''),
    case when new.raw_user_meta_data->>'plan' in ('essential','signature','luxe') then new.raw_user_meta_data->>'plan' end,
    case when new.raw_user_meta_data->>'terms' = 'true' then now() end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
