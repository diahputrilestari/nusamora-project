// Uji backup/restore END-TO-END pada Postgres+Storage NYATA: seed -> backup (DB terenkripsi + Storage) -> kerusakan -> restore -> verifikasi + pengukuran.
// Env tambahan: SUPABASE_DB_URL. Butuh pg_dump/pg_restore/psql (versi mayor sama dengan server) dan openssl.
import { check, info, finish, svc, mk, mkUser, login, enrollTotp, elevate, URL_, ANON, SERVICE, env } from "./lib.mjs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readdirSync, writeFileSync, statSync, mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
const DB = env("SUPABASE_DB_URL"), OPS = new URL("..", import.meta.url).pathname;
const WORK = process.env.DR_WORK || "dr-work"; rmSync(WORK, { recursive: true, force: true }); mkdirSync(WORK, { recursive: true });
writeFileSync(`${WORK}/pass.txt`, randomBytes(24).toString("hex") + "\n", { mode: 0o600 });
const sh = (cmd, args, e = {}) => { const t0 = Date.now(); const r = spawnSync(cmd, args, { env: { ...process.env, ...e }, encoding: "utf8" }); return { ms: Date.now() - t0, code: r.status, out: (r.stdout || "") + (r.stderr || "") }; };
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PW = "Uji-Sandi-Panjang#2026", stamp = Date.now().toString(36), E = (n) => `${n}.${stamp}@uji.nusamora.test`;

// ---- seed: akun, admin ber-MFA, berkas Storage
const users = []; for (let i = 0; i < 25; i++) users.push(await mkUser(E("u" + i), PW));
const adm = await mkUser(E("adm"), PW); await svc.from("admin_users").insert({ user_id: adm.id, role: "super_admin", active: true });
const A = await login(E("adm"), PW); const factor = await enrollTotp(A.c, "dr");
await svc.from("security_settings").update({ value: true }).eq("key", "admin_mfa_required");
await svc.from("admin_users").update({ mfa_approved_at: new Date().toISOString() }).eq("user_id", adm.id);
const files = []; // {bucket,path,sha,bytes}
const up = async (bucket, path, buf, type = "image/webp") => { const r = await svc.storage.from(bucket).upload(path, buf, { contentType: type, upsert: true }); if (r.error) throw new Error(`upload ${bucket}/${path}: ${r.error.message}`); files.push({ bucket, path, sha: sha(buf), bytes: buf.length }); };
for (let i = 0; i < 80; i++) { const u = users[i % users.length]; await up("invitation-media", `${u.id}/foto ${i}.webp`, randomBytes(2000 + ((i * 7919) % 250000))); }
for (let i = 0; i < 10; i++) await up("invitation-media", `${users[0].id}/galeri/Foto Pernikahan (${i}).webp`, randomBytes(30000 + i * 1000));
await up("site-assets", "branding/logo uji.png", randomBytes(15000), "image/png");
const totalBytes = files.reduce((a, f) => a + f.bytes, 0);
info("seed", { akun: users.length + 1, berkas: files.length, bytes: totalBytes });

// ---- snapshot SEBELUM
const before = sh(`${OPS}backup/integrity.sh`, [DB]); writeFileSync(`${WORK}/before.txt`, before.out); check("snapshot integritas sebelum backup", before.code === 0 && before.out.split("\n").length > 20, before.out.slice(0, 300));
const count = (txt, tbl) => { const l = txt.split("\n").find((x) => x.startsWith(tbl + "|")); return l ? Number(l.split("|")[1]) : null; };
const tables = before.out.trim().split("\n").map((l) => l.split("|")[0]); const rowsBefore = before.out.trim().split("\n").reduce((a, l) => a + (Number(l.split("|")[1]) || 0), 0);

