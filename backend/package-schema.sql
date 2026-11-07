-- NusaMora: refactor alur "Pilih Paket dulu" (Essential 2D / Signature 3D Cinematic / Luxe 3D Live Guest).
-- JALANKAN PALING AKHIR (setelah supabase, dashboard, admin, invitation, payment). Aman diulang dan backward-compatible:
-- undangan & pelanggan lama tidak dihapus; undangan lama di-backfill paketnya dari template-nya.
-- Jika suatu saat Anda menjalankan ulang invitation-schema.sql atau payment-schema.sql, jalankan file ini lagi sesudahnya.

----------------------------------------------------------------------------- 1. Template: jenis paket, kategori, kemampuan
alter table public.templates add column if not exists package_type text;
alter table public.templates add column if not exists categories text[] not null default '{}';
alter table public.templates add column if not exists capabilities jsonb not null default '{}'::jsonb;
alter table public.templates add column if not exists theme_key text;
update public.templates set package_type = coalesce(min_plan, 'signature') where package_type is null;
alter table public.templates alter column package_type set not null;
alter table public.templates drop constraint if exists templates_package_type_check;
alter table public.templates add constraint templates_package_type_check check (package_type in ('essential','signature','luxe'));
update public.templates t set categories = array[c.slug] from public.event_categories c where t.category_id = c.id and cardinality(t.categories) = 0;
alter table public.templates drop constraint if exists templates_published_needs_category;
alter table public.templates add constraint templates_published_needs_category check (status <> 'published' or cardinality(categories) > 0) not valid;
create index if not exists templates_pkg_idx on public.templates (package_type, status);

-- kategori otomatis diturunkan dari category_id bila admin hanya mengisi kategori tunggal
create or replace function public.templates_sync_cat() returns trigger language plpgsql as $$
begin
  if cardinality(new.categories) = 0 and new.category_id is not null then
    select array[slug] into new.categories from public.event_categories where id = new.category_id;
    new.categories := coalesce(new.categories, '{}');
  end if;
  return new;
end $$;
drop trigger if exists templates_sync_cat_trg on public.templates;
create trigger templates_sync_cat_trg before insert or update on public.templates for each row execute function public.templates_sync_cat();

