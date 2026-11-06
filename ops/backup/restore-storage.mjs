// Pulihkan berkas dari folder backup storage ke Supabase Storage tujuan dan verifikasi SHA-256 dari manifest.
//   node restore-storage.mjs <folder-backup>   (env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — gunakan proyek NON-PRODUKSI untuk simulasi)
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
const dir = process.argv[2], url = (process.env.SUPABASE_URL || "").replace(/\/$/, ""), key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!dir || !url || !key) { console.error("pakai: node restore-storage.mjs <folder>; env SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY"); process.exit(2); }
const H = { Authorization: `Bearer ${key}`, apikey: key };
const { files } = JSON.parse(await readFile(join(dir, "MANIFEST.json"), "utf8")); let ok = 0, bad = 0;
for (const f of files) {
  const buf = await readFile(join(dir, f.bucket, f.path)), enc = f.path.split("/").map(encodeURIComponent).join("/");
  if (createHash("sha256").update(buf).digest("hex") !== f.sha256) { console.error("CHECKSUM backup rusak:", f.path); bad++; continue; }
  const r = await fetch(`${url}/storage/v1/object/${f.bucket}/${enc}`, { method: "POST", headers: { ...H, "x-upsert": "true", "Content-Type": "application/octet-stream" }, body: buf });
  if (!r.ok) { console.error("gagal unggah", f.path, r.status); bad++; continue; }
  const back = Buffer.from(await (await fetch(`${url}/storage/v1/object/${f.bucket}/${enc}`, { headers: H })).arrayBuffer());
  if (createHash("sha256").update(back).digest("hex") === f.sha256) ok++; else { console.error("hasil restore berbeda:", f.path); bad++; }
}
console.log(`restore storage: cocok=${ok} gagal=${bad}`); process.exit(bad ? 1 : 0);
