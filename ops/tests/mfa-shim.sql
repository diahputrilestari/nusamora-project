-- Tiruan objek Supabase yang dibutuhkan uji MFA di Postgres biasa (JANGAN dijalankan di Supabase asli).
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create table if not exists auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid not null, factor_type text default 'totp', status text not null default 'unverified');
