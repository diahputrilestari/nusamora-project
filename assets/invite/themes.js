/* NusaMora Invite — tema warna & ornamen SVG (desain asli NusaMora).
   Ornamen memakai currentColor sehingga otomatis mengikuti tema. Tambah tema baru cukup di THEMES. */
(function (w) {
  "use strict";
  var THEMES = {
    marun: { label: "Marun Songket", deep: "#4A0D14", deep2: "#6E1823", paper: "#F7EEDC", ink: "#3A2420", muted: "#7A5F55", accent: "#C9A35B", accent2: "#E8CF93", soft: "#EBD9BB", petal: "#EDB9A6" },
    sage: { label: "Sage Garden", deep: "#2B3A30", deep2: "#3E5244", paper: "#F4F0E6", ink: "#262C27", muted: "#5F6A5F", accent: "#B7975A", accent2: "#DCC796", soft: "#E1DACA", petal: "#F3E9D2" },
    navy: { label: "Biru Malam", deep: "#101A31", deep2: "#1E2B50", paper: "#F5F0E6", ink: "#1D2233", muted: "#5B6275", accent: "#CFAE6B", accent2: "#EDD8A6", soft: "#E5DCCA", petal: "#F2E5CC" },
    blush: { label: "Blush Rose", deep: "#5A2B34", deep2: "#7A3F4A", paper: "#FCF4F1", ink: "#4A2C31", muted: "#86636A", accent: "#C08A70", accent2: "#E9C3AD", soft: "#F2DFD8", petal: "#F5C7C7" }
  };

  function enc(svg) { return "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")"; }
  /* pola anyaman belah ketupat (terinspirasi songket, digambar ulang) */
  function lattice(c, o) {
    return enc('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><g fill="none" stroke="' + c + '" stroke-opacity="' + o + '" stroke-width="1"><path d="M22 3 41 22 22 41 3 22z"/><path d="M22 12 32 22 22 32 12 22z"/><path d="M22 18v8M18 22h8"/></g><g fill="' + c + '" fill-opacity="' + o + '"><circle cx="0" cy="0" r="1.6"/><circle cx="44" cy="0" r="1.6"/><circle cx="0" cy="44" r="1.6"/><circle cx="44" cy="44" r="1.6"/></g></svg>');
  }
  /* jalur tumpal (segitiga) untuk bingkai */
  function tumpal(c) {
    return enc('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="18" viewBox="0 0 26 18"><path d="M0 18 13 2 26 18z" fill="none" stroke="' + c + '" stroke-width="1.1"/><path d="M7 18 13 10 19 18z" fill="' + c + '" fill-opacity=".55"/><circle cx="13" cy="5.5" r="1.1" fill="' + c + '"/></svg>');
  }

  function apply(name, root) {
    var t = THEMES[name] || THEMES.marun, s = (root || document.documentElement).style;
    Object.keys(t).forEach(function (k) { if (k !== "label") s.setProperty("--" + k, t[k]); });
    s.setProperty("--pattern", lattice(t.accent, 0.16));
    s.setProperty("--pattern-paper", lattice(t.accent, 0.12));
    s.setProperty("--tumpal", tumpal(t.accent));
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", t.deep);
    return t;
  }

  var ORN = {
    /* sulur sudut: lengkung ganda, daun, dan kuncup */
    corner: '<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M8 8C70 10 112 34 138 78s54 66 58 70" stroke-width="1.6"/><path d="M8 8C10 70 34 112 78 138s66 54 70 58" stroke-width="1.6"/>' +
      '<path d="M8 8c38 6 64 24 78 54" stroke-width="1" opacity=".7"/><path d="M8 8c6 38 24 64 54 78" stroke-width="1" opacity=".7"/>' +
      '<path d="M104 40c10-14 28-14 34-2-12 6-24 8-34 2z" fill="currentColor" fill-opacity=".35" stroke-width="1"/><path d="M40 104c-14 10-14 28-2 34 6-12 8-24 2-34z" fill="currentColor" fill-opacity=".35" stroke-width="1"/>' +
      '<path d="M148 92c16-4 28 6 26 18-14 0-24-6-26-18z" fill="currentColor" fill-opacity=".25" stroke-width="1"/><path d="M92 148c-4 16 6 28 18 26 0-14-6-24-18-26z" fill="currentColor" fill-opacity=".25" stroke-width="1"/>' +
      '<g transform="translate(46 46)"><circle r="9" stroke-width="1.2"/><circle r="3.4" fill="currentColor"/>' +
      '<path d="M0-9c4-8 12-8 14-2M9 0c8 4 8 12 2 14M0 9c-4 8-12 8-14 2M-9 0c-8-4-8-12-2-14" stroke-width="1.1"/></g>' +
      '<circle cx="186" cy="138" r="2.6" fill="currentColor" stroke="none"/><circle cx="138" cy="186" r="2.6" fill="currentColor" stroke="none"/></svg>',
    divider: '<svg viewBox="0 0 240 24" fill="none" stroke="currentColor" aria-hidden="true"><path class="ln" d="M4 12h86M150 12h86" stroke-width="1"/>' +
      '<path d="M120 2l10 10-10 10-10-10z" stroke-width="1.2"/><path d="M120 7l5 5-5 5-5-5z" fill="currentColor"/>' +
      '<path d="M96 12c4-6 8-6 12 0-4 6-8 6-12 0zM132 12c4-6 8-6 12 0-4 6-8 6-12 0z" stroke-width="1"/><circle cx="90" cy="12" r="1.6" fill="currentColor"/><circle cx="150" cy="12" r="1.6" fill="currentColor"/></svg>',
    bloom: '<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="currentColor"><ellipse cx="20" cy="9" rx="6" ry="9"/><ellipse cx="20" cy="9" rx="6" ry="9" transform="rotate(72 20 20)"/><ellipse cx="20" cy="9" rx="6" ry="9" transform="rotate(144 20 20)"/><ellipse cx="20" cy="9" rx="6" ry="9" transform="rotate(216 20 20)"/><ellipse cx="20" cy="9" rx="6" ry="9" transform="rotate(288 20 20)"/></g><circle cx="20" cy="20" r="4" fill="#fff" fill-opacity=".55"/></svg>',
    leaf: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 34C6 16 18 6 36 6 36 24 24 34 6 34z" fill="currentColor"/><path d="M8 32 32 9" stroke="#fff" stroke-opacity=".4" fill="none"/></svg>',
    arch: '<svg viewBox="0 0 300 380" fill="none" stroke="currentColor" aria-hidden="true" preserveAspectRatio="none"><path d="M10 376V150C10 72 72 10 150 10s140 62 140 140v226" stroke-width="1.4"/><path d="M22 376V152C22 82 80 24 150 24s128 58 128 128v224" stroke-width=".8" opacity=".7"/></svg>'
  };

  w.NMInvite = w.NMInvite || {};
  w.NMInvite.themes = { list: THEMES, apply: apply, orn: ORN };
})(window);
