import { experienceStore } from '../stores/experience.js';
import { api, remote } from '../data/remote.js';
/**
 * Guest panel for a real invitation (?slug= / ?preview=): RSVP, guestbook and digital gift,
 * backed by the same RPCs as the 2D invitation (submit_rsvp, submit_wish, list_wishes).
 * In preview mode nothing is written (same as the 2D preview). Hidden in demo mode.
 */
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const CSS = `
.gp-btn{position:fixed;left:max(14px,env(safe-area-inset-left,0px));bottom:calc(max(14px,env(safe-area-inset-bottom,0px)) + 58px);z-index:60;padding:10px 16px;border-radius:999px;border:1px solid rgba(232,211,161,.55);background:rgba(18,13,10,.72);color:#f1e2bd;font:600 13px system-ui,sans-serif;letter-spacing:.04em;backdrop-filter:blur(6px);cursor:pointer}
.gp-btn:hover{background:rgba(18,13,10,.9)}
.gp-wrap{position:fixed;inset:0;z-index:80;display:grid;place-items:end center;background:rgba(10,7,5,.55)}
.gp-wrap[hidden]{display:none}
.gp{width:min(520px,100%);max-height:88vh;overflow:auto;background:#1a130e;color:#f1e2bd;border:1px solid rgba(232,211,161,.35);border-radius:18px 18px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));font:14px/1.5 system-ui,sans-serif}
@media(min-width:620px){.gp-wrap{place-items:center}.gp{border-radius:18px}}
.gp h2{margin:0;font-size:17px;font-weight:600}
.gp-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.gp-x{background:none;border:0;color:inherit;font-size:24px;line-height:1;cursor:pointer}
.gp-tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
.gp-tabs button{padding:7px 14px;border-radius:999px;border:1px solid rgba(232,211,161,.4);background:none;color:inherit;font:inherit;cursor:pointer}
.gp-tabs button[aria-selected=true]{background:#e8d3a1;color:#1a130e;font-weight:600}
.gp label{display:block;margin:10px 0 4px;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#cdb98a}
.gp input,.gp textarea,.gp select{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid rgba(232,211,161,.35);background:#120d0a;color:inherit;font:inherit}
.gp .go{margin-top:14px;width:100%;padding:12px;border:0;border-radius:10px;background:#e8d3a1;color:#1a130e;font:600 14px system-ui,sans-serif;cursor:pointer}
.gp .go:disabled{opacity:.6}
.gp .msg{margin-top:10px;font-size:13px;min-height:18px}
.gp .msg.bad{color:#ff9d8a}
.gp ul{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:10px}
.gp li{padding:10px 12px;border:1px solid rgba(232,211,161,.2);border-radius:10px}
.gp li b{display:block}
.gp li small{color:#cdb98a}
.gp .acc{display:flex;justify-content:space-between;gap:10px;align-items:center}
.gp .acc code{font-size:15px;letter-spacing:.04em}
.gp .cp{padding:6px 12px;border-radius:999px;border:1px solid rgba(232,211,161,.5);background:none;color:inherit;font:inherit;cursor:pointer}
`;
const ERR = {
    nama_wajib: 'Nama wajib diisi.',
    kehadiran_tidak_valid: 'Pilih konfirmasi kehadiran.',
    fitur_nonaktif: 'Fitur ini dimatikan oleh pemilik undangan.',
    tidak_tersedia: 'Undangan tidak tersedia.',
    batas_tercapai: 'Batas jumlah tamu sudah tercapai.',
};
export function mountGuestPanel(host) {
    if (remote.mode === 'demo')
        return;
    const tabs = [];
    if (remote.rsvp)
        tabs.push(['rsvp', 'Konfirmasi kehadiran']);
    if (remote.wishes)
        tabs.push(['wish', 'Ucapan']);
    if (remote.gift.accounts.length || remote.gift.address)
        tabs.push(['gift', 'Hadiah digital']);
    if (!tabs.length)
        return;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const guest = experienceStore.getState().guestName || '';
    const local = [];
    host.insertAdjacentHTML('beforeend', `<button class="gp-btn" id="gpOpen" hidden>${tabs.some((t) => t[0] === 'rsvp') ? 'RSVP &amp; Ucapan' : 'Ucapan &amp; Hadiah'}</button>
     <div class="gp-wrap" id="gpWrap" hidden><div class="gp" role="dialog" aria-modal="true" aria-label="Tamu undangan">
       <div class="gp-h"><h2 id="gpTitle"></h2><button class="gp-x" id="gpClose" aria-label="Tutup">&times;</button></div>
       <div class="gp-tabs" role="tablist">${tabs.map((t, i) => `<button role="tab" data-t="${t[0]}" aria-selected="${i === 0}">${t[1]}</button>`).join('')}</div>
       <div id="gpBody"></div>
     </div></div>`);
    const $ = (id) => host.querySelector('#' + id);
    const open = $('gpOpen'), wrap = $('gpWrap'), body = $('gpBody'), title = $('gpTitle');
    const note = remote.mode === 'preview' ? '<p class="msg">Pratinjau: kiriman tidak disimpan.</p>' : '';
    // show the button once the film is playing
    const sync = () => {
        open.hidden = experienceStore.getState().phase !== 'playing';
    };
    experienceStore.subscribe(sync);
    sync();
    const send = async (fn, args) => {
        if (remote.mode !== 'live')
            return { ok: true, preview: true };
        return (await api().rpc(fn, args));
    };
    function rsvpView() {
        body.innerHTML = `<form id="f"><label for="n">Nama</label><input id="n" maxlength="60" value="${esc(guest)}" required>
      <label for="a">Kehadiran</label><select id="a"><option value="hadir">Hadir</option><option value="ragu">Masih ragu</option><option value="tidak">Tidak hadir</option></select>
      <div id="px"><label for="p">Jumlah tamu</label><select id="p">${Array.from({ length: 10 }, (_, i) => `<option>${i + 1}</option>`).join('')}</select></div>
      <label for="o">Catatan (opsional)</label><textarea id="o" rows="2" maxlength="300"></textarea>
      <button class="go" type="submit">Kirim konfirmasi</button><div class="msg" id="m"></div>${note}</form>`;
        const f = body.querySelector('#f');
        const sel = f.querySelector('#a');
        sel.onchange = () => (f.querySelector('#px').hidden = sel.value === 'tidak');
        f.onsubmit = async (e) => {
            e.preventDefault();
            const m = f.querySelector('#m'), b = f.querySelector('.go');
            b.disabled = true;
            m.className = 'msg';
            m.textContent = 'Mengirim...';
            try {
                const r = await send('submit_rsvp', {
                    p_slug: remote.slug,
                    p_name: f.querySelector('#n').value,
                    p_attendance: sel.value,
                    p_pax: Number(f.querySelector('#p').value),
                    p_note: f.querySelector('#o').value || null,
                });
                if (r.ok === false)
                    throw new Error(r.error || 'gagal');
                m.textContent = 'Terima kasih, konfirmasi Anda sudah kami terima.';
            }
            catch (err) {
                m.className = 'msg bad';
                m.textContent = ERR[err.message] || 'Gagal mengirim. Coba lagi sebentar lagi.';
            }
            b.disabled = false;
        };
    }
    async function wishView() {
        body.innerHTML = `<form id="f"><label for="n">Nama</label><input id="n" maxlength="60" value="${esc(guest)}" required>
      <label for="t">Ucapan dan doa</label><textarea id="t" rows="3" maxlength="500" required></textarea>
      <button class="go" type="submit">Kirim ucapan</button><div class="msg" id="m"></div>${note}</form><ul id="l"></ul>`;
        const list = body.querySelector('#l');
        const paint = (items) => {
            list.innerHTML = items.length
                ? items.map((w) => `<li><b>${esc(w.name)}</b>${esc(w.message)}</li>`).join('')
                : '<li><small>Belum ada ucapan. Jadilah yang pertama.</small></li>';
        };
        const load = async () => {
            try {
                if (remote.mode !== 'live')
                    return paint(local);
                const r = await api().rpc('list_wishes', { p_slug: remote.slug, p_before: null, p_limit: 20 });
                paint(Array.isArray(r.items) ? r.items : []);
            }
            catch {
                list.innerHTML = '<li><small>Ucapan tidak dapat dimuat sekarang.</small></li>';
            }
        };
        load();
        const f = body.querySelector('#f');
        f.onsubmit = async (e) => {
            e.preventDefault();
            const m = f.querySelector('#m'), b = f.querySelector('.go');
            const name = f.querySelector('#n').value, msg = f.querySelector('#t').value;
            b.disabled = true;
            m.className = 'msg';
            m.textContent = 'Mengirim...';
            try {
                const r = await send('submit_wish', { p_slug: remote.slug, p_name: name, p_message: msg, p_attendance: null });
                if (r.ok === false)
                    throw new Error(r.error || 'gagal');
                if (remote.mode !== 'live')
                    local.unshift({ name, message: msg });
                f.querySelector('#t').value = '';
                m.textContent = 'Terima kasih atas ucapan dan doanya.';
                load();
            }
            catch (err) {
                m.className = 'msg bad';
                m.textContent = ERR[err.message] || 'Gagal mengirim. Coba lagi sebentar lagi.';
            }
            b.disabled = false;
        };
    }
    function giftView() {
        body.innerHTML =
            '<ul>' +
                remote.gift.accounts
                    .map((a, i) => `<li class="acc"><div><b>${esc(a.bank)}</b><code>${esc(a.number)}</code><br><small>a.n. ${esc(a.holder)}</small></div><button class="cp" data-i="${i}">Salin</button></li>`)
                    .join('') +
                (remote.gift.address ? `<li><b>Kirim kado ke</b>${esc(remote.gift.address)}</li>` : '') +
                '</ul>';
        body.onclick = (e) => {
            const b = e.target.closest('.cp');
            if (!b)
                return;
            const n = remote.gift.accounts[Number(b.dataset.i)].number;
            navigator.clipboard?.writeText(n).then(() => (b.textContent = 'Tersalin'), () => (b.textContent = n));
        };
    }
    const show = (t) => {
        host.querySelectorAll('.gp-tabs button').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.t === t)));
        title.textContent = tabs.find((x) => x[0] === t)[1];
        body.onclick = null;
        if (t === 'rsvp')
            rsvpView();
        else if (t === 'wish')
            void wishView();
        else
            giftView();
    };
    host.querySelector('.gp-tabs').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-t]');
        if (b)
            show(b.dataset.t);
    });
    open.onclick = () => {
        wrap.hidden = false;
        show(tabs[0][0]);
    };
    $('gpClose').onclick = () => (wrap.hidden = true);
    wrap.addEventListener('click', (e) => {
        if (e.target === wrap)
            wrap.hidden = true;
    });
}
