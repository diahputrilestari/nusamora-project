// Uji perlindungan aset di stack Supabase NYATA (Storage + PostgREST + RLS): bucket tidak bisa didaftar, aset berbayar privat,
// otorisasi premium_asset_path, signed URL (berlaku lalu kedaluwarsa). Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
import { check, info, finish, svc, mk, mkUser, login, URL_, sleep } from "./lib.mjs";
const PW = "Uji-Sandi-Panjang#2026", stamp = Date.now().toString(36);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const GLB = Buffer.from("glTF-uji-" + stamp);
const up = (b, p, bytes, type) => svc.storage.from(b).upload(p, bytes, { contentType: type, upsert: true });
const code = async (u, init) => { try { return (await fetch(u, init)).status; } catch { return 0; } };
const pub = (b, p) => `${URL_}/storage/v1/object/public/${b}/${p}`;

const A = await mkUser(`cp.a.${stamp}@uji.nusamora.test`, PW), B = await mkUser(`cp.b.${stamp}@uji.nusamora.test`, PW);
const LA = await login(`cp.a.${stamp}@uji.nusamora.test`, PW), LB = await login(`cp.b.${stamp}@uji.nusamora.test`, PW), anon = mk();
const files = { "invitation-media": `${A.id}/a-${stamp}.png`, "site-assets": `cp/s-${stamp}.png`, "theme-assets": `cp/t-${stamp}.png` };
for (const [b, p] of Object.entries(files)) check(`unggah objek uji ke ${b}`, !(await up(b, p, PNG, "image/png")).error);

// ---- 1. bucket publik: URL objek tetap jalan, tetapi tidak bisa didaftar
for (const [b, p] of Object.entries(files)) check(`${b}: URL publik objek tetap 200 (halaman tamu tidak rusak)`, (await code(pub(b, p))) === 200);
for (const [b, p] of Object.entries(files)) {
  const folder = p.includes("/") ? p.split("/")[0] : "";
  const r = await anon.storage.from(b).list(folder, { limit: 100 });
  check(`${b}: anon TIDAK bisa mendaftar objek (enumerasi)`, !!r.error || (r.data || []).length === 0, JSON.stringify(r.data?.length ?? r.error?.message));
  const r2 = await anon.storage.from(b).list("", { limit: 100 }); check(`${b}: anon tidak bisa mendaftar root`, !!r2.error || (r2.data || []).length === 0, JSON.stringify(r2.data?.length));
}
{ const own = await LA.c.storage.from("invitation-media").list(A.id); check("pemilik bisa mendaftar folder SENDIRI (fitur unggah/galeri)", !own.error && (own.data || []).some((x) => x.name === files["invitation-media"].split("/")[1]), JSON.stringify(own.error));
  const other = await LB.c.storage.from("invitation-media").list(A.id); check("pengguna lain TIDAK bisa mendaftar folder pemilik", !!other.error || (other.data || []).length === 0, JSON.stringify(other.data?.length));
  const up2 = await LB.c.storage.from("invitation-media").upload(`${A.id}/x-${stamp}.png`, PNG, { contentType: "image/png" }); check("pengguna lain tidak bisa menulis ke folder pemilik", !!up2.error);
  const up3 = await LA.c.storage.from("invitation-media").upload(`${A.id}/b-${stamp}.png`, PNG, { contentType: "image/png", upsert: false }); check("pemilik tetap bisa mengunggah ke folder sendiri (upsert=false, seperti flow.js)", !up3.error, up3.error?.message); }
{ const t = await LA.c.storage.from("theme-assets").list("cp"); check("pelanggan biasa tidak bisa mendaftar theme-assets", !!t.error || (t.data || []).length === 0); }

// ---- 2. aset berbayar: bucket privat
const pp = `premium/luxe/m-${stamp}.glb`;
check("unggah aset berbayar ke bucket privat", !(await up("premium-assets", pp, GLB, "model/gltf-binary")).error);
check("URL publik aset berbayar TIDAK dilayani", (await code(pub("premium-assets", pp))) !== 200, String(await code(pub("premium-assets", pp))));
{ const s1 = await anon.storage.from("premium-assets").createSignedUrl(pp, 60); check("anon tidak bisa membuat signed URL sendiri", !!s1.error || !s1.data?.signedUrl);
  const s2 = await LA.c.storage.from("premium-assets").createSignedUrl(pp, 60); check("pelanggan login biasa tidak bisa membuat signed URL sendiri", !!s2.error || !s2.data?.signedUrl);
  const d1 = await LA.c.storage.from("premium-assets").download(pp); check("pelanggan biasa tidak bisa mengunduh langsung", !!d1.error); }

