import { coupleNames } from '../data/wedding.config.js';
/** Google Calendar "add event" link (opens in a new tab; no file download needed) */
export function calendarUrl(ev, cfg) {
    const fmt = (iso) => iso.replace(/[-:]/g, '').slice(0, 13) + '00';
    const [n1, n2] = coupleNames(cfg);
    const who = n2 ? `${n1} & ${n2}` : n1;
    const p = new URLSearchParams({
        action: 'TEMPLATE',
        text: `${ev.title} · ${who}`,
        dates: `${fmt(ev.start)}/${fmt(ev.end)}`,
        location: `${ev.venue}, ${ev.address}`,
        details: `${cfg.text.eyebrow} ${who}`,
        ctz: cfg.timezone,
    });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
export function countdownParts(targetISO, now = Date.now()) {
    const diff = Math.max(0, new Date(targetISO).getTime() - now);
    const s = Math.floor(diff / 1000);
    return {
        days: Math.floor(s / 86400),
        hours: Math.floor((s % 86400) / 3600),
        minutes: Math.floor((s % 3600) / 60),
        seconds: s % 60,
        done: diff === 0,
    };
}