// ---- backup
const B = `${WORK}/bk`; const benv = { SUPABASE_DB_URL: DB, BACKUP_DIR: B, BACKUP_PASSPHRASE_FILE: `${WORK}/pass.txt` };
const bdb = sh(`${OPS}backup/backup-db.sh`, [], benv); check("backup DB sukses (terenkripsi)", bdb.code === 0 && /OK backup=/.test(bdb.out), bdb.out.slice(-400));
const bst = sh("node", [`${OPS}backup/backup-storage.mjs`], { SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: SERVICE, BACKUP_DIR: B }); check("backup Storage sukses", bst.code === 0 && /OK storage/.test(bst.out), bst.out.slice(-300));
const enc = readdirSync(B).find((f) => f.endsWith(".tar.enc")); const stDir = readdirSync(B).find((f) => f.startsWith("nusamora-storage"));
const manifest = JSON.parse(readFileSync(`${B}/${stDir}/MANIFEST.json`, "utf8"));
check("manifest Storage memuat semua berkas seed", manifest.files.length >= files.length, `${manifest.files.length} vs ${files.length}`);
check("enkripsi: arsip DB tidak berisi teks email pengguna", !readFileSync(`${B}/${enc}`).includes(Buffer.from("@uji.nusamora.test")));
const wrong2 = sh(`${OPS}backup/restore-db.sh`, [`${B}/${enc}`, DB, "--yes-overwrite"], { BACKUP_PASSPHRASE_FILE: `${WORK}/wrong.txt` });
check("passphrase salah -> restore ditolak SEBELUM menyentuh database", wrong2.code !== 0 && (await svc.from("profiles").select("id", { count: "exact", head: true })).count >= 26, wrong2.out.slice(-200));
// checksum: arsip rusak ditolak
const bad = `${WORK}/rusak.tar.enc`; const buf = readFileSync(`${B}/${enc}`); buf[200] ^= 0xff; writeFileSync(bad, buf); writeFileSync(`${bad}.sha256`, readFileSync(`${B}/${enc}.sha256`, "utf8").replace(/ .*/, "  rusak.tar.enc\n"));
const rb = sh(`${OPS}backup/restore-db.sh`, [bad, DB, "--yes-overwrite"], { BACKUP_PASSPHRASE_FILE: `${WORK}/pass.txt` }); check("arsip rusak ditolak oleh SHA-256", rb.code !== 0 && /FAILED|gagal|checksum/i.test(rb.out), rb.out.slice(-200));
const dirBytes = (d) => readdirSync(d, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).reduce((a, e) => a + statSync(`${e.parentPath || e.path}/${e.name}`).size, 0);
const sizes = { db_backup_bytes: statSync(`${B}/${enc}`).size, storage_backup_bytes: dirBytes(`${B}/${stDir}`) };

// ---- kerusakan (simulasi bencana pada lingkungan uji)
for (const f of files.filter((_, i) => i % 5 !== 0)) await svc.storage.from(f.bucket).remove([f.path]);                // ~80% berkas hilang
for (const u of users.slice(0, 12)) await svc.auth.admin.deleteUser(u.id);                                                  // 12 akun terhapus
const dmg = sh("psql", [DB, "-v", "ON_ERROR_STOP=1", "-qc", "truncate public.security_events; update public.security_settings set value='false'"]);
const damaged = sh(`${OPS}backup/integrity.sh`, [DB]); check("kerusakan benar-benar terjadi (sidik jari berbeda)", damaged.out !== before.out, "tidak berbeda");
const left = files.filter((f) => true); let gone = 0; for (const f of files) { const d = await svc.storage.from(f.bucket).download(f.path); if (d.error) gone++; } info("kerusakan", { berkas_hilang: gone, akun_dihapus: 12 });

// ---- restore
const rdb = sh(`${OPS}backup/restore-db.sh`, [`${B}/${enc}`, DB, "--yes-overwrite"], { BACKUP_PASSPHRASE_FILE: `${WORK}/pass.txt` }); check("restore DB sukses", rdb.code === 0 && /OK restore/.test(rdb.out), rdb.out.slice(-600));
const rst = sh("node", [`${OPS}backup/restore-storage.mjs`, `${B}/${stDir}`], { SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: SERVICE }); check("restore Storage sukses (SHA-256 per berkas cocok)", rst.code === 0, rst.out.slice(-400));
const m = rst.out.match(/cocok=(\d+) gagal=(\d+)/);

