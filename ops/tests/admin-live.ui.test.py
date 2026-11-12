# Uji UI admin: Live Guest: monitoring ruangan, venue builder, interaksi, mini game, moderasi chat, analitik, pengaturan, izin, mobile.
# Backend ditiru di browser (window.supabase stub) hanya untuk menguji antarmuka; logika data diuji di ops/tests/admin-live.test.sql.
import http.server, socketserver, threading, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]; p = {"/admin": "/admin.html", "/akun": "/akun.html"}.get(p, p)
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
def newpage(b, vw=1280, role="super_admin", perms=None):
    ctx = b.new_context(viewport={"width": vw, "height": 900}, accept_downloads=True); errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    pg.add_init_script("sessionStorage.setItem('__role', %s);sessionStorage.setItem('__perms', %s)" % (json.dumps(json.dumps(role)), json.dumps(json.dumps(perms or []))))
    return ctx, pg, errs
def txt(pg, sel="#view"): return pg.inner_text(sel)

STUB = r"""window.__calls=[];window.__out=0;
var ROLE=JSON.parse(sessionStorage.getItem('__role'));
var PERMS=ROLE==='super_admin'?['dashboard.read','live.read','live.write','live.delete']:['dashboard.read','live.read'];
var NOW=Date.now(),H=36e5,iso=function(n){return new Date(NOW+n*H).toISOString()};
var FAIL=null,SET={enabled:true,music:true,qris:true,gallery:true,guestbook:true,default_theme:'romantic-garden',max_guests:300};
var VEN=[{id:'v1',key:'romantic-garden',name:'Romantic Garden',template:'romantic-garden',background_url:null,areas:[{id:'stage',name:'Main Stage',x:0,z:-7,icon:'🏠',enabled:true},{id:'buku',name:'Buku Ucapan',x:0,z:8,icon:'📖',enabled:false}],max_guests:300,active:true,sort:1,rooms:1},{id:'v2',key:'jawa-tengah',name:'Adat Jawa Tengah',template:'jawa-tengah',background_url:null,areas:[],max_guests:300,active:true,sort:2,rooms:0}];
var ROOMS=[];for(var i=0;i<30;i++)ROOMS.push({id:'i'+i,title:i===0?'Raka <img src=x onerror=window.__xss=1> Sinta':'Undangan '+i,public_url:'/u/'+i,status:i===1?'closed':'open',chat_mode:i===0?'moderated':'open',max_guests:i===0?50:null,slow_seconds:3,venue_id:i===0?'v1':null,venue:i===0?'Romantic Garden':null,online:30-i,events_24h:i,chat_pending:i===0?2:0,mutes:i===0?1:0});
var INTER=[{key:'sapa',label:'Sapa',emoji:'👋',kind:'sapa',enabled:true,cooldown_seconds:5,sort:1,uses_7d:12},{key:'cinta',label:'Cinta',emoji:'❤️',kind:'reaksi',enabled:false,cooldown_seconds:2,sort:2,uses_7d:3}];
var GAMES=[{id:'g1',key:'kuis',name:'Kuis Pengantin',kind:'trivia',enabled:true,points_max:100,config:{questions:[{q:'Warna favorit?',options:['Merah','Biru'],answer:1}]},sort:1,players:4,plays:9},{id:'g2',key:'tap',name:'Tap Cepat',kind:'tap',enabled:false,points_max:50,config:{seconds:20},sort:2,players:0,plays:0}];
var CHAT=[{id:'c1',invitation_id:'i0',guest_id:'g1',guest_name:'Budi',body:'Halo <b>semua</b>',status:'pending',auto_flag:null,note:null,created_at:iso(-1),moderated_at:null,invitation:'Raka Sinta'},{id:'c2',invitation_id:'i0',guest_id:'g2',guest_name:'Ani',body:'klik https://spam.example',status:'hidden',auto_flag:'tautan',note:null,created_at:iso(-2),moderated_at:null,invitation:'Raka Sinta'},{id:'c3',invitation_id:'i0',guest_id:'g3',guest_name:'Cici',body:'Selamat!',status:'visible',auto_flag:null,note:null,created_at:iso(-3),moderated_at:null,invitation:'Raka Sinta'}];
var WORDS=['kasar'];
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function ret(d){return FAIL?Promise.resolve({data:null,error:FAIL}):ok(d)}
function qb(t){var o={};['select','order','range','or','in','gte','lte','lt','gt','neq','ilike','contains','not','is','limit','eq'].forEach(function(m){o[m]=function(){return o}});o.maybeSingle=function(){return o};o.then=function(a,b){return Promise.resolve({data:[],error:null}).then(a,b)};return o}
window.supabase={createClient:function(){return{
 from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:ROLE,perms:PERMS,mfa:{needed:false}});
  if(n==='admin_role_labels')return ok({super_admin:'Super Admin',admin:'Admin'});
  if(n==='admin_session_ping')return ok({ok:true,tracked:true});
  if(n==='admin_live_overview')return ok({enabled:SET.enabled,online_now:55,rooms_live:3,rooms_closed:1,joins_24h:80,chat_pending:2,chat_flagged_24h:5,mutes_active:1,games_enabled:1,venues_active:2});
  if(n==='admin_live_rooms'){var r=ROOMS.filter(function(x){return!a.p_q||x.title.toLowerCase().indexOf(a.p_q.toLowerCase())>-1});return ok({total:r.length,rows:r.slice(a.p_offset,a.p_offset+a.p_limit)})}
  if(n==='admin_live_venues')return ok(VEN);
  if(n==='admin_live_guests')return ok({online:[{guest_id:'g1',name:'Budi',last_seen:iso(-0.01),mute:null},{guest_id:'g2',name:'Ani',last_seen:iso(-0.02),mute:'mute'}],mutes:[{guest_id:'g2',name:'Ani',kind:'mute',until:iso(1),reason:'Spam'}]});
  if(n==='admin_live_interactions')return ok(INTER);
  if(n==='admin_live_games')return ok(GAMES);
  if(n==='admin_live_game_scores')return ok([{name:'Budi',score:100,plays:2,invitation:'Raka Sinta'}]);
  if(n==='admin_live_chat'){var c=CHAT.filter(function(x){return(!a.p_status||x.status===a.p_status)&&(!a.p_q||x.body.toLowerCase().indexOf(a.p_q.toLowerCase())>-1)});return ok({total:c.length,rows:c})}
  if(n==='admin_live_words')return ok(WORDS);
  if(n==='admin_live_analytics')return ok({joins:80,unique_guests:60,rooms:3,interactions:40,chat_total:30,chat_hidden:4,game_plays:9,daily:[{day:'2026-11-01',joins:30,interactions:10},{day:'2026-11-02',joins:50,interactions:30}],by_interaction:[{key:'sapa',label:'Sapa',n:25}],top_rooms:[{title:'Raka Sinta',joins:70,guests:50}]});
  if(n==='admin_live_settings_get')return ok(SET);
  if(n==='admin_live_settings_save'){if(!FAIL)Object.assign(SET,a.p_vals);return ret(null)}
  if(['admin_live_room_set','admin_live_mute','admin_live_unmute','admin_live_kick','admin_live_chat_mod','admin_live_word_set','admin_live_venue_save','admin_live_venue_delete','admin_live_interaction_save','admin_live_interaction_delete','admin_live_game_save','admin_live_game_delete','admin_live_cleanup'].indexOf(n)>-1)return ret(null);
  return ok([])},
 functions:{invoke:function(){return Promise.resolve({data:null,error:null})}},
 storage:{from:function(){return{}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'tok',user:{id:'u1',email:'adm@uji.test'}}}})},signOut:function(){window.__out++;return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""

def calls(pg, n): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == n]
def go(pg, tab, sel): pg.goto(BASE + "/admin#live:" + tab); pg.wait_for_selector(sel, timeout=15000)
def noscroll(pg): return pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
def confirm(pg): pg.wait_for_selector("#cdlg[open]"); pg.click("#cdlg-y")
def fillask(pg, **kw):
    pg.wait_for_selector("#lg-ask[open]")
    for k, v in kw.items(): pg.fill("#lg-ask [name=%s]" % k, v)
    pg.click("#lg-ask button[type=submit]")
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "rooms", "#lr-t tbody tr")
    tabs = [x.strip() for x in pg.locator(".tabs button").all_inner_texts()]
    chk("11 tab Live Guest", tabs == ["Monitoring Ruangan", "Venue Builder", "Avatar", "Background Venue", "Aset 3D", "Interaksi", "Mini Game", "Moderasi Chat", "Analitik", "Pengaturan Fitur", "Konfigurasi Tema"], tabs)
    t = txt(pg)
    chk("monitoring: kartu + 25 baris + halaman", "55" in t and pg.locator("#lr-t tbody tr").count() == 25 and "halaman 1 dari 2" in t, t[:200])
    chk("judul berisi HTML tidak dieksekusi", pg.evaluate("window.__xss") is None)
    pg.fill("#lr-q", "Undangan 7"); pg.wait_for_function("document.querySelectorAll('#lr-t tbody tr').length==1")
    chk("pencarian dikirim ke RPC", calls(pg, "admin_live_rooms")[-1]["p_q"] == "Undangan 7")
    pg.fill("#lr-q", ""); pg.wait_for_function("document.querySelectorAll('#lr-t tbody tr').length==25")
    pg.locator("[data-room='i0']").click(); pg.wait_for_selector("#lg-room[open] #lg-gs table")
    chk("kelola ruangan: nilai awal + tamu online + bisu aktif", pg.input_value("#lg-rf [name=chat_mode]") == "moderated" and pg.input_value("#lg-rf [name=max]") == "50" and "Budi" in pg.inner_text("#lg-gs") and "Spam" in pg.inner_text("#lg-gs"))
    pg.select_option("#lg-rf [name=chat_mode]", "off"); pg.fill("#lg-rf [name=max]", ""); pg.click("#lg-rf button[type=submit]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_live_room_set')")
    chk("simpan ruangan", calls(pg, "admin_live_room_set")[0] == {"p_inv": "i0", "p_status": "open", "p_chat_mode": "off", "p_slow": 3, "p_max": None, "p_venue": "v1"}, calls(pg, "admin_live_room_set"))
    pg.locator("[data-room='i0']").click(); pg.wait_for_selector("#lg-room[open] #lg-gs table")
    pg.select_option("#lg-rf [name=status]", "closed"); pg.click("#lg-rf button[type=submit]"); confirm(pg); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_live_room_set').length==2")
    chk("menutup ruangan minta konfirmasi", calls(pg, "admin_live_room_set")[1]["p_status"] == "closed")
    pg.locator("[data-room='i0']").click(); pg.wait_for_selector("#lg-room[open] #lg-gs table")
    pg.locator("#lg-gs [data-k=kick]").first.click(); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_live_kick')")
    chk("keluarkan tamu", calls(pg, "admin_live_kick")[0] == {"p_inv": "i0", "p_guest": "g1"})
    pg.locator("#lg-gs [data-k=ban]").first.click(); fillask(pg, m="60", r="x"); chk("alasan pendek ditolak di klien", not calls(pg, "admin_live_mute"))
    fillask(pg, r="Mengganggu"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_live_mute')")
    chk("blokir tamu: jenis, durasi, alasan", calls(pg, "admin_live_mute")[0] == {"p_inv": "i0", "p_guest": "g1", "p_kind": "ban", "p_minutes": 60, "p_reason": "Mengganggu"}, calls(pg, "admin_live_mute"))
    pg.locator("#lg-gs [data-k=un]").first.click(); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_live_unmute')")
    pg.keyboard.press("Escape")
    # venue
    go(pg, "venue", "table tbody tr")
    chk("venue: 2 baris", pg.locator("#view table tbody tr").count() == 2)
    pg.locator("[data-v=v1]").click(); pg.wait_for_selector("#lg-ven[open] #vf-ar tr")
    chk("editor venue: 2 area + pratinjau peta", pg.locator("#vf-ar tr").count() == 2 and pg.locator("#vf-map circle").count() == 2)
    pg.fill("#vf-ar tr:nth-child(1) [data-f=x]", "12.5"); chk("pratinjau ikut berubah", pg.locator("#vf-map circle").first.get_attribute("cx") == "12.5")
    pg.click("#vf-add"); chk("tambah area", pg.locator("#vf-ar tr").count() == 3)
    pg.fill("#vf-ar tr:nth-child(3) [data-f=x]", ""); pg.click("#vf button[type=submit]"); chk("koordinat kosong ditolak di klien", "angka" in pg.inner_text("#vf .lg-e") and not calls(pg, "admin_live_venue_save"))
    pg.fill("#vf-ar tr:nth-child(3) [data-f=x]", "3"); pg.click("#vf button[type=submit]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_live_venue_save')")
    p = calls(pg, "admin_live_venue_save")[0]["p"]
    chk("simpan venue: area terkirim sebagai angka", p["key"] == "romantic-garden" and len(p["areas"]) == 3 and p["areas"][0]["x"] == 12.5 and p["areas"][1]["enabled"] is False and p["max_guests"] == 300, p)
    chk("simpan venue tanpa tema: nm_theme dan decor null", p["nm_theme"] is None and p["event_type"] is None and p["decor"] is None, p)
    pg.locator("[data-v=v1]").click(); pg.wait_for_selector("#vf-ar tr"); chk("editor venue: bagian tema tampil", pg.locator("#vf [name=th_on]").count() == 1 and pg.locator("#vf [type=color]").count() == 10)
    pg.check("#vf [name=th_on]"); pg.select_option("#vf [name=ev]", "birthday"); pg.fill("#vf [name=pos]", "center 30%"); pg.evaluate("document.querySelector('#vf [name=c_accent]').value='#112233'"); pg.select_option("#vf [name=font]", "Cinzel"); pg.check("#vf [name=dark]"); chk("editor venue: 11 slot avatar tema", pg.locator("#vf [name^=av_]").count() == 11); chk("editor venue: 18 slot dekor", pg.locator("#vf [name^=d_]").count() == 18); pg.fill("#vf [name=d_table]", "https://x.test/meja.webp"); pg.fill("#vf [name=d_lamp]", "/aset/lampu.png")
    pg.click("#vf button[type=submit]"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_live_venue_save').length===2")
    p2 = calls(pg, "admin_live_venue_save")[1]["p"]; t = p2["nm_theme"]
    chk("simpan venue bertema: event, posisi, palet, font, gelap", p2["event_type"] == "birthday" and p2["bg_pos"] == "center 30%" and t["ui"]["accent"] == "#112233" and "Cinzel" in t["ui"]["serif"] and t["dark"] is True and t["hud"]["bg"].startswith("rgba(") and t["name"] == "Romantic Garden" and p2["decor"] == {"table": {"url": "https://x.test/meja.webp"}, "lamp": {"url": "/aset/lampu.png"}}, p2)
    pg.locator("[data-v=v1]").click(); pg.wait_for_selector("#vf-ar tr"); pg.click("#vf-del"); confirm(pg); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_live_venue_delete')")
    pg.wait_for_function("!document.querySelector('#lg-ven[open]')")
    # interaksi
    go(pg, "inter", "table tbody tr")
    pg.locator("[data-e=cinta]").click(); fillask(pg, label="Cinta Banget", cd="4"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_live_interaction_save')")
    chk("ubah interaksi", calls(pg, "admin_live_interaction_save")[0] == {"p_key": "cinta", "p_label": "Cinta Banget", "p_emoji": "❤️", "p_kind": "reaksi", "p_enabled": False, "p_cooldown": 4, "p_sort": 2}, calls(pg, "admin_live_interaction_save"))
    pg.locator("[data-x=sapa]").click(); confirm(pg); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_live_interaction_delete')")
    # game
    go(pg, "games", "table tbody tr")
    pg.locator("[data-s=g1]").click(); pg.wait_for_selector("#lg-sc[open] table"); chk("papan skor tampil", "Budi" in pg.inner_text("#lg-sc")); pg.keyboard.press("Escape")
    pg.locator("#view [data-g=g1]").click(); pg.wait_for_selector("#lg-gm[open] .lg-q")
    chk("editor kuis: soal & jawaban benar terpilih", pg.locator("#gf-x .lg-q").count() == 1 and pg.locator("#gf-x input[type=radio]:checked").get_attribute("value") == "1")
    pg.click("#gf-aq"); pg.click("#gf button[type=submit]"); chk("soal kosong ditolak di klien", "harus diisi" in pg.inner_text("#gf .lg-e") and not calls(pg, "admin_live_game_save"))
    pg.locator("#gf-x [data-q='1'][data-f=q]").fill("Kota?"); pg.locator("#gf-x [data-q='1'][data-o='0']").fill("Solo"); pg.locator("#gf-x [data-q='1'][data-o='1']").fill("Bandung"); pg.locator("#gf-x [data-q='1'][data-f=answer][value='1']").check()
    pg.click("#gf button[type=submit]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_live_game_save')")
    g = calls(pg, "admin_live_game_save")[0]["p"]
    chk("simpan kuis: 2 soal, jawaban benar sesuai", g["kind"] == "trivia" and len(g["config"]["questions"]) == 2 and g["config"]["questions"][1] == {"q": "Kota?", "options": ["Solo", "Bandung"], "answer": 1} and g["id"] == "g1", g)
    pg.locator("#view [data-g=g2]").click(); pg.wait_for_selector("#lg-gm[open] [name=seconds]")
    pg.fill("#gf [name=seconds]", "30"); pg.click("#gf button[type=submit]"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_live_game_save').length==2")
    chk("simpan game tap", calls(pg, "admin_live_game_save")[1]["p"]["config"] == {"seconds": 30})
    # chat
    go(pg, "chat", "#ch-t tbody tr")
    t = txt(pg)
    chk("moderasi: default antrean menunggu, tag HTML aman", pg.locator("#ch-t tbody tr").count() == 1 and "<b>" in t and calls(pg, "admin_live_chat")[0]["p_status"] == "pending")
    pg.locator("[data-a=approve][data-id=c1]").click(); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_live_chat_mod')")
    chk("tampilkan pesan", calls(pg, "admin_live_chat_mod")[0] == {"p_id": "c1", "p_action": "approve"})
    pg.locator("[data-a=remove][data-id=c1]").click(); fillask(pg, r="Kasar"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_live_chat_mod').length==2")
    chk("hapus pesan wajib alasan", calls(pg, "admin_live_chat_mod")[1] == {"p_id": "c1", "p_action": "remove", "p_note": "Kasar"})
    pg.click("#ch-w"); pg.wait_for_selector("#lg-w[open] #wf"); chk("daftar kata terlarang", "kasar" in pg.inner_text("#lg-w"))
    pg.fill("#wf [name=w]", "bodoh"); pg.click("#wf button"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_live_word_set')")
    chk("tambah kata", calls(pg, "admin_live_word_set")[0] == {"p_word": "bodoh", "p_on": True}); pg.keyboard.press("Escape")
    # analitik
    go(pg, "stats", ".lg-cards")
    t = txt(pg)
    chk("analitik: angka, harian, interaksi, ruangan teratas", "80" in t and "2026-11-02" in t and "Sapa" in t and "Raka Sinta" in t)
    pg.select_option("#an-r", "7"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_live_analytics').length==2")
    # pengaturan
    go(pg, "cfg", "#sf")
    chk("pengaturan: nilai dimuat", pg.input_value("[name=max_guests]") == "300" and pg.is_checked("[name=enabled]"))
    pg.fill("[name=max_guests]", "250"); pg.uncheck("[name=music]"); pg.click("#sf button[type=submit]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_live_settings_save')")
    chk("simpan pengaturan", calls(pg, "admin_live_settings_save")[0]["p_vals"] == {"enabled": True, "music": False, "qris": True, "gallery": True, "guestbook": True, "default_theme": "romantic-garden", "max_guests": 250}, calls(pg, "admin_live_settings_save"))
    pg.uncheck("[name=enabled]"); pg.click("#sf button[type=submit]"); confirm(pg); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_live_settings_save').length==2")
    chk("mematikan Live Guest minta konfirmasi", calls(pg, "admin_live_settings_save")[1]["p_vals"]["enabled"] is False)
    pg.fill("[name=max_guests]", ""); pg.click("#sf button[type=submit]"); chk("isian kosong ditolak di klien", "angka" in pg.inner_text("#sf .lg-e") and len(calls(pg, "admin_live_settings_save")) == 2)
    chk("tanpa galat JS", not errs, errs)
    ctx.close()
    # mobile
    ctx, pg, errs = newpage(b, 375); ctx.set_default_timeout(15000)
    for tb, sel in [("rooms", "#lr-t table"), ("venue", "table"), ("inter", "table"), ("games", "table"), ("chat", "#ch-t table"), ("stats", ".lg-cards"), ("cfg", "#sf")]:
        go(pg, tb, sel); chk("mobile 375px tanpa scroll horizontal: " + tb, noscroll(pg))
    go(pg, "venue", "table"); pg.locator("[data-v=v1]").click(); pg.wait_for_selector("#vf-ar tr"); chk("mobile: editor venue tanpa scroll horizontal", noscroll(pg))
    ctx.close()
    # hanya baca
    ctx, pg, errs = newpage(b, 1280, role="admin"); ctx.set_default_timeout(15000); go(pg, "rooms", "#lr-t tbody tr")
    chk("hanya baca: tanpa tombol bersihkan", pg.locator("#lr-cl").count() == 0)
    pg.locator("[data-room='i0']").click(); pg.wait_for_selector("#lg-gs table"); chk("hanya baca: form ruangan nonaktif, tanpa tombol tamu", pg.locator("#lg-rf button[type=submit]").count() == 0 and pg.locator("#lg-gs [data-k]").count() == 0); pg.keyboard.press("Escape")
    go(pg, "venue", "table"); chk("hanya baca: tanpa venue baru", pg.locator("#vn-new").count() == 0)
    go(pg, "inter", "table"); chk("hanya baca: tanpa tombol interaksi", pg.locator("#it-new, [data-e], [data-x]").count() == 0)
    go(pg, "games", "table"); chk("hanya baca: tanpa game baru", pg.locator("#gm-new").count() == 0)
    go(pg, "chat", "#ch-t tbody tr"); chk("hanya baca: tanpa tombol moderasi", pg.locator("[data-a]").count() == 0 and pg.locator("#ch-w").count() == 0)
    go(pg, "cfg", "#sf"); chk("hanya baca: pengaturan nonaktif", pg.locator("#sf button[type=submit]").count() == 0 and pg.locator("[name=max_guests]:disabled").count() == 1)
    ctx.close(); b.close()
print("\n%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
