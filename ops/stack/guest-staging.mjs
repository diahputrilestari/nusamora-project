// Uji sisi tamu pada STAGING NYATA lewat PostgREST + kunci anon (tanpa login: tidak bergantung pada CAPTCHA Auth).
// Data disiapkan dengan service_role (undangan aktif/draft + tamu), semua dihapus di akhir. Pemilik-RPC (butuh JWT) diuji di CI lokal.
import { check, finish, svc, mkUser, URL_, ANON } from "./lib.mjs";
const PW = "Uji-Sandi-Panjang#2026", stamp = Date.now().toString(36);
const call = async (fn, args, key = ANON) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` }, body: JSON.stringify(args) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { } return { ok: r.ok, status: r.status, j, t }; };
const owner = await mkUser(`gt.owner.${stamp}@uji.nusamora.test`, PW);
const mkInv = async (slug, status) => (await svc.from("invitations").insert({ user_id: owner.id, title: "Uji Tamu " + slug, category: "wedding", slug: `gt-${slug}-${stamp}`, status, plan_id: "signature",
  expires_at: new Date(Date.now() + 30 * 864e5).toISOString(), event_date: new Date().toISOString().slice(0, 10), content: {} }).select("id").single());
const a = await mkInv("a", "aktif"), d = await mkInv("d", "draft"); check("undangan aktif & draft dibuat", !a.error && !d.error, a.error?.message || d.error?.message);
const cleanup = async () => { await svc.from("invitations").delete().in("id", [a.data?.id, d.data?.id].filter(Boolean)); await svc.auth.admin.deleteUser(owner.id); };
if (a.error || d.error) { await cleanup(); finish(); }
const g1 = await svc.from("invitation_guests").insert({ invitation_id: a.data.id, name: "Budi <b>Santoso</b>", phone: "081234567890" }).select("id,token").single();
const gd = await svc.from("invitation_guests").insert({ invitation_id: d.data.id, name: "Tamu Draft" }).select("id,token").single();
check("tamu uji dibuat (service_role)", !g1.error && !gd.error, g1.error?.message || gd.error?.message);
const T = g1.data?.token, TD = gd.data?.token;
check("token opaque 32 hex", /^[0-9a-f]{32}$/.test(T), T);
const anonAdd = await call("guest_add", { p_inv: a.data.id, p_name: "Anon" }); check("anon tidak bisa guest_add", !anonAdd.ok, anonAdd.status);
const anonRead = await fetch(`${URL_}/rest/v1/invitation_guests?select=token`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }); check("anon tidak bisa membaca tabel tamu/token via REST", !anonRead.ok || (await anonRead.json()).length === 0, anonRead.status);
// sisi tamu persis seperti assets/guest.js (nama parameter p_token, p_status, p_pax, p_message, p_action, p_detail)
const op = await call("guest_open", { p_token: T }); check("guest_open (anon): nama tamu dikembalikan", op.ok && op.j?.name === "Budi <b>Santoso</b>", op.t);
check("guest_open token acak: null, tidak error", (await call("guest_open", { p_token: "f".repeat(32) })).j === null);
check("guest_open undangan draft: null", (await call("guest_open", { p_token: TD })).j === null);
const rs = await call("guest_rsvp", { p_token: T, p_status: "hadir", p_pax: 3, p_message: "Siap" }); check("guest_rsvp (anon) berhasil", rs.ok && rs.j === true, rs.t);
const rs2 = await call("guest_rsvp", { p_token: T, p_status: "tidak_hadir", p_pax: 1, p_message: null }); check("RSVP diubah (upsert), bukan ganda", rs2.ok && (await svc.from("invitation_rsvps").select("id").eq("invitation_id", a.data.id)).data.length === 1);
const badSt = await call("guest_rsvp", { p_token: T, p_status: "mungkin", p_pax: 1, p_message: null }); check("status liar ditolak server", !badSt.ok && /status_tidak_valid/.test(badSt.t), badSt.t);
const w = await call("guest_wish", { p_token: T, p_message: "Selamat <script>1</script>" }); check("guest_wish (anon) berhasil", w.ok && w.j === true, w.t);
const lv = await call("live_log", { p_token: T, p_action: "reaksi", p_detail: "❤" }); check("live_log (anon) berhasil", lv.ok && lv.j === true, lv.t);
check("live_log aksi liar ditolak", !(await call("live_log", { p_token: T, p_action: "hapus", p_detail: null })).ok);
const cnt = async (t) => (await svc.from(t).select("id", { count: "exact", head: true }).eq("invitation_id", a.data.id)).count;
check("data tercatat di DB: 1 RSVP, 1 ucapan, 1 aktivitas live", (await cnt("invitation_rsvps")) === 1 && (await cnt("guestbook_entries")) === 1 && (await cnt("live_guest_events")) === 1);
const cg = (await svc.from("invitations").select("guest_count,wish_count").eq("id", a.data.id).single()).data; check("penghitung undangan tersinkron (guest_count=1, wish_count=1)", cg?.guest_count === 1 && cg?.wish_count === 1, JSON.stringify(cg));
const pub = await call("get_public_invitation", { p_slug: `gt-a-${stamp}` }); check("get_public_invitation (anon) mengembalikan undangan aktif", pub.ok && pub.j?.title === `Uji Tamu a` && !JSON.stringify(pub.j).includes(T), pub.t.slice(0, 200));
const pd = await call("get_public_invitation", { p_slug: `gt-d-${stamp}` }); check("get_public_invitation draft: error tidak_tersedia, tanpa judul/isi", pd.ok && pd.j?.error === "tidak_tersedia" && !pd.j?.title && !pd.j?.content, pd.t.slice(0, 200));
await cleanup();
const left = (await svc.from("invitations").select("id", { count: "exact", head: true }).in("id", [a.data.id, d.data.id])).count; check("data uji bersih", left === 0, left);
finish();