----------------------------------------------------------------------------- 2. Template awal: satu tema, tiga jenis paket (aset gambar yang sama, tanpa duplikasi)
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, theme_key, status, sort, capabilities) values
 ('romantic-garden-2d','Romantic Garden 2D','Undangan website 2D bernuansa taman bunga blush dan lavender.','/assets/img/romantic-garden-s1.webp','/preview?demo=romantic-garden-2d','essential','{wedding,engagement}','romantic-garden','published',10,
  '{"palettes":["lavender","blush","sage","gold"],"fonts":["romantic","classic","modern"]}'),
 ('romantic-garden-3d','Romantic Garden 3D Cinematic','Film pembuka sinematik di taman bunga dengan gazebo kaca.','/assets/img/romantic-garden-s1.webp','/preview?demo=romantic-garden-3d','signature','{wedding,engagement}','romantic-garden','published',11,
  '{"scenes":[{"id":"garden-day","name":"Taman Siang"},{"id":"garden-dusk","name":"Taman Senja"},{"id":"garden-night","name":"Taman Malam"}],"camera":["orbit","dolly","crane","static"],"intro":["fade","zoom","flythrough"],"particles":["none","petals","fireflies"],"grades":["warm","cool","soft"],"objects":[{"id":"gazebo","name":"Gazebo kaca"},{"id":"flowers","name":"Rangkaian bunga"},{"id":"lanterns","name":"Lampion"},{"id":"fountain","name":"Air mancur"}]}'),
 ('romantic-garden','Romantic Garden Live Guest','Venue taman 3D tempat tamu memilih avatar dan menyapa langsung.','/assets/img/romantic-garden-s1.webp','/live/','luxe','{wedding,engagement,birthday}','romantic-garden','published',12,
  '{"scenes":[{"id":"garden-day","name":"Taman Siang"},{"id":"garden-dusk","name":"Taman Senja"},{"id":"garden-night","name":"Taman Malam"}],"areas":[{"id":"resepsi","name":"Area Resepsi"},{"id":"kuliner","name":"Area Kuliner"},{"id":"photobooth","name":"Photo Booth"},{"id":"galeri","name":"Galeri Foto"}],"avatars":[{"id":"tamu-wanita","name":"Avatar tamu wanita"},{"id":"tamu-pria","name":"Avatar tamu pria"},{"id":"pengantin","name":"Avatar pengantin"}],"decorations":[{"id":"gazebo","name":"Gazebo kaca"},{"id":"bunga","name":"Rangkaian bunga"},{"id":"lampion","name":"Lampion"},{"id":"karpet","name":"Karpet bunga"}]}'),
 ('jawa-tengah-2d','Adat Jawa Tengah 2D','Undangan website 2D dengan nuansa batik kawung dan emas.','/assets/img/jawa-tengah-s1.webp','/preview?demo=jawa-tengah-2d','essential','{wedding,engagement}','jawa-tengah','published',20,
  '{"palettes":["gold","lavender","blush","sage"],"fonts":["classic","romantic","modern"]}'),
 ('jawa-tengah-3d','Adat Jawa Tengah 3D Cinematic','Film pembuka sinematik di pendopo joglo dan pelaminan emas.','/assets/img/jawa-tengah-s1.webp','/preview?demo=jawa-tengah-3d','signature','{wedding,engagement}','jawa-tengah','published',21,
  '{"scenes":[{"id":"pendopo-day","name":"Pendopo Siang"},{"id":"pendopo-dusk","name":"Pendopo Senja"},{"id":"pendopo-night","name":"Pendopo Malam"}],"camera":["orbit","dolly","crane","static"],"intro":["fade","zoom","flythrough"],"particles":["none","petals","fireflies"],"grades":["warm","cool","soft"],"objects":[{"id":"pelaminan","name":"Pelaminan emas"},{"id":"gebyok","name":"Gebyok ukir"},{"id":"kembar-mayang","name":"Kembar mayang"},{"id":"lampu-gantung","name":"Lampu gantung"}]}'),
 ('jawa-tengah','Adat Jawa Tengah Live Guest','Pendopo joglo 3D dengan avatar kebaya dan beskap untuk tamu.','/assets/img/jawa-tengah-s1.webp','/live/jawa-tengah','luxe','{wedding,engagement}','jawa-tengah','published',22,
  '{"scenes":[{"id":"pendopo-day","name":"Pendopo Siang"},{"id":"pendopo-dusk","name":"Pendopo Senja"},{"id":"pendopo-night","name":"Pendopo Malam"}],"areas":[{"id":"resepsi","name":"Area Resepsi"},{"id":"kuliner","name":"Area Kuliner"},{"id":"photobooth","name":"Photo Booth"},{"id":"galeri","name":"Galeri Foto"}],"avatars":[{"id":"tamu-wanita","name":"Avatar kebaya"},{"id":"tamu-pria","name":"Avatar beskap"},{"id":"pengantin","name":"Avatar pengantin"}],"decorations":[{"id":"pelaminan","name":"Pelaminan emas"},{"id":"gebyok","name":"Gebyok ukir"},{"id":"kembar-mayang","name":"Kembar mayang"},{"id":"batik","name":"Karpet batik kawung"}]}')
on conflict (slug) do nothing;

----------------------------------------------------------------------------- 3. Undangan: paket yang dipilih
alter table public.invitations add column if not exists package_type text;
alter table public.invitations drop constraint if exists invitations_package_type_check;
alter table public.invitations add constraint invitations_package_type_check check (package_type is null or package_type in ('essential','signature','luxe'));
update public.invitations i set package_type = t.package_type from public.templates t where t.slug = i.template_id and i.package_type is null;
update public.invitations set package_type = plan_id where package_type is null and plan_id is not null;

