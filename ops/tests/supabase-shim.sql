-- Tiruan objek Supabase untuk menguji SQL di Postgres biasa (lokal). JANGAN dijalankan di Supabase asli.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
do $$ begin if not exists (select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin; end if; end $$;
create schema if not exists auth; create schema if not exists storage;
grant usage on schema auth, storage to anon, authenticated, service_role;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(coalesce(current_setting('request.jwt.claim.sub', true), (nullif(current_setting('request.jwt.claims', true), '')::jsonb)->>'sub'), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create or replace function auth.role() returns text language sql stable as $$ select coalesce(current_setting('role', true), 'anon') $$;
create table if not exists auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid not null, factor_type text default 'totp', status text not null default 'unverified');
create table if not exists storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
alter table storage.objects enable row level security;
create or replace function storage.foldername(n text) returns text[] language sql immutable as $$ select string_to_array(n,'/') $$;
