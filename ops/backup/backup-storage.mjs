// Backup berkas Supabase Storage (semua bucket) + manifest SHA-256. Node >= 20.
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (hanya dari environment; jangan commit), BACKUP_DIR
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
const url = (process.env.SUPABASE_URL || "").replace(/\/$/, ""), key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !key) { console.error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi"); process.exit(2); }
const root = join(process.env.BACKUP_DIR || "./backups", `nusamora-storage-${new Date().toISOString().replace(/[:.-]/g, "").slice(0, 15)}Z`);
const H = { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" };
const api = async (p, o = {}) => { const r = await fetch(url + p, { ...o, headers: { ...H, ...(o.headers || {}) } }); if (!r.ok) throw new Error(`${p} -> ${r.status}`); return r; };
async function walk(bucket, prefix = "") {
  const out = []; let offset = 0;
  for (;;) {
    const rows = await (await api(`/storage/v1/object/list/${bucket}`, { method: "POST", body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: "name", order: "asc" } }) })).json();
    for (const e of rows) { const p = prefix ? `${prefix}/${e.name}` : e.name; if (e.id === null) out.push(...await walk(bucket, p)); else out.push(p); }
    if (rows.length < 100) return out; offset += 100;
  }
}
const manifest = []; let bytes = 0;
for (const b of await (await api("/storage/v1/bucket")).json()) {
  for (const p of await walk(b.name)) {
    const resp = await api(`/storage/v1/object/${b.name}/${p.split("/").map(encodeURIComponent).join("/")}`);
    const contentType = (resp.headers.get("content-type") || "application/octet-stream").split(";")[0];
    const buf = Buffer.from(await resp.arrayBuffer());
    const f = join(root, b.name, p); await mkdir(dirname(f), { recursive: true }); await writeFile(f, buf);
    manifest.push({ bucket: b.name, path: p, contentType, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") }); bytes += buf.length;
  }
}
await writeFile(join(root, "MANIFEST.json"), JSON.stringify({ createdAt: new Date().toISOString(), files: manifest }, null, 1));
console.log(`OK storage berkas=${manifest.length} ukuran=${bytes}B folder=${root}`);
