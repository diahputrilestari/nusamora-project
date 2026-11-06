// Memastikan id.json dan en.json punya kunci yang sama persis (tidak ada terjemahan yang tertinggal).
import { readFileSync } from "node:fs";
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
const id = new Set(flat(JSON.parse(readFileSync(new URL("../messages/id.json", import.meta.url), "utf8"))));
const en = new Set(flat(JSON.parse(readFileSync(new URL("../messages/en.json", import.meta.url), "utf8"))));
const onlyId = [...id].filter((k) => !en.has(k)), onlyEn = [...en].filter((k) => !id.has(k));
if (onlyId.length || onlyEn.length) { console.error("Kunci tidak sinkron\n id saja:", onlyId, "\n en saja:", onlyEn); process.exit(1); }
console.log(`OK: ${id.size} kunci sama di id.json dan en.json`);
