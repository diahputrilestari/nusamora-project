// Uji Cari Teman Kondangan pada stack Supabase NYATA (GoTrue + PostgREST + Realtime): JWT sungguhan, balapan paralel, Realtime.
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Data uji dihapus di akhir.
import { check, info, finish, svc, mkUser, login, sleep } from "./lib.mjs";
const PW = "Uji-Sandi-Panjang#2026", stamp = Date.now().toString(36), N = 8;
const ymd = (yrs) => { const d = new Date(); d.setFullYear(d.getFullYear() - yrs); return d.toISOString().slice(0, 10); };
const rpc = async (c, name, args = {}) => { const r = await c.rpc(name, args); return { data: r.data, err: r.error?.message || "" }; };

// ---- data dasar: pemilik Luxe + undangan aktif, N peserta
const owner = await mkUser(`dt.owner.${stamp}@uji.nusamora.test`, PW);
const inv = await svc.from("invitations").insert({ user_id: owner.id, title: "Uji Dating " + stamp, category: "wedding", slug: "dt-" + stamp, status: "aktif", plan_id: "luxe",
  expires_at: new Date(Date.now() + 30 * 864e5).toISOString(), event_date: new Date().toISOString().slice(0, 10), content: {} }).select("id").single();
check("undangan Luxe aktif dibuat", !inv.error, inv.error?.message);
const O = await login(`dt.owner.${stamp}@uji.nusamora.test`, PW);
check("pemilik menyalakan fitur (batas like 50)", !(await rpc(O.c, "dating_owner_set_event", { p_inv: inv.data.id, p_enabled: true, p_like_limit: 50 })).err);
const users = [];
for (let i = 0; i < N; i++) {
  const email = `dt.u${i}.${stamp}@uji.nusamora.test`; const u = await mkUser(email, PW); const L = await login(email, PW);
  const c1 = await rpc(L.c, "dating_accept_consent", { p_age: true, p_single: true, p_privacy: true });
  const pr = await rpc(L.c, "dating_upsert_profile", { p_nickname: "Tamu" + i, p_birth_date: ymd(24 + i), p_gender: i % 2 ? "wanita" : "pria", p_city: "Solo", p_avatar: null, p_bio: "bio " + i, p_interests: ["musik"], p_education: null, p_occupation: null, p_intent: "teman_baru" });
  const jn = await rpc(L.c, "dating_join", { p_inv: inv.data.id });
  users.push({ ...L, id: u.id, email, profile: pr.data?.profile_id, err: c1.err || pr.err || jn.err });
}
check("semua peserta: consent + profil + join berhasil", users.every((u) => !u.err && u.profile), users.map((u) => u.err).filter(Boolean).join("|"));

// ---- PostgREST + JWT: pengguna tidak bisa membaca/menulis langsung data orang lain
{ const [a, b] = users;
  const sel = await a.c.from("dating_profiles").select("id,user_id"); check("profil: pengguna hanya melihat miliknya sendiri lewat API", (sel.data || []).length === 1 && sel.data[0].user_id === a.id, JSON.stringify(sel.data?.length));
  const ins = await a.c.from("dating_likes").insert({ invitation_id: inv.data.id, from_profile: a.profile, to_profile: b.profile, kind: "like" }); check("insert langsung ke dating_likes ditolak", !!ins.error, JSON.stringify(ins.error));
  const upd = await a.c.from("dating_profiles").update({ nickname: "Hack" }).eq("user_id", b.id); const chk = await svc.from("dating_profiles").select("nickname").eq("user_id", b.id).single();
  check("update profil orang lain via API tidak berpengaruh", chk.data.nickname === "Tamu1", JSON.stringify(upd.error));
  const as = await a.c.from("dating_event_settings").select("*"); check("pengaturan acara tidak bisa dibaca langsung", !!as.error || (as.data || []).length === 0, JSON.stringify(as.data?.length));
  const dis = await rpc(a.c, "dating_discover", { p_inv: inv.data.id, p_filter: {}, p_limit: 20, p_offset: 0 });
  const keys = new Set((dis.data || []).flatMap((r) => Object.keys(r)));
  check("discover: tidak memuat data sensitif, tidak menyertakan diri sendiri", !dis.err && dis.data.length === N - 1 && !["birth_date", "user_id", "email", "whatsapp"].some((k) => keys.has(k)) && dis.data.every((r) => r.profile_id !== a.profile), dis.err + [...keys].join(","));
  const anon = (await import("./lib.mjs")).mk(); const ar = await rpc(anon, "dating_discover", { p_inv: inv.data.id }); check("anon tidak bisa discover", !!ar.err, ar.err); }

