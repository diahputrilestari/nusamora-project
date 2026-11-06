// Uji UI halaman admin-keamanan dengan pustaka Supabase PALSU (tanpa jaringan). Jalankan: NODE_PATH=$(npm root -g) node ops/tests/admin-security.ui.test.js
const http = require("http"), fs = require("fs"), path = require("path"), { chromium } = require("playwright");
const root = path.resolve(__dirname, "../..");
const T = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split("?")[0]); let f = path.join(root, u); if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html"; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { "Content-Type": T[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); });
const FAKE = `(function(){
 var W=window, st=W.__ST=W.__ST||{session:true,role:"super_admin",email:"aa@x.id",factors:[],unverified:[],level:"aal1",mfaRequired:false,pwRequired:false,pwOk:false,admin:true,calls:[],setErr:null,admins:[{email:"aa@x.id",role:"super_admin",factors:0,password_ok:false},{email:"<b>cc</b>@x.id",role:"content",factors:0,password_ok:false}]};
 function needed(){return (st.mfaRequired&&st.level!=="aal2")||(st.pwRequired&&!st.pwOk)}
 W.supabase={createClient:function(){return {
  auth:{getSession:function(){return Promise.resolve({data:{session:st.session?{user:{email:st.email}}:null}})},
   signOut:function(){return Promise.resolve({})},refreshSession:function(){return Promise.resolve({})},onAuthStateChange:function(){},
   mfa:{listFactors:function(){return Promise.resolve({data:{totp:st.factors,all:st.factors.concat(st.unverified)}})},
    getAuthenticatorAssuranceLevel:function(){return Promise.resolve({data:{currentLevel:st.level}})},
    enroll:function(o){st.calls.push("enroll");var id="f"+(st.factors.length+st.unverified.length+1);st.unverified.push({id:id,status:"unverified"});return Promise.resolve({data:{id:id,totp:{qr_code:"data:image/svg+xml;utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>",secret:"JBSWY3DPEHPK3PXP"}}})},
    challengeAndVerify:function(o){st.calls.push("verify:"+o.code);if(o.code!=="123456")return Promise.resolve({error:{message:"invalid"}});var u=st.unverified.filter(function(f){return f.id===o.factorId})[0];if(u){st.unverified=st.unverified.filter(function(f){return f!==u});st.factors.push({id:u.id,friendly_name:st.nextName||"HP <img src=x onerror=window.__XSS=1>",status:"verified"})}st.level="aal2";return Promise.resolve({data:{}})},
    unenroll:function(o){st.calls.push("unenroll:"+o.factorId);st.factors=st.factors.filter(function(f){return f.id!==o.factorId});st.unverified=st.unverified.filter(function(f){return f.id!==o.factorId});return Promise.resolve({data:{}})}}},
  rpc:function(n,a){st.calls.push("rpc:"+n);
   if(n==="my_admin"){if(!st.admin)return Promise.resolve({data:null});var nd=needed();return Promise.resolve({data:{role:st.role,perms:nd?[]:["dashboard.read"],mfa:{required:st.mfaRequired,aal:st.level,enrolled:st.factors.length>0,password_required:st.pwRequired,password_ok:st.pwOk,needed:nd}}})}
   if(n==="security_status")return Promise.resolve({data:{mfa_required:st.mfaRequired,password_policy_required:st.pwRequired,admins:st.admins}});
   if(n==="admin_set_security"){if(st.setErr)return Promise.resolve({error:{message:st.setErr}});st.mfaRequired=a.p_mfa;st.pwRequired=a.p_password;return Promise.resolve({data:{}})}
   return Promise.resolve({data:[]})},
  functions:{invoke:function(n,o){st.calls.push("fn:"+n);var pw=o.body.new_password;if(pw.length<12)return Promise.resolve({error:{context:{json:function(){return Promise.resolve({message:"Minimal 12 karakter."})}}}});st.pwOk=true;return Promise.resolve({data:{ok:true}})}}
 }}};
})();`;
let pass = 0, fail = 0; const ok = (n, c) => { if (c) { pass++; console.log("PASS ", n); } else { fail++; console.log("FAIL ", n); } };
srv.listen(8792, async () => {
  const b = await chromium.launch(); const mk = async (init) => { const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }); const p = await ctx.newPage();
    await p.route("**/supabase.js", (r) => r.fulfill({ contentType: "text/javascript", body: FAKE })); await p.route("**/fonts.*/**", (r) => r.abort());
    if (init) await p.addInitScript(init); return p; };
  const U = "http://127.0.0.1:8792";
  // 1. pendaftaran
  let p = await mk(); await p.goto(U + "/admin-keamanan"); await p.waitForSelector("#c-fac");
  ok("tanpa perangkat: pesan 'Belum ada perangkat'", /Belum ada perangkat/.test(await p.textContent("#c-fac")));
  await p.click("#b-enr"); await p.waitForSelector("#f-enr");
  ok("QR tampil sebagai <img> dan kunci manual tampil", (await p.getAttribute(".sec-qr img", "src")).startsWith("data:image/svg+xml") && /JBSWY3DPEHPK3PXP/.test(await p.textContent(".sec-qr code")));
  await p.fill("#ecode", "000000"); await p.click("#f-enr button"); await p.waitForSelector("#e-enr:not([hidden])");
  ok("kode salah -> pesan galat, belum aktif", /Kode salah/.test(await p.textContent("#e-enr")) && (await p.evaluate(() => __ST.factors.length)) === 0);
  await p.fill("#ecode", "12ab"); await p.click("#f-enr button"); ok("kode bukan 6 digit ditolak di klien", /6 digit/.test(await p.textContent("#e-enr")));
  await p.fill("#ecode", "123456"); await p.click("#f-enr button"); await p.waitForSelector(".sec-list [data-rm]");
  ok("kode benar -> perangkat terdaftar", (await p.evaluate(() => __ST.factors.length)) === 1);
  ok("nama perangkat berisi HTML di-escape (tanpa XSS)", (await p.evaluate(() => window.__XSS)) !== 1 && (await p.$$("#c-fac img[src=x]")).length === 0 && /<img src=x/.test(await p.textContent("#c-fac")));
  ok("saran perangkat kedua muncul saat baru 1", /perangkat kedua/.test(await p.textContent("#c-fac")));
  // hapus butuh konfirmasi 2 klik
  await p.click("[data-rm]"); ok("hapus: klik pertama hanya meminta konfirmasi", (await p.evaluate(() => __ST.factors.length)) === 1 && /Yakin/.test(await p.textContent("[data-rm]")));
  await p.click("[data-rm]"); await p.waitForFunction(() => __ST.factors.length === 0); ok("hapus: klik kedua menghapus", true);
  // 2. tantangan MFA
  p = await mk(() => { window.__ST = { session: true, role: "super_admin", email: "aa@x.id", factors: [{ id: "f1", friendly_name: "HP", status: "verified" }], unverified: [], level: "aal1", mfaRequired: true, pwRequired: false, pwOk: true, admin: true, calls: [], admins: [] }; });
  await p.goto(U + "/admin-keamanan?next=/admin"); await p.waitForSelector("#f-chal");
  ok("MFA wajib & aal1: kartu tantangan + peringatan akses ditahan", /ditahan/.test(await p.textContent("#view")) && !(await p.$("#c-adm")));
  ok("saat aal1, tombol tambah perangkat tidak ditawarkan", !(await p.$("#b-enr")));
  await p.fill("#code", "111111"); await p.click("#f-chal button"); await p.waitForSelector("#e-chal:not([hidden])"); ok("kode tantangan salah -> galat", /salah/.test(await p.textContent("#e-chal")));
  await Promise.all([p.waitForURL("**/admin", { timeout: 8000 }).catch(() => null), (async () => { await p.fill("#code", "123456"); await p.click("#f-chal button"); })()]);
  ok("kode benar -> diarahkan ke /admin (next)", new URL(p.url()).pathname === "/admin");
  // 3. admin.js mengarahkan bila MFA dibutuhkan
  p = await mk(() => { window.__ST = { session: true, role: "super_admin", email: "aa@x.id", factors: [{ id: "f1", status: "verified" }], unverified: [], level: "aal1", mfaRequired: true, pwRequired: false, pwOk: true, admin: true, calls: [], admins: [] }; });
  await p.goto(U + "/admin"); await p.waitForURL("**/admin-keamanan**", { timeout: 8000 }).catch(() => null);
  ok("/admin dengan needed=true diarahkan ke /admin-keamanan?next=%2Fadmin", new URL(p.url()).pathname === "/admin-keamanan" && new URL(p.url()).searchParams.get("next") === "/admin");
  // open redirect
  p = await mk(() => { window.__ST = { session: true, role: "super_admin", email: "a@x.id", factors: [{ id: "f1", status: "verified" }], unverified: [], level: "aal1", mfaRequired: true, pwOk: true, admin: true, calls: [], admins: [] }; });
  await p.goto(U + "/admin-keamanan?next=//evil.example/x"); await p.waitForSelector("#f-chal"); await p.fill("#code", "123456"); await p.click("#f-chal button"); await p.waitForTimeout(800);
  ok("parameter next berbahaya (//evil) tidak diikuti", !/evil\.example/.test(p.url()));
  // 4. password
  p = await mk(); await p.goto(U + "/admin-keamanan"); await p.waitForSelector("#f-pw");
  await p.fill("#pw1", "abc"); ok("checklist kebijakan ter-update", (await p.$$eval("#pw-h .sec-pill.bad", (e) => e.length)) >= 2);
  await p.fill("#pw2", "xyz"); await p.click("#f-pw button"); ok("password tak sama -> galat klien", /tidak sama/.test(await p.textContent("#e-pw")));
  await p.fill("#pw2", "abc"); await p.click("#f-pw button"); await p.waitForFunction(() => /Minimal 12/.test(document.querySelector("#e-pw").textContent)); ok("galat dari server ditampilkan", true);
  await p.fill("#pw1", "kopi-Hangat#Senja-4721"); await p.fill("#pw2", "kopi-Hangat#Senja-4721"); await p.click("#f-pw button"); await p.waitForFunction(() => __ST.pwOk === true); ok("password kuat -> dikirim ke fungsi admin-password", (await p.evaluate(() => __ST.calls.includes("fn:admin-password"))));
  // 5. panel super admin
  p = await mk(() => { window.__ST = { session: true, role: "super_admin", email: "aa@x.id", factors: [{ id: "f1", friendly_name: "HP", status: "verified" }], unverified: [], level: "aal2", mfaRequired: false, pwRequired: false, pwOk: true, admin: true, calls: [], setErr: "prasyarat: admin belum mendaftarkan MFA: <i>cc@x.id</i>", admins: [{ email: "aa@x.id", role: "super_admin", factors: 1, password_ok: true }, { email: "<b>cc</b>@x.id", role: "content", factors: 0, password_ok: false }] }; });
  await p.goto(U + "/admin-keamanan"); await p.waitForSelector("#a-mfa");
  ok("tabel admin: email ber-HTML di-escape", (await p.$$("#adm-b table b")).length === 0 && /<b>cc<\/b>@x.id/.test(await p.textContent("#adm-b table")));
  await p.click("#a-mfa"); ok("aktifkan: klik pertama meminta konfirmasi", /konfirmasi/.test(await p.textContent("#a-mfa")));
  await p.click("#a-mfa"); await p.waitForSelector("#e-adm:not([hidden])"); ok("prasyarat gagal -> pesan dari server (tanpa awalan teknis) ditampilkan aman", /belum mendaftarkan MFA/.test(await p.textContent("#e-adm")) && !/^prasyarat/i.test(await p.textContent("#e-adm")) && (await p.$$("#e-adm i")).length === 0);
  await p.evaluate(() => { __ST.setErr = null; }); await p.click("#a-mfa"); await p.click("#a-mfa"); await p.waitForFunction(() => __ST.mfaRequired === true); ok("tanpa galat -> MFA wajib aktif", true);
  // 6. non-admin, tanpa sesi, mobile
  p = await mk(() => { window.__ST = { session: true, admin: false, factors: [], unverified: [], level: "aal1", calls: [], admins: [] }; }); await p.goto(U + "/admin-keamanan"); await p.waitForSelector(".card h2"); ok("non-admin: 'Khusus admin'", /Khusus admin/.test(await p.textContent("#view")));
  p = await mk(() => { window.__ST = { session: false, calls: [], admins: [], factors: [], unverified: [] }; }); await p.goto(U + "/admin-keamanan"); await p.waitForURL("**/masuk**", { timeout: 8000 }).catch(() => null); ok("tanpa sesi -> /masuk", new URL(p.url()).pathname === "/masuk");
  p = await mk(() => { window.__ST = { session: true, role: "super_admin", email: "aa@x.id", factors: [{ id: "f1", friendly_name: "HP", status: "verified" }], unverified: [], level: "aal2", mfaRequired: true, pwRequired: true, pwOk: true, admin: true, calls: [], admins: [{ email: "very-long-email-address-for-overflow-check@example-domain.co.id", role: "super_admin", factors: 2, password_ok: true }] }; });
  await p.setViewportSize({ width: 390, height: 800 }); await p.goto(U + "/admin-keamanan"); await p.waitForSelector("#a-mfa"); ok("390px: tanpa overflow horizontal halaman", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log(fail ? `GAGAL ${fail}` : `SEMUA LULUS (${pass})`); await b.close(); srv.close(); process.exit(fail ? 1 : 0);
});