// ---- 3. otorisasi premium_asset_path (service_role saja)
const cat = (await svc.from("asset_categories").select("id").eq("slug", "guest-avatar").eq("package_type", "luxe").single()).data.id;
const mkAsset = async (name, path, ext, pkgs = ["luxe"]) => (await svc.from("assets").insert({ name, category_id: cat, package_types: pkgs, file_path: path, file_url: pub("premium-assets", path), file_type: ext, file_size: 100, status: "active" }).select("id").single());
const aPrem = await mkAsset("Premium " + stamp, pp, "glb"), aPub = await mkAsset("Publik " + stamp, `cp/pub-${stamp}.webp`, "webp"), aOther = await mkAsset("Premium lain " + stamp, `premium/luxe/o-${stamp}.glb`, "glb");
check("aset uji dibuat", !aPrem.error && !aPub.error && !aOther.error, [aPrem.error, aPub.error, aOther.error].map((e) => e?.message).filter(Boolean).join("|"));
const tp = async (slug, status = "published") => (await svc.from("templates").insert({ slug, name: "Tpl " + slug, status, package_type: "luxe" }).select("id").single()).data.id;
const t1 = await tp("cp-t1-" + stamp), t2 = await tp("cp-t2-" + stamp);
for (const [t, a] of [[t1, aPrem.data.id], [t1, aPub.data.id], [t2, aOther.data.id]]) await svc.from("template_assets").insert({ template_id: t, slot_key: "avatar_male", asset_id: a, position: Math.floor(Math.random() * 900) + 1 });
const inv = async (slug, o = {}) => (await svc.from("invitations").insert({ user_id: A.id, title: "CP " + slug, category: "wedding", template_id: "cp-t1-" + stamp, package_type: "luxe", plan_id: "luxe", slug, status: "aktif", expires_at: new Date(Date.now() + 864e5).toISOString(), event_date: new Date().toISOString().slice(0, 10), content: {}, ...o }).select("id").single());
const iOk = await inv("cp-ok-" + stamp), iDraft = await inv("cp-draft-" + stamp, { status: "draft" }), iExp = await inv("cp-exp-" + stamp, { expires_at: new Date(Date.now() - 864e5).toISOString() });
const iEss = await inv("cp-ess-" + stamp, { package_type: "essential", plan_id: "essential" }), iOtherTpl = await inv("cp-othertpl-" + stamp, { template_id: "cp-t2-" + stamp });
check("undangan uji dibuat", [iOk, iDraft, iExp, iEss, iOtherTpl].every((x) => !x.error), [iOk, iDraft, iExp, iEss, iOtherTpl].map((x) => x.error?.message).filter(Boolean).join("|"));
const pap = async (slug, asset) => (await svc.rpc("premium_asset_path", { p_slug: slug, p_asset: asset })).data;
check("undangan aktif + paket cocok + aset dipetakan -> path", (await pap("cp-ok-" + stamp, aPrem.data.id)) === pp);
check("undangan draft -> tidak ada akses", (await pap("cp-draft-" + stamp, aPrem.data.id)) === null);
check("undangan kedaluwarsa -> tidak ada akses", (await pap("cp-exp-" + stamp, aPrem.data.id)) === null);
check("paket Essential tidak boleh mengakses aset khusus Luxe", (await pap("cp-ess-" + stamp, aPrem.data.id)) === null);
check("aset template LAIN (tidak dipetakan ke template undangan) -> tidak ada akses", (await pap("cp-ok-" + stamp, aOther.data.id)) === null);
check("aset non-premium (publik) tidak dilayani lewat jalur ini", (await pap("cp-ok-" + stamp, aPub.data.id)) === null);
check("slug tidak dikenal -> tidak ada akses", (await pap("cp-nope-" + stamp, aPrem.data.id)) === null);
for (const [n, c] of [["anon", anon], ["pelanggan login", LA.c]]) { const r = await c.rpc("premium_asset_path", { p_slug: "cp-ok-" + stamp, p_asset: aPrem.data.id }); check(`${n} TIDAK boleh memanggil premium_asset_path langsung`, !!r.error && /permission denied/i.test(r.error.message), r.error?.message); }

// ---- 4. get_template_assets tidak membocorkan URL aset berbayar
{ const g = await anon.rpc("get_template_assets", { p_slug: "cp-t1-" + stamp }); const as = g.data?.assets || [];
  const prem = as.find((x) => x.asset_id === aPrem.data.id), pubA = as.find((x) => x.name === "Publik " + stamp);
  check("RPC publik: aset berbayar url=null + premium=true (tanpa bocoran lokasi)", !!prem && prem.url === null && prem.premium === true && !JSON.stringify(g.data).includes(pp), JSON.stringify(prem));
  check("RPC publik: aset biasa tetap mengembalikan url", !!pubA && /^https?:\/\//.test(pubA.url) && pubA.premium === false, JSON.stringify(pubA)); }

// ---- 5. signed URL: berlaku, tidak bisa dipalsukan, lalu kedaluwarsa
{ const s = await svc.storage.from("premium-assets").createSignedUrl(pp, 3); check("service_role membuat signed URL", !!s.data?.signedUrl, s.error?.message);
  const ok = await fetch(s.data.signedUrl); const body = Buffer.from(await ok.arrayBuffer());
  check("signed URL valid -> 200 dengan isi yang benar", ok.status === 200 && body.equals(GLB), String(ok.status));
  check("token dipalsukan -> ditolak", (await code(s.data.signedUrl.replace(/token=[^&]+/, "token=palsu"))) !== 200);
  await sleep(4500); check("signed URL kedaluwarsa setelah TTL -> ditolak", (await code(s.data.signedUrl)) !== 200, String(await code(s.data.signedUrl))); }

// ---- bersih-bersih
await svc.from("invitations").delete().in("slug", ["ok", "draft", "exp", "ess", "othertpl"].map((x) => `cp-${x}-${stamp}`));
await svc.from("template_assets").delete().in("template_id", [t1, t2]); await svc.from("templates").delete().in("id", [t1, t2]);
await svc.from("assets").delete().in("id", [aPrem.data.id, aPub.data.id, aOther.data.id].filter(Boolean));
for (const [b, p] of Object.entries(files)) await svc.storage.from(b).remove([p]);
await svc.storage.from("invitation-media").remove([`${A.id}/b-${stamp}.png`]); await svc.storage.from("premium-assets").remove([pp]);
await svc.auth.admin.deleteUser(A.id).catch(() => {}); await svc.auth.admin.deleteUser(B.id).catch(() => {});
finish();