// ---- verifikasi
const after = sh(`${OPS}backup/integrity.sh`, [DB]); writeFileSync(`${WORK}/after.txt`, after.out);
// security_events berisi event baru selama uji (rl, restore): bandingkan tanpa tabel yang memang berubah karena aktivitas
const strip = (t) => t.split("\n").filter((l) => !/^public\.(security_events|rate_limits)\|/.test(l)).join("\n");
const diffLines = strip(before.out).split("\n").filter((l, i) => l !== strip(after.out).split("\n")[i]);
check("integritas DB: jumlah baris & md5 isi identik untuk semua tabel (selain security_events/rate_limits)", diffLines.length === 0, diffLines.slice(0, 5).join(" || "));
const delta = {}; for (const t of tables) { const b = count(before.out, t), a = count(after.out, t); if (b !== a) delta[t] = { sebelum: b, sesudah: a }; } info("selisih jumlah baris sebelum vs sesudah", delta);
let okFiles = 0, badFiles = []; for (const f of files) { const d = await svc.storage.from(f.bucket).download(f.path); if (!d.error && sha(Buffer.from(await d.data.arrayBuffer())) === f.sha) okFiles++; else badFiles.push(f.path); }
check("semua berkas seed kembali dengan SHA-256 identik", okFiles === files.length, `${okFiles}/${files.length} ${badFiles.slice(0, 3)}`);
// relasi DB <-> berkas: setiap folder pemilik di Storage = akun yang ada; setiap berkas terdaftar di storage.objects
const owners = new Set((await svc.auth.admin.listUsers({ perPage: 1000 })).data.users.map((u) => u.id));
const objs = (await svc.schema("storage").from("objects").select("name,bucket_id").eq("bucket_id", "invitation-media")).data || [];
const orphan = objs.filter((o) => !owners.has(o.name.split("/")[0]));
check("relasi: tiap berkas invitation-media berpemilik akun yang ada setelah restore", orphan.length === 0 && objs.length >= 90, `yatim=${orphan.length} total=${objs.length}`);
const prof = await svc.from("profiles").select("id", { count: "exact", head: true }); check("profil pengguna kembali (relasi profiles<->auth.users)", prof.count >= 26, prof.count);
const st = (await svc.from("security_settings").select("value").eq("key", "admin_mfa_required").single()).data; check("pengaturan penegakan MFA kembali ke true", st?.value === true, JSON.stringify(st));
// fungsional: admin masih bisa login + TOTP lama masih valid (mfa_factors dipulihkan)
let fx = null; try { const A2 = await login(E("adm"), PW); const tok = await elevate(A2.c, factor); const me = (await A2.c.rpc("my_admin")).data; fx = me.mfa; check("admin: login password lama + TOTP lama masih valid setelah restore", me.mfa.aal === "aal2" && me.mfa.needed === false, JSON.stringify(me.mfa)); } catch (e) { check("admin: login + TOTP setelah restore", false, e.message); }
const cust = await mk().auth.signInWithPassword({ email: E("u20"), password: PW }); check("pelanggan yang tidak dihapus tetap bisa login", !cust.error, cust.error?.message);
const del = await mk().auth.signInWithPassword({ email: E("u3"), password: PW }); check("akun yang dihapus sebelum bencana dipulihkan & bisa login", !del.error, del.error?.message);
const metrics = { waktu_detik: { backup_db: bdb.ms / 1000, backup_storage: bst.ms / 1000, restore_db: rdb.ms / 1000, restore_storage: rst.ms / 1000, total_pemulihan: (rdb.ms + rst.ms) / 1000 }, ukuran_byte: sizes, data_seed: { tabel: tables.length, total_baris: rowsBefore, berkas: files.length, byte_berkas: totalBytes }, berkas_dipulihkan: { sukses: okFiles, dari: files.length, restore_storage_cocok: m ? Number(m[1]) : null, restore_storage_gagal: m ? Number(m[2]) : null }, selisih_baris: delta, selisih_sidik_jari: diffLines.length };
console.log("METRIK " + JSON.stringify(metrics, null, 1)); writeFileSync("stack-results/dr-metrics.json", JSON.stringify(metrics, null, 1));
finish();
