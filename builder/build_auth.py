#!/usr/bin/env python3
"""Membuat halaman akun: daftar, masuk, lupa-password, atur-password, akun.
Pakai: python3 builder/build_auth.py <outdir>"""
import sys
out = sys.argv[1] if len(sys.argv) > 1 else "."
FONTS = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap"
SB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/dist/umd/supabase.js"

def page(fn, title, desc, body):
    html = f'''<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title} | NusaMora</title><meta name="description" content="{desc}"><meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#6a34b6"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}"><link rel="stylesheet" href="/assets/landing.css"><link rel="stylesheet" href="/assets/auth.css">
</head><body class="auth">
<header class="top"><div class="wrap bar"><a class="brand" href="/" aria-label="NusaMora, ke beranda">nusamora<span>.</span></a><a class="btn o sm" href="/">Kembali ke beranda</a></div></header>
<main id="utama"><section class="card-a">{body}</section></main>
<script src="/assets/config.js"></script>
<script src="{SB}"></script>
<script src="/assets/auth.js" defer></script></body></html>
'''
    open(f"{out}/{fn}", "w").write(html)

EMAIL = '<div class="f"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email" required><span class="err" data-for="email"></span></div>'
def pw(label, ac, new=False, ident="pw"):
    meter = '<div class="meter" aria-hidden="true"><i id="meter"></i></div><small id="pwhint">Minimal 8 karakter, campur huruf dan angka.</small>' if new else ""
    return (f'<div class="f"><label for="{ident}">{label}</label><div class="pw"><input id="{ident}" name="{ident}" type="password" autocomplete="{ac}" required{" minlength=8" if new else ""}>'
            f'<button type="button" data-toggle="{ident}" aria-label="Tampilkan kata sandi">Lihat</button></div>{meter}<span class="err" data-for="{ident}"></span></div>')

page("daftar.html", "Daftar Akun", "Buat akun NusaMora untuk membuat undangan digital interaktif.", f'''
<h1>Buat akun NusaMora</h1><p class="sub">Daftar gratis untuk menyimpan draft undangan. Anda baru membayar saat siap.</p>
<div id="pick" class="pick" hidden></div><div id="msg" role="alert" hidden></div>
<form id="f-reg" novalidate data-form="register">
 <div class="f"><label for="name">Nama lengkap</label><input id="name" name="name" type="text" autocomplete="name" required minlength="2" maxlength="80"><span class="err" data-for="name"></span></div>
 {EMAIL}
 <div class="f"><label for="wa">Nomor WhatsApp <small>(opsional, untuk bantuan)</small></label><input id="wa" name="wa" type="tel" autocomplete="tel" inputmode="tel" placeholder="08123456789"><span class="err" data-for="wa"></span></div>
 {pw("Kata sandi", "new-password", True)}
 <label class="chk"><input id="terms" type="checkbox" required><span>Saya menyetujui Syarat Layanan dan Kebijakan Privasi NusaMora.</span></label><span class="err" data-for="terms"></span>
 <div class="hp" aria-hidden="true"><label>Jangan diisi <input type="text" id="website" tabindex="-1" autocomplete="off"></label></div>
 <button class="btn full lg" type="submit" id="go">Daftar</button>
</form>
<p class="alt">Sudah punya akun? <a href="/masuk">Masuk</a></p>''')

page("masuk.html", "Masuk", "Masuk ke akun NusaMora Anda.", f'''
<h1>Masuk</h1><p class="sub">Lanjutkan mengelola undangan Anda.</p><div id="msg" role="alert" hidden></div>
<form id="f-login" novalidate data-form="login">{EMAIL}{pw("Kata sandi", "current-password")}
 <button class="btn full lg" type="submit" id="go">Masuk</button></form>
<p class="alt"><a href="/lupa-password">Lupa kata sandi?</a></p><p class="alt">Belum punya akun? <a href="/daftar">Daftar</a></p>''')

page("lupa-password.html", "Lupa Kata Sandi", "Atur ulang kata sandi akun NusaMora.", f'''
<h1>Lupa kata sandi</h1><p class="sub">Masukkan email akun Anda. Kami kirim tautan untuk membuat kata sandi baru.</p><div id="msg" role="alert" hidden></div>
<form id="f-forgot" novalidate data-form="forgot">{EMAIL}<button class="btn full lg" type="submit" id="go">Kirim tautan</button></form>
<p class="alt"><a href="/masuk">Kembali ke halaman masuk</a></p>''')

page("atur-password.html", "Kata Sandi Baru", "Buat kata sandi baru untuk akun NusaMora.", f'''
<h1>Kata sandi baru</h1><p class="sub">Buat kata sandi baru untuk akun Anda.</p><div id="msg" role="alert" hidden></div>
<form id="f-reset" novalidate data-form="reset">{pw("Kata sandi baru", "new-password", True)}<button class="btn full lg" type="submit" id="go">Simpan kata sandi</button></form>''')

# akun.html (Dashboard Pelanggan) ditulis manual: lihat akun.html, assets/dashboard.css, assets/dashboard.js
print("auth pages built")
