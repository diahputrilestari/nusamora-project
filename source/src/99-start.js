// ===== NM:module start — terapkan tema & identitas awal setelah semua modul siap =====
applyIdentity();NM.refresh();
// Tombol "Dashboard Pelanggan" dihapus dari halaman tamu: dashboard hanya untuk pelanggan setelah daftar/login.
// Untuk integrasi login nanti, panggil window.nmOpenDashboard() setelah pengguna terautentikasi.
(function(){const b=document.getElementById('dopenbtn');if(b)b.remove();window.nmOpenDashboard=()=>{go('dash');renderDash()}})();
