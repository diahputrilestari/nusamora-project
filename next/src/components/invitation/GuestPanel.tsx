"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Panel tamu: RSVP + ucapan lewat RPC publik berbasis token (backend/guest-schema.sql).
 * - Tanpa token sah di ?t= : tidak menampilkan apa pun dan TIDAK memanggil server.
 * - Hanya kunci anon (publik); validasi, batas laju, dan otorisasi ada di server.
 * - Semua teks dirender sebagai teks oleh React (tidak ada dangerouslySetInnerHTML).
 */
const TOKEN_RE = /^[0-9a-f]{32}$/;
type Status = "hadir" | "tidak_hadir" | "ragu";
type Note = { text: string; bad: boolean } | null;

async function rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("tidak_dikonfigurasi");
  const r = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST", credentials: "omit", headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` }, body: JSON.stringify(args),
  });
  const body: unknown = await r.json().catch(() => null);
  if (!r.ok) throw new Error(((body as { message?: string } | null)?.message) ?? "gagal");
  return body;
}

export function GuestPanel({ rsvp, guestbook }: { rsvp: boolean; guestbook: boolean }) {
  const t = useTranslations("invitation");
  const q = useSearchParams().get("t") ?? "";
  const token = TOKEN_RE.test(q) ? q : "";
  const [phase, setPhase] = useState<"idle" | "ok" | "invalid">("idle");
  const [name, setName] = useState("");
  const opened = useRef("");

  const [status, setStatus] = useState<Status>("hadir");
  const [pax, setPax] = useState(1);
  const [note, setNote] = useState("");
  const [rNote, setRNote] = useState<Note>(null);
  const [rBusy, setRBusy] = useState(false);
  const [wish, setWish] = useState("");
  const [wNote, setWNote] = useState<Note>(null);
  const [wBusy, setWBusy] = useState(false);

  useEffect(() => {
    if (!token || opened.current === token) return;
    opened.current = token; // cegah panggilan ganda (StrictMode) yang menggandakan hitungan "dibuka"
    let live = true;
    rpc("guest_open", { p_token: token }).then(
      (j) => { if (!live) return; const n = (j as { name?: unknown } | null)?.name; if (typeof n === "string" && n) { setName(n); setPhase("ok"); } else setPhase("invalid"); },
      () => { if (live) setPhase("invalid"); },
    );
    return () => { live = false; };
  }, [token]);

  if (!token) return null;
  if (phase === "idle") return null;
  if (phase === "invalid") return <p role="status" className="mt-10 text-red-800" data-testid="tamu-tidak-berlaku">{t("invalidLink")}</p>;

  const err = (e: unknown): Note => {
    const m = e instanceof Error ? e.message : "";
    return { text: m.includes("terlalu_banyak_permintaan") ? t("tooMany") : t("failed"), bad: true };
  };
  const sendRsvp = async (e: FormEvent) => {
    e.preventDefault(); setRBusy(true); setRNote({ text: t("sending"), bad: false });
    try {
      const ok = await rpc("guest_rsvp", { p_token: token, p_status: status, p_pax: status === "hadir" ? pax : 1, p_message: note.trim() || null });
      setRNote(ok === true ? { text: t("rsvpThanks"), bad: false } : { text: t("linkNotValid"), bad: true });
    } catch (x) { setRNote(err(x)); } finally { setRBusy(false); }
  };
  const sendWish = async (e: FormEvent) => {
    e.preventDefault(); const m = wish.trim();
    if (!m) { setWNote({ text: t("wishEmpty"), bad: true }); return; }
    setWBusy(true); setWNote({ text: t("sending"), bad: false });
    try {
      const ok = await rpc("guest_wish", { p_token: token, p_message: m });
      if (ok === true) { setWish(""); setWNote({ text: t("wishThanks"), bad: false }); } else setWNote({ text: t("linkNotValid"), bad: true });
    } catch (x) { setWNote(err(x)); } finally { setWBusy(false); }
  };

  const card = "mt-6 rounded-2xl border border-soft-lilac bg-white p-5 text-left shadow-sm";
  const field = "mt-1 w-full rounded-xl border border-soft-lilac bg-white px-3 py-2.5 text-midnight";
  const btn = "mt-4 inline-flex min-h-11 items-center rounded-full bg-deep px-6 py-2.5 font-semibold text-white disabled:opacity-60";
  const msg = (n: Note) => (n ? <p role="status" aria-live="polite" className={`mt-3 text-sm ${n.bad ? "text-red-800" : "text-green-800"}`}>{n.text}</p> : null);

  return (
    <section className="mt-12" data-testid="tamu-panel" aria-label={t("guestSection")}>
      <h2 className="text-2xl font-bold text-royal" data-testid="tamu-sapaan">{t("greeting", { name })}</h2>
      <p className="mt-2 text-muted-purple">{t("intro")}</p>

      {rsvp ? (
        <form className={card} onSubmit={sendRsvp} noValidate>
          <h3 className="text-lg font-bold text-royal">{t("rsvpTitle")}</h3>
          <fieldset className="mt-3">
            <legend className="text-sm font-semibold text-midnight">{t("rsvpQuestion")}</legend>
            {(["hadir", "tidak_hadir", "ragu"] as const).map((s) => (
              <label key={s} className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-soft-lilac px-3 py-2.5">
                <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="size-5 accent-deep" />
                <span>{t(s === "hadir" ? "attending" : s === "tidak_hadir" ? "declining" : "unsure")}</span>
              </label>
            ))}
          </fieldset>
          {status === "hadir" ? (
            <label className="mt-4 block text-sm font-semibold text-midnight">{t("guests")}
              <select className={field} value={pax} onChange={(e) => setPax(Number(e.target.value))}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{t("guestsOption", { count: n })}</option>)}
              </select>
            </label>
          ) : null}
          <label className="mt-4 block text-sm font-semibold text-midnight">{t("note")}
            <textarea className={field} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="submit" className={btn} disabled={rBusy}>{t("sendRsvp")}</button>
          {msg(rNote)}
        </form>
      ) : null}

      {guestbook ? (
        <form className={card} onSubmit={sendWish} noValidate>
          <h3 className="text-lg font-bold text-royal">{t("wishTitle")}</h3>
          <label className="mt-3 block text-sm font-semibold text-midnight">{t("wishLabel")}
            <textarea className={field} rows={3} maxLength={500} value={wish} onChange={(e) => setWish(e.target.value)} />
          </label>
          <button type="submit" className={btn} disabled={wBusy}>{t("sendWish")}</button>
          {msg(wNote)}
        </form>
      ) : null}
    </section>
  );
}