----------------------------------------------------------------------------- 4. Aturan isi undangan per paket
create or replace function public.caps_ids(j jsonb) returns text[] language sql immutable as $$
  select coalesce(array_agg(case when jsonb_typeof(e) = 'string' then e #>> '{}' else e ->> 'id' end), '{}')
  from jsonb_array_elements(case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end) e
$$;

-- kunci tingkat-atas yang diizinkan per paket
create or replace function public.pkg_keys(p text) returns text[] language sql immutable as $$
  select array['names','welcome','event','photos','music','features','gift'] || case p
    when 'essential' then array['design2d','texts','sections']
    when 'signature' then array['scene','camera','anim','cinematic']
    when 'luxe' then array['scene','venue','live'] else array[]::text[] end
$$;

-- null = valid; selain itu kode galat
create or replace function public.content_issue(p_pkg text, p_caps jsonb, c jsonb) returns text
language plpgsql immutable set search_path = public as $$
declare k text; v text; x text; ok boolean;
begin
  if p_pkg is null then return null; end if;                                  -- undangan lama tanpa paket: perilaku lama
  for k in select jsonb_object_keys(c) loop
    if k <> all (public.pkg_keys(p_pkg)) then return 'konten_tidak_sesuai_paket'; end if;
  end loop;
  -- nilai pilihan harus termasuk kemampuan template
  v := c #>> '{scene,preset}';          if v is not null and p_caps ? 'scenes' and v <> all (public.caps_ids(p_caps->'scenes')) then return 'opsi_tidak_didukung'; end if;
  v := c #>> '{camera,path}';           if v is not null and p_caps ? 'camera' and v <> all (public.caps_ids(p_caps->'camera')) then return 'opsi_tidak_didukung'; end if;
  v := c #>> '{anim,intro}';            if v is not null and p_caps ? 'intro' and v <> all (public.caps_ids(p_caps->'intro')) then return 'opsi_tidak_didukung'; end if;
  v := c #>> '{anim,particles}';        if v is not null and p_caps ? 'particles' and v <> all (public.caps_ids(p_caps->'particles')) then return 'opsi_tidak_didukung'; end if;
  v := c #>> '{cinematic,grade}';       if v is not null and p_caps ? 'grades' and v <> all (public.caps_ids(p_caps->'grades')) then return 'opsi_tidak_didukung'; end if;
  v := c #>> '{design2d,palette}';      if v is not null and p_caps ? 'palettes' and v <> all (public.caps_ids(p_caps->'palettes')) then return 'opsi_tidak_didukung'; end if;
  v := c #>> '{design2d,accent}';       if v is not null and v <> '' and v !~ '^#[0-9a-fA-F]{6}$' then return 'opsi_tidak_didukung'; end if;
  v := c #>> '{design2d,font}';         if v is not null and p_caps ? 'fonts' and v <> all (public.caps_ids(p_caps->'fonts')) then return 'opsi_tidak_didukung'; end if;
  if jsonb_typeof(c #> '{scene,objects}') = 'array' and p_caps ? 'objects' then
    for x in select jsonb_array_elements_text(c #> '{scene,objects}') loop if x <> all (public.caps_ids(p_caps->'objects')) then return 'opsi_tidak_didukung'; end if; end loop;
  end if;
  if jsonb_typeof(c #> '{venue,areas}') = 'object' and p_caps ? 'areas' then
    for x in select jsonb_object_keys(c #> '{venue,areas}') loop if x <> all (public.caps_ids(p_caps->'areas')) then return 'opsi_tidak_didukung'; end if; end loop;
  end if;
  if jsonb_typeof(c #> '{venue,decorations}') = 'array' and p_caps ? 'decorations' then
    for x in select jsonb_array_elements_text(c #> '{venue,decorations}') loop if x <> all (public.caps_ids(p_caps->'decorations')) then return 'opsi_tidak_didukung'; end if; end loop;
  end if;
  if jsonb_typeof(c #> '{live,avatars}') = 'array' and p_caps ? 'avatars' then
    for x in select jsonb_array_elements_text(c #> '{live,avatars}') loop if x <> all (public.caps_ids(p_caps->'avatars')) then return 'opsi_tidak_didukung'; end if; end loop;
  end if;
  return null;
end $$;

----------------------------------------------------------------------------- 5. Buat draft: template harus cocok dengan kategori; paket mengikuti template
create or replace function public.create_invitation(p_template text, p_category text, p_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s text := lower(trim(coalesce(p_slug, ''))); ck jsonb; new_id uuid; ev text; ttl text; t public.templates;
begin
  if uid is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  if exists (select 1 from public.profiles where id = uid and status = 'suspended') then raise exception 'akun_ditangguhkan'; end if;
  if p_category is null or p_category not in ('wedding','engagement','birthday','graduation','aqiqah','seminar','corporate','other') then raise exception 'kategori_tidak_valid'; end if;
  select * into t from public.templates where slug = p_template and status = 'published';
  if not found then raise exception 'template_tidak_valid'; end if;
  if p_category <> all (t.categories) then raise exception 'kategori_tidak_cocok'; end if;
  ck := public.slug_available(s);
  if not (ck->>'ok')::boolean then raise exception '%', case ck->>'reason' when 'digunakan' then 'slug_digunakan' when 'dicadangkan' then 'slug_dicadangkan' else 'slug_tidak_valid' end; end if;
  if (select count(*) from public.invitations where user_id = uid and status = 'draft') >= 20 then raise exception 'batas_draft'; end if;
  ev := case p_category when 'wedding' then 'pernikahan' when 'engagement' then 'pertunangan' when 'birthday' then 'ulangtahun' when 'graduation' then 'wisuda' when 'aqiqah' then 'aqiqah' when 'seminar' then 'seminar' when 'corporate' then 'corporate' else 'lainnya' end;
  ttl := 'Undangan ' || case p_category when 'wedding' then 'Wedding' when 'engagement' then 'Engagement' when 'birthday' then 'Birthday' when 'graduation' then 'Graduation' when 'aqiqah' then 'Aqiqah' when 'seminar' then 'Seminar' when 'corporate' then 'Corporate' else 'Acara' end;
  begin
    insert into public.invitations (user_id, title, event_type, category, template_id, package_type, slug, status, content)
    values (uid, ttl, ev, p_category, p_template, t.package_type, s, 'draft', '{}'::jsonb) returning id into new_id;
  exception when unique_violation then raise exception 'slug_digunakan';
  end;
  return new_id;
end $$;

----------------------------------------------------------------------------- 6. Simpan draft: isi harus sesuai paket dan kemampuan template
create or replace function public.save_invitation(p_id uuid, p_title text, p_event_date date, p_content jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.invitations; u text; pref text; g jsonb; caps jsonb; iss text;
begin
  if uid is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  select * into r from public.invitations where id = p_id and user_id = uid for update;
  if not found then raise exception 'tidak_ditemukan'; end if;
  if r.status not in ('draft','aktif') or r.moderation = 'takedown' then raise exception 'tidak_dapat_diubah'; end if;
  if jsonb_typeof(p_content) <> 'object' or length(p_content::text) > 60000 then raise exception 'konten_tidak_valid'; end if;
  select capabilities into caps from public.templates where slug = r.template_id;
  iss := public.content_issue(r.package_type, coalesce(caps, '{}'::jsonb), p_content);
  if iss is not null then raise exception '%', iss; end if;
  pref := '%/storage/v1/object/public/invitation-media/' || uid::text || '/%';
  u := coalesce(p_content #>> '{photos,cover}', '');
  if u <> '' and u not like pref then raise exception 'foto_tidak_valid'; end if;
  g := p_content #> '{photos,gallery}';
  if g is not null and g <> 'null'::jsonb then
    if jsonb_typeof(g) <> 'array' or jsonb_array_length(g) > 40 then raise exception 'foto_tidak_valid'; end if;
    for u in select jsonb_array_elements_text(g) loop
      if u not like pref then raise exception 'foto_tidak_valid'; end if;
    end loop;
  end if;
  update public.invitations
     set title = left(coalesce(nullif(trim(p_title), ''), title), 160), event_date = p_event_date, content = p_content, updated_at = now()
   where id = p_id;
  return now();
end $$;

----------------------------------------------------------------------------- 7. Syarat wajib publikasi per paket
create or replace function public.publish_issues(i public.invitations, p_plan text) returns text[]
language plpgsql stable set search_path = public as $$
declare m text[] := '{}'; c jsonb := coalesce(i.content, '{}'::jsonb); lim int; g int; pkg text := coalesce(i.package_type, p_plan);
begin
  if coalesce(trim(c #>> '{names,a}'), '') = '' then m := array_append(m, 'Nama acara'::text); end if;
  if i.category in ('wedding','engagement') and coalesce(trim(c #>> '{names,b}'), '') = '' then m := array_append(m, 'Nama pasangan'::text); end if;
  if i.event_date is null then m := array_append(m, 'Tanggal acara'::text); end if;
  if coalesce(c #>> '{event,start}', '') = '' then m := array_append(m, 'Jam mulai'::text); end if;
  if coalesce(trim(c #>> '{event,venue}'), '') = '' then m := array_append(m, 'Nama lokasi'::text); end if;
  if coalesce(c #>> '{photos,cover}', '') = '' then m := array_append(m, 'Foto sampul'::text); end if;
  if pkg = 'essential' and coalesce(c #>> '{design2d,palette}', '') = '' then m := array_append(m, 'Warna undangan'::text); end if;
  if pkg = 'signature' and coalesce(c #>> '{scene,preset}', '') = '' then m := array_append(m, 'Scene 3D'::text); end if;
  if pkg = 'signature' and coalesce(c #>> '{camera,path}', '') = '' then m := array_append(m, 'Gerakan kamera'::text); end if;
  if pkg = 'luxe' and coalesce(c #>> '{scene,preset}', '') = '' then m := array_append(m, 'Scene venue'::text); end if;
  if pkg = 'luxe' and not exists (select 1 from jsonb_each_text(coalesce(c #> '{venue,areas}', '{}'::jsonb)) a where a.value = 'true') then m := array_append(m, 'Minimal satu area venue'::text); end if;
  if pkg = 'luxe' and coalesce(jsonb_array_length(case when jsonb_typeof(c #> '{live,avatars}') = 'array' then c #> '{live,avatars}' end), 0) = 0 then m := array_append(m, 'Minimal satu pilihan avatar tamu'::text); end if;
  select gallery_limit into lim from public.plans where id = pkg;
  g := case when jsonb_typeof(c #> '{photos,gallery}') = 'array' then jsonb_array_length(c #> '{photos,gallery}') else 0 end;
  if lim is not null and g > lim then m := array_append(m, ('Galeri maksimal ' || lim || ' foto untuk paket ini')::text); end if;
  return m;
end $$;

----------------------------------------------------------------------------- 8. Data publik: hanya fitur sesuai paket
create or replace function public.get_public_invitation(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i public.invitations; c jsonb := '{}'::jsonb; k text; pkg text;
begin
  select * into i from public.invitations where lower(slug) = lower(coalesce(p_slug, '')) and status = 'aktif' and moderation <> 'takedown' and expires_at > now();
  if not found then return jsonb_build_object('error', 'tidak_tersedia'); end if;
  pkg := coalesce(i.package_type, i.plan_id, 'essential');
  for k in select jsonb_object_keys(coalesce(i.content, '{}'::jsonb)) loop
    if k = any (public.pkg_keys(pkg)) then c := c || jsonb_build_object(k, i.content -> k); end if;
  end loop;
  return jsonb_build_object('title', i.title, 'template_id', i.template_id, 'category', i.category, 'event_date', i.event_date, 'package_type', pkg,
    'experience', coalesce(i.experience, case pkg when 'luxe' then 'live' when 'signature' then '3d' else '2d' end),
    'features3d', pkg in ('signature', 'luxe'), 'liveGuest', pkg = 'luxe', 'content', c, 'expires_at', i.expires_at);
end $$;

----------------------------------------------------------------------------- 9. Checkout: paket mengikuti undangan
create or replace function public.prepare_checkout(p_user uuid, p_invitation uuid, p_plan text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare i public.invitations; pl public.plans; pend public.payments; oid text; inv_id uuid; miss text[]; pay public.payments; eff text; v_email text; v_name text; cancel_order text;
begin
  select * into i from public.invitations where id = p_invitation and user_id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if exists (select 1 from public.profiles where id = p_user and status = 'suspended') then return jsonb_build_object('ok', false, 'error', 'akun_ditangguhkan'); end if;
  perform public.expire_stale_payments(p_user);
  select * into i from public.invitations where id = p_invitation;
  eff := coalesce(i.package_type, p_plan);      -- paket ditentukan saat undangan dibuat; p_plan dari klien hanya dipakai untuk undangan lama tanpa paket
  if i.moderation = 'takedown' then return jsonb_build_object('ok', false, 'error', 'tidak_dapat_dipublikasi'); end if;
  if i.status = 'aktif' and (i.expires_at is null or i.expires_at > now()) then return jsonb_build_object('ok', false, 'error', 'sudah_aktif'); end if;
  if i.status not in ('draft', 'menunggu_pembayaran') then return jsonb_build_object('ok', false, 'error', 'tidak_dapat_dipublikasi'); end if;
  select * into pl from public.plans where id = eff and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'paket_tidak_valid'); end if;
  if pl.price <= 0 then return jsonb_build_object('ok', false, 'error', 'harga_tidak_valid'); end if;
  miss := public.publish_issues(i, eff);
  if array_length(miss, 1) > 0 then return jsonb_build_object('ok', false, 'error', 'data_belum_lengkap', 'missing', to_jsonb(miss)); end if;

  select u.email into v_email from auth.users u where u.id = p_user;
  select pr.full_name into v_name from public.profiles pr where pr.id = p_user;

  select * into pend from public.payments where invitation_id = p_invitation and status = 'pending' for update;
  if found then
    if pend.plan_id = eff and pend.expires_at > now() then
      return jsonb_build_object('ok', true, 'reuse', true, 'order_id', pend.order_id, 'amount', pend.amount, 'plan_id', pend.plan_id, 'plan_name', pl.name,
        'duration_days', pend.duration_days, 'experience', pend.experience, 'snap_token', pend.snap_token, 'redirect_url', pend.redirect_url,
        'expires_at', pend.expires_at, 'title', i.title, 'email', v_email, 'name', v_name);
    end if;
    -- ganti paket: pembayaran lama dibatalkan (Edge Function juga membatalkannya di Midtrans)
    cancel_order := pend.order_id;
    update public.payments set status = 'cancelled', note = 'ganti_paket', updated_at = now() where id = pend.id;
    update public.invoices set status = 'dibatalkan' where id = pend.invoice_id and status = 'menunggu';
    insert into public.payment_events (order_id, event_key, source, transaction_status, result) values (pend.order_id, pend.order_id || '|ganti-paket', 'user', 'cancel', 'applied') on conflict do nothing;
  end if;

  oid := 'NM' || to_char(now() at time zone 'utc', 'YYMMDDHH24MISS') || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.invoices (user_id, number, description, amount, status, midtrans_order_id)
  values (p_user, 'INV-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
          'Paket ' || pl.name || ' - ' || i.title, pl.price, 'menunggu', oid) returning id into inv_id;
  insert into public.payments (order_id, user_id, invitation_id, invoice_id, plan_id, amount, duration_days, experience, status, expires_at)
  values (oid, p_user, p_invitation, inv_id, eff, pl.price, pl.duration_days, public.plan_experience(eff), 'pending', now() + interval '24 hours') returning * into pay;
  update public.invitations set status = 'menunggu_pembayaran', updated_at = now() where id = p_invitation;
  insert into public.payment_events (order_id, event_key, source, transaction_status, result) values (oid, oid || '|dibuat', 'system', 'created', 'applied') on conflict do nothing;

  return jsonb_build_object('ok', true, 'reuse', false, 'order_id', oid, 'amount', pay.amount, 'plan_id', eff, 'plan_name', pl.name, 'duration_days', pay.duration_days,
    'experience', pay.experience, 'expires_at', pay.expires_at, 'title', i.title, 'email', v_email, 'name', v_name, 'cancel_order', cancel_order);
end $$;

----------------------------------------------------------------------------- 10. Hak eksekusi (sama seperti sebelumnya)
revoke execute on function public.create_invitation(text,text,text), public.save_invitation(uuid,text,date,jsonb) from public, anon;
grant execute on function public.create_invitation(text,text,text), public.save_invitation(uuid,text,date,jsonb) to authenticated;
revoke execute on function public.prepare_checkout(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.prepare_checkout(uuid,uuid,text) to service_role;
grant execute on function public.get_public_invitation(text) to anon, authenticated;
grant execute on function public.publish_issues(public.invitations, text), public.content_issue(text,jsonb,jsonb), public.pkg_keys(text), public.caps_ids(jsonb) to authenticated, service_role;
