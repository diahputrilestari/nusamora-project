// Membaca log Edge Function staging lewat Management API (token proyek). Hanya metadata + pesan log fungsi; tanpa header/body.
const ref = process.env.PROJECT_REF, tok = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !tok) { console.error("PROJECT_REF / SUPABASE_ACCESS_TOKEN kosong"); process.exit(2); }
const end = new Date(), start = new Date(end - 6 * 3600e3);
async function q(sql) {
  const u = new URL(`https://api.supabase.com/v1/projects/${ref}/analytics/endpoints/logs.all`);
  u.searchParams.set("sql", sql); u.searchParams.set("iso_timestamp_start", start.toISOString()); u.searchParams.set("iso_timestamp_end", end.toISOString());
  const r = await fetch(u, { headers: { Authorization: "Bearer " + tok } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 300) }; }
  return { status: r.status, j };
}
const edge = await q(`select id, function_edge_logs.timestamp, response.status_code as status, request.method as method, request.pathname as path, m.execution_time_ms as ms from function_edge_logs cross join unnest(metadata) as m cross join unnest(m.request) as request cross join unnest(m.response) as response order by timestamp desc limit 60`);
console.log("EDGE status API:", edge.status);
for (const x of (edge.j.result || [])) console.log("EDGE", new Date(x.timestamp / 1000).toISOString(), x.method, x.path, x.status, x.ms + "ms");
if (!edge.j.result) console.log(JSON.stringify(edge.j).slice(0, 400));
const fl = await q(`select timestamp, event_message from function_logs order by timestamp desc limit 60`);
console.log("FNLOG status API:", fl.status);
for (const x of (fl.j.result || [])) console.log("FNLOG", new Date(x.timestamp / 1000).toISOString(), String(x.event_message).slice(0, 220));
