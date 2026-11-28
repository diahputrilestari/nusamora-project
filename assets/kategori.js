/* Filter paket + pencarian untuk halaman kategori. Konten sudah ada di HTML; skrip ini hanya menyaring tampilan. */
(function () {
  var g = document.getElementById("kat-g"); if (!g) return;
  var cards = [].slice.call(g.querySelectorAll(".tc")), q = document.getElementById("kat-q"), n = document.getElementById("kat-n"), e = document.getElementById("kat-e");
  var chips = [].slice.call(document.querySelectorAll(".kat-f .ch")), pk = "", total = cards.length;
  function run() {
    var t = (q && q.value || "").toLowerCase().trim(), c = 0;
    cards.forEach(function (el) {
      var ok = (!pk || el.getAttribute("data-pkg") === pk) && (!t || (el.getAttribute("data-q") || "").indexOf(t) > -1);
      if (ok) { el.removeAttribute("hidden"); c++; } else el.setAttribute("hidden", "");
    });
    if (n) n.textContent = "Menampilkan " + c + " dari " + total + " template";
    if (e) e.hidden = c > 0;
  }
  chips.forEach(function (b) {
    b.addEventListener("click", function () {
      pk = b.getAttribute("data-pk") || "";
      chips.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      run();
    });
  });
  if (q) q.addEventListener("input", run);
})();
