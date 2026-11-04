-- NusaMora: tabel untuk Dashboard Pelanggan. Jalankan SETELAH supabase-schema.sql.
-- Klien (browser) hanya boleh MEMBACA data miliknya sendiri. Penulisan (undangan, paket, invoice, saldo)
-- dilakukan oleh backend tepercaya / service role, supaya pelanggan tidak bisa mengubah saldo atau paketnya sendiri.

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_type text,
  template_id text,
  event_date date,
  status text not null default 'draft' check (status in ('draft','aktif','selesai','nonaktif')),
  public_url text,
  guest_count int not null default 0 check (guest_count >= 0),
  wish_count int not null default 0 check (wish_count >= 0),
  created_at timestamptz not null default now()
);
create index if not exists invitations_user_idx on public.invitations (user_id, created_at desc);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('essential','signature','luxe')),
  status text not null default 'aktif' check (status in ('aktif','kedaluwarsa','dibatalkan')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, expires_at desc);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  number text not null unique,
  description text not null,
  amount bigint not null check (amount >= 0),
  status text not null default 'menunggu' check (status in ('menunggu','lunas','gagal','dibatalkan')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists invoices_user_idx on public.invoices (user_id, created_at desc);

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits int not null default 0 check (credits >= 0),
  bonus_balance bigint not null default 0 check (bonus_balance >= 0)
);

create table if not exists public.bonus_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount bigint not null,
  created_at timestamptz not null default now()
);
create index if not exists bonus_user_idx on public.bonus_history (user_id, created_at desc);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null check (amount > 0),
  destination text,
  status text not null default 'diproses' check (status in ('diproses','berhasil','ditolak')),
  created_at timestamptz not null default now()
);
create index if not exists withdrawals_user_idx on public.withdrawals (user_id, created_at desc);

-- RLS: baca milik sendiri saja, tanpa policy tulis untuk klien
do $$
declare t text;
begin
  foreach t in array array['invitations','subscriptions','invoices','wallets','bonus_history','withdrawals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "baca milik sendiri" on public.%I', t);
    execute format('create policy "baca milik sendiri" on public.%I for select using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Pengaman: kolom profil yang boleh diubah pelanggan hanya nama dan WhatsApp
revoke update on public.profiles from authenticated;
grant update (full_name, whatsapp) on public.profiles to authenticated;
