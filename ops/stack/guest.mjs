// Uji kontrak modul tamu publik pada stack Supabase NYATA: assets/guest.js memanggil RPC lewat fetch + kunci anon.
// Memastikan nama parameter JS = SQL, hak eksekusi anon/pemilik, dan isolasi lewat PostgREST sungguhan. Data uji dihapus di akhir.
import { check, finish, svc, mkUser, login, URL_, ANON } from "./lib.mjs";
const PW = "Uji-Sandi-Panjang#2026", stamp = Date.now().toString(36);
const call = async (fn, args, key = ANON) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` }, body: JSON.stringify(args) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { } return { ok: r.ok, status: r.status, j, t }; };

const owner = await mkUser(`gt.owner.${stamp}@uji.nusamora.test`, PW), other = await mkUser(`gt.other.${stamp}@uji.nusamora.test`, PW);
const mkInv = async (slug, status) => (await svc.from("invitations").insert({ user_id: owner.id, title: "Uji Tamu " + slug, category: "wedding", slug: `gt-${slug}-${stamp}`, status, plan_id: "signature",
  expires_at: new Date(Date.now() + 30 * 864e5).toISOString(), event_date: new Date().toISOString().slice(0, 10), content: {} }).select("id").single());
const a = await mkInv("a", "aktif"), d = await mkInv("d", "draft"); check("undangan aktif & draft dibuat", !a.error && !d.error, a.error?.message || d.error?.message);
const O = await login(`gt.owner.${stamp}@uji.nusamora.test`, PW), X = await login(`gt.other.${stamp}@uji.nusamora.test`, PW);

// pemilik menambah tamu lewat API (JWT sungguhan)
const g1 = await O.c.rpc("guest_add", { p_inv: a.data.id, p_name: "Budi <b>Santoso</b>", p_phone: "0812-3456-7890" }); check("pemilik: guest_add berhasil", !g1.error && g1.data, g1.error?.message);
const gd = await O.c.rpc("guest_add", { p_inv: d.data.id, p_name: "Tamu Draft" });
const xAdd = await X.c.rpc("guest_add", { p_inv: a.data.id, p_name: "Penyusup" }); check("orang lain tidak bisa menambah tamu ke undangan ini", !!xAdd.error && /tidak_ditemukan/.test(xAdd.error.message), xAdd.error?.message);
const anonAdd = await call("guest_add", { p_inv: a.data.id, p_name: "Anon" }); check("anon tidak bisa guest_add (HTTP 401/403/404)", !anonAdd.ok, anonAdd.status);
const tokRow = await svc.from("invitation_guests").select("token").eq("id", g1.data).single(); const T = tokRow.data.token; const TD = (await svc.from("invitation_guests").select("token").eq("id", gd.data).single()).data.token;
check("token opaque 32 hex", /^[0-9a-f]{32}$/.test(T), T);
const anonRead = await fetch(`${URL_}/rest/v1/invitation_guests?select=token`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }); check("anon tidak bisa membaca tabel tamu/token via REST", !anonRead.ok || (await anonRead.json()).length === 0, anonRead.status);
const xRead = await X.c.from("invitation_guests").select("token"); check("pengguna lain tidak melihat tamu orang lain", (xRead.data || []).length === 0 && !xRead.error, xRead.error?.message);

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
const s = await O.c.rpc("guest_stats", { p_inv: a.data.id }); check("statistik pemilik mencerminkan aktivitas tamu", !s.error && s.data.total === 1 && s.data.dibuka === 1 && s.data.rsvp === 1 && s.data.tidak_hadir === 1 && s.data.ucapan === 1, JSON.stringify(s.data || s.error));
const lr = await O.c.from("live_guest_events").select("action,guest_name"); const wr = await O.c.from("guestbook_entries").select("message"); check("pemilik membaca ucapan & aktivitas lewat API", (lr.data || []).length === 1 && (wr.data || []).length === 1);
check("pengguna lain tidak melihat ucapan/aktivitas", ((await X.c.from("guestbook_entries").select("id")).data || []).length === 0 && ((await X.c.from("live_guest_events").select("id")).data || []).length === 0);

// bersihkan
await svc.from("invitations").delete().in("id", [a.data.id, d.data.id]); await svc.auth.admin.deleteUser(owner.id); await svc.auth.admin.deleteUser(other.id);
finish();
