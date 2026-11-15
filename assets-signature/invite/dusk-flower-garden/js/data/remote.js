import { wedding } from './wedding.config.js';
import { experienceStore } from '../stores/experience.js';
export const remote = {
    mode: 'demo',
    slug: '',
    rsvp: false,
    wishes: false,
    countdown: true,
    gift: { accounts: [], address: '' },
};
const TZ = {
    WIB: { off: '+07:00', iana: 'Asia/Jakarta' },
    WITA: { off: '+08:00', iana: 'Asia/Makassar' },
    WIT: { off: '+09:00', iana: 'Asia/Jayapura' },
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILLER_TITLES = ['Awal Kisah', 'Perjalanan Kami', 'Menuju Hari Bahagia', 'Selamanya'];
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v, n = 400) => (v == null ? '' : String(v).trim().slice(0, n));
const url = (v) => {
    const u = str(v, 600);
    return /^https:\/\//i.test(u) || /^\/(?!\/)/.test(u) ? u : '';
};
function loadScript(src) {
    return new Promise((res) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => res();
        s.onerror = () => res();
        document.head.appendChild(s);
    });
}
function ownerToken(base) {
    try {
        const ref = (base.match(/^https:\/\/([^.]+)\./) || [])[1];
        if (!ref)
            return '';
        let s = JSON.parse(localStorage.getItem('sb-' + ref + '-auth-token') || 'null');
        if (s && s.currentSession)
            s = s.currentSession;
        return (s && s.access_token) || '';
    }
    catch {
        return '';
    }
}
/** Supabase REST helper used by the guest panel too. */
export function api() {
    const C = window.NM_CONFIG || {};
    const base = String(C.SUPABASE_URL || '').replace(/\/$/, '');
    const key = String(C.SUPABASE_ANON_KEY || '');
    const rpc = async (fn, body) => {
        if (!base || !key)
            throw new Error('config');
        const r = await fetch(`${base}/rest/v1/rpc/${fn}`, {
            method: 'POST',
            headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const j = await r.json();
        if (!r.ok)
            throw new Error((j && (j.message || j.error)) || 'http_' + r.status);
        return j;
    };
    return { base, key, rpc };
}
function fail(title, text, href, label) {
    document.body.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;background:#120d0a;color:#e8d3a1;font:15px system-ui,sans-serif;text-align:center;padding:24px"><div><h1 style="font-weight:600;font-size:22px;margin:0 0 8px">${title}</h1><p style="margin:0 0 18px;color:#c9b88c">${text}</p><a style="color:#e8d3a1" href="${href}">${label}</a></div></div>`;
}
const two = (n) => String(n).padStart(2, '0');
function addHours(local, h) {
    const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m)
        return local;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + h, +m[5]));
    return `${d.getUTCFullYear()}-${two(d.getUTCMonth() + 1)}-${two(d.getUTCDate())}T${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
}
const dateFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtDate = (ymd) => dateFmt.format(new Date(`${ymd}T00:00:00Z`));
/** Map the dashboard's `invitations.content` onto the shared wedding config. */
export function applyContent(content, meta) {
    const c = obj(content);
    const names = obj(c.names), cp = obj(c.couple), ph = obj(c.photos), ev = obj(c.event), tx = obj(c.texts);
    const ft = obj(c.features), cam = obj(c.camera), music = obj(c.music), gf = obj(c.gift);
    const w = wedding;
    // ---- couple
    const person = (side, nick, fallback) => {
        const p = obj(cp[side]);
        const ig = str(p.ig, 40).replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '');
        const target = w[side];
        target.nickname = nick || fallback;
        target.fullName = str(p.full, 120) || nick || fallback;
        target.parentsLabel = str(p.parents, 200);
        target.father = '';
        target.mother = '';
        target.instagram = /^[A-Za-z0-9._]{1,30}$/.test(ig) ? '@' + ig : '';
        target.photo = url(ph[side]);
    };
    person('bride', str(names.a, 80), 'Mempelai Wanita');
    person('groom', str(names.b, 80), 'Mempelai Pria');
    w.nameOrder = cp.order === 'wanita' ? 'bride-first' : 'groom-first';
    // ---- date and events
    const base = /^\d{4}-\d{2}-\d{2}$/.test(meta.eventDate || '')
        ? meta.eventDate
        : new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10);
    const mainTz = TZ[str(ev.tz, 8)] ? str(ev.tz, 8) : 'WIB';
    const mk = (e, fallbackTitle) => {
        const tzName = TZ[str(e.tz, 8)] ? str(e.tz, 8) : mainTz;
        const date = /^\d{4}-\d{2}-\d{2}$/.test(str(e.date, 10)) ? str(e.date, 10) : base;
        const st = /^\d{2}:\d{2}$/.test(str(e.start, 5)) ? str(e.start, 5) : '08:00';
        const en = /^\d{2}:\d{2}$/.test(str(e.end, 5)) ? str(e.end, 5) : '';
        const start = `${date}T${st}`;
        return {
            title: str(e.name, 60) || fallbackTitle,
            start,
            end: en ? `${date}T${en}` : addHours(start, 2),
            dateLabel: fmtDate(date),
            timeLabel: `${st.replace(':', '.')}${en ? ' – ' + en.replace(':', '.') : ''} ${tzName}`,
            venue: str(e.venue, 120),
            address: str(e.address, 400),
            mapsUrl: url(e.maps),
        };
    };
    w.ceremony = mk(ev, 'Acara Pernikahan');
    const extra = arr(c.events).map((e) => mk(obj(e), 'Acara')).find((e) => e.venue || e.title !== 'Acara');
    // an empty second event is skipped by the captions (see eventsHtml in preview/ui.ts)
    w.reception = extra || { title: '', start: w.ceremony.start, end: w.ceremony.end, dateLabel: '', timeLabel: '', venue: '', address: '', mapsUrl: '' };
    w.timezone = TZ[mainTz].iana;
    w.weddingDateISO = `${w.ceremony.start}:00${TZ[mainTz].off}`;
    w.weddingDateLabel = fmtDate(base).replace(', ', ' · ');
    const parts = w.ceremony.address.split(',').map((s) => s.trim()).filter(Boolean);
    w.location = { city: parts.length > 1 ? parts[parts.length - 2] : parts[0] || '', region: parts.length > 1 ? parts[parts.length - 1] : '' };
    // ---- story: the film has a fixed number of chapters (one easel each)
    const slots = Math.max(w.story.length, 1);
    const chapters = arr(c.story)
        .map((s) => obj(s))
        .filter((s) => str(s.title) || str(s.text))
        .slice(0, slots);
    w.story = Array.from({ length: slots }, (_, i) => {
        const s = chapters[i];
        return s
            ? { year: str(s.date, 40), title: str(s.title, 80), text: str(s.text, 600), image: url(s.photo) }
            : { year: '', title: FILLER_TITLES[i % FILLER_TITLES.length], text: '', image: '' };
    });
    // ---- photos
    w.couplePhoto = url(ph.cover);
    w.gallery = arr(ph.gallery).map(url).filter(Boolean).slice(0, 40);
    // ---- texts (empty = keep the theme's own copy)
    const welcome = str(tx.opening, 300) || str(c.welcome, 300);
    if (welcome)
        w.text.introInvite = welcome;
    if (str(tx.quote, 500))
        w.text.introVerse = str(tx.quote, 500);
    w.text.introVerseSource = str(tx.quote, 500) ? str(tx.quoteSource, 80) : w.text.introVerseSource;
    if (str(tx.closing, 600))
        w.text.closingText = str(tx.closing, 600);
    // ---- experience
    const speed = Number(cam.speed);
    if (speed >= 1 && speed <= 10)
        w.experience.autoplayDwell = 12 - speed; // 1 = slow (11 s) … 10 = fast (2 s)
    if (music.enabled === false)
        experienceStore.setState({ muted: true });
    // ---- guest features
    const accounts = [gf, ...arr(c.accounts)]
        .map((a) => obj(a))
        .map((a) => ({ bank: str(a.bank, 40), number: str(a.number, 40), holder: str(a.holder, 80) }))
        .filter((a) => a.number);
    remote.rsvp = ft.rsvp !== false;
    remote.wishes = ft.guestbook !== false;
    remote.countdown = ft.countdown !== false;
    remote.gift = ft.gift ? { accounts, address: str(gf.address, 300) } : { accounts: [], address: '' };
    const a = w.bride.nickname, b = w.groom.nickname;
    document.title = `${w.nameOrder === 'bride-first' ? a : b} & ${w.nameOrder === 'bride-first' ? b : a} · Undangan Pernikahan`;
}
/**
 * Resolve the invitation to show. Returns false when the page was replaced by an
 * error screen (boot must stop); true for demo and for a successfully loaded invitation.
 */
export async function loadRemote() {
    const q = new URLSearchParams(location.search);
    if (q.get('demo'))
        return true;
    const preview = q.get('preview') || '';
    const slug = (q.get('slug') || '').toLowerCase();
    if (!(UUID.test(preview) || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)))
        return true; // no invitation requested: sample data
    await loadScript('/assets/config.js');
    const { base, key, rpc } = api();
    if (!base || !key) {
        fail('Belum siap', 'Konfigurasi layanan undangan belum lengkap.', '/', 'Ke NusaMora');
        return false;
    }
    try {
        if (UUID.test(preview)) {
            const tk = ownerToken(base);
            if (!tk) {
                fail('Masuk dulu', 'Pratinjau undangan hanya bisa dibuka oleh pemiliknya.', '/masuk?next=' + encodeURIComponent(location.pathname + location.search), 'Masuk');
                return false;
            }
            const r = await fetch(`${base}/rest/v1/invitations?id=eq.${encodeURIComponent(preview)}&select=title,slug,event_date,content`, {
                headers: { apikey: key, Authorization: `Bearer ${tk}` },
            });
            const rows = await r.json();
            const row = Array.isArray(rows) ? rows[0] : null;
            if (!row)
                throw new Error('tidak_tersedia');
            remote.mode = 'preview';
            remote.slug = str(row.slug, 60);
            applyContent(row.content, { title: str(row.title, 160), eventDate: row.event_date });
        }
        else {
            const r = await rpc('get_public_invitation', { p_slug: slug });
            if (!r || r.error)
                throw new Error('tidak_tersedia');
            remote.mode = 'live';
            remote.slug = slug;
            applyContent(r.content, { title: str(r.title, 160), eventDate: r.event_date });
        }
        return true;
    }
    catch (e) {
        const m = e.message || '';
        if (/fetch|network|Failed/i.test(m))
            fail('Tidak bisa terhubung', 'Periksa koneksi internet Anda, lalu muat ulang halaman ini.', location.href, 'Muat ulang');
        else
            fail('Undangan tidak ditemukan', 'Undangan ini belum dipublikasikan, sudah berakhir masa aktifnya, atau alamatnya salah ketik.', '/', 'Ke NusaMora');
        return false;
    }
}