// ---- BALAPAN: like saling-silang paralel tidak boleh menghasilkan 0 atau >1 match
{ const pairs = []; for (let i = 0; i + 1 < N; i += 2) pairs.push([users[i], users[i + 1]]);
  for (let round = 0; round < 1; round++) {
    const res = await Promise.all(pairs.flatMap(([a, b]) => [rpc(a.c, "dating_like", { p_inv: inv.data.id, p_to: b.profile }), rpc(b.c, "dating_like", { p_inv: inv.data.id, p_to: a.profile })]));
    check("like silang paralel: tidak ada galat", res.every((r) => !r.err), res.map((r) => r.err).filter(Boolean).join("|"));
  }
  const ms = await svc.from("dating_matches").select("profile_a,profile_b").eq("invitation_id", inv.data.id);
  check(`balapan: tepat 1 match per pasangan (${pairs.length} pasangan)`, (ms.data || []).length === pairs.length, "match=" + (ms.data || []).length);
  const mids = (await svc.from("dating_matches").select("id").eq("invitation_id", inv.data.id)).data.map((x) => x.id);
  const cv = await svc.from("dating_conversations").select("id,match_id").in("match_id", mids); const sm = await svc.from("dating_messages").select("id").eq("kind", "system").in("conversation_id", (cv.data || []).map((x) => x.id));
  check("tepat 1 percakapan + 1 pesan sistem per match", (cv.data || []).length === pairs.length && (sm.data || []).length === pairs.length, `conv=${cv.data?.length} sys=${sm.data?.length}`);
  // like ganda paralel dari pengguna yang sama: tetap satu baris
  const [a, , c3] = [users[0], users[1], users[2]];
  const dup = await Promise.all(Array.from({ length: 6 }, () => rpc(users[2].c, "dating_like", { p_inv: inv.data.id, p_to: users[4].profile })));
  const lk = await svc.from("dating_likes").select("id").eq("from_profile", users[2].profile).eq("to_profile", users[4].profile);
  check("like ganda paralel menghasilkan 1 baris", (lk.data || []).length === 1 && dup.every((r) => !r.err), (lk.data || []).length + " " + dup.map((r) => r.err).join("|")); }

// ---- REALTIME: pesan sampai ke lawan bicara; non-anggota tidak menerima
{ const A = users[0], B = users[1], C = users[2];
  const m = await rpc(A.c, "dating_my_matches"); const conv = m.data?.[0]?.conversation_id;
  check("daftar match memuat percakapan", !m.err && !!conv, m.err);
  const got = { B: [], C: [], D: [] };
  const sub = (cl, tag, tok) => new Promise((res) => { cl.realtime.setAuth(tok); const ch = cl.channel("dating-" + tag + stamp).on("postgres_changes", { event: "INSERT", schema: "public", table: "dating_messages" }, (p) => got[tag].push(p.new?.body)).subscribe((st) => { if (st === "SUBSCRIBED") res(ch); if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") res(null); }); setTimeout(() => res(null), 15000); });
  const chB = await sub(B.c, "B", B.token), chC = await sub(C.c, "C", C.token);
  // D = service_role (melewati RLS): bila D menerima tetapi B tidak => masalah evaluasi RLS di Realtime; bila D juga tidak => publikasi/WAL
  const chD = await sub(svc, "D", process.env.SUPABASE_SERVICE_ROLE_KEY);
  check("Realtime: langganan terhubung (stack nyata dengan layanan Realtime)", !!chB && !!chC, "B=" + !!chB + " C=" + !!chC);
  if (chB && chC) {
    await sleep(1500);
    const s = await rpc(A.c, "dating_send_message", { p_conversation: conv, p_body: "Halo realtime 😊" });
    check("kirim pesan via RPC", !s.err, s.err);
    for (let i = 0; i < 20 && !got.B.length; i++) await sleep(500);
    info("Realtime diagnosis: D(service_role, tanpa RLS) menerima?", { D: got.D, B: got.B });
    check("Realtime: lawan bicara menerima pesan", got.B.includes("Halo realtime 😊"), JSON.stringify(got.B));
    await sleep(1500); check("Realtime: non-anggota TIDAK menerima pesan (RLS)", got.C.length === 0, JSON.stringify(got.C));
    await B.c.removeChannel(chB); await C.c.removeChannel(chC); if (chD) await svc.removeChannel(chD); } }

// ---- otorisasi & rate limit lewat API nyata
{ const A = users[0], C = users[2]; const m = await rpc(A.c, "dating_my_matches"); const conv = m.data?.[0]?.conversation_id;
  const r = await rpc(C.c, "dating_send_message", { p_conversation: conv, p_body: "intip" }); check("non-anggota tidak bisa mengirim ke percakapan orang lain", r.err === "tidak_ditemukan", r.err);
  const msgs = await C.c.from("dating_messages").select("id").eq("conversation_id", conv); check("non-anggota tidak bisa membaca pesan percakapan orang lain lewat API", !msgs.error && (msgs.data || []).length === 0, JSON.stringify(msgs.data?.length) + (msgs.error?.message || ""));
  const own = await C.c.from("dating_messages").select("id,conversation_id"); info("C hanya melihat pesan percakapan miliknya", { baris: (own.data || []).length, semuaMilikSendiri: (own.data || []).every((m) => m.conversation_id !== conv) });
  const bad = await rpc(A.c, "dating_like", { p_inv: inv.data.id, p_to: A.profile }); check("like diri sendiri ditolak", bad.err === "target_tidak_valid", bad.err);
  let limited = ""; for (let i = 0; i < 40 && !limited; i++) { const x = await rpc(A.c, "dating_send_message", { p_conversation: conv, p_body: "spam " + i }); if (x.err) limited = x.err; }
  check("rate limit pesan aktif (30/menit)", limited === "terlalu_banyak_permintaan", limited); }

// ---- bersih-bersih
for (const u of users) await svc.auth.admin.deleteUser(u.id).catch(() => {});
await svc.auth.admin.deleteUser(owner.id).catch(() => {});
await svc.from("dating_reports").delete().eq("invitation_id", inv.data.id);
finish();
