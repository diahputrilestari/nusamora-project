/* Konfigurasi form aset per paket (NusaMora Admin).
 * Menambah kategori / isian / slot baru = ubah berkas ini saja; komponen di admin-assets.js membangun form dari sini.
 *
 * Per paket:
 *   groups[]   Jenis aset di form unggah. cats = slug kategori (asset_categories.slug) yang boleh dipilih, fields = isian khusus
 *              (disimpan di assets.attrs), slots = slot template yang disarankan untuk jenis ini.
 *   fields{}   Definisi isian aset. t: select | number | text | bool. catMap: pilihan -> slug kategori (memilih kategori otomatis).
 *   slots[]    Slot penempatan di Template Studio (tab B): key, label, group. Admin tetap bisa menambah slot kustom.
 *   config[]   Pengaturan penempatan per aset di template (template_assets.config), dikelompokkan per sec.
 *   layout[]   Pengaturan tingkat scene/venue (templates.layout). k memakai titik, mis. "scene.lighting". t: points = daftar titik.
 */
(function () {
  "use strict";
  var SEC = [["opening", "Pembuka"], ["couple", "Mempelai"], ["event", "Acara"], ["gallery", "Galeri"], ["rsvp", "RSVP & ucapan"], ["closing", "Penutup"], ["general", "Umum"]];
  var ANIM2D = [["none", "Tanpa animasi"], ["fade", "Muncul perlahan"], ["float", "Melayang"], ["sway", "Bergoyang"], ["zoom", "Zoom lembut"], ["slide", "Geser masuk"], ["spin", "Berputar pelan"]];
  var ANIM3D = [["none", "Tanpa animasi"], ["rotate", "Berputar pelan"], ["float", "Melayang"], ["clip", "Putar animasi bawaan model"]];
  var N = function (k, l, o) { o = o || {}; o.k = k; o.l = l; o.t = "number"; return o; };
  var S = function (k, l, opts, o) { o = o || {}; o.k = k; o.l = l; o.t = "select"; o.opts = opts; return o; };
  var T = function (k, l, o) { o = o || {}; o.k = k; o.l = l; o.t = "text"; return o; };
  var B = function (k, l, o) { o = o || {}; o.k = k; o.l = l; o.t = "bool"; return o; };

  window.NM_ASSET_FORMS = {
    version: 1,

    /* ======================= ESSENTIAL: undangan 2D ======================= */
    essential: {
      title: "Essential (2D Invitation)", renderer: "2D scroll",
      intro: "Aset gambar 2D: latar per section, ilustrasi, dekorasi, serta animasi GIF/Lottie. Format PNG/WebP transparan disarankan untuk dekorasi.",
      groups: [
        { key: "background", label: "Background per section", hint: "Latar satu section. PNG/JPG/WebP, rasio mengikuti layar ponsel (mis. 1080×1920).", cats: ["background", "section-decoration"], fields: ["section", "orientation"], slots: ["opening_background", "hero_background", "section_background", "closing_background"] },
        { key: "character", label: "Ilustrasi pengantin & karakter", hint: "Ilustrasi mempelai atau karakter. PNG/WebP/SVG dengan latar transparan.", cats: ["character"], fields: ["character_role"], slots: ["couple_illustration", "groom_illustration", "bride_illustration"] },
        { key: "decoration", label: "Dekorasi, ornamen, bunga, frame & border", hint: "Elemen dekoratif. PNG/WebP/SVG transparan; border bisa dibuat berulang.", cats: ["floral", "ornament", "frame", "wedding-objects"], fields: ["section", "placement"], slots: ["floral_decoration", "gorga_border", "frame_border", "ornament_corner", "closing_decoration"] },
        { key: "animation", label: "Animasi 2D (GIF / Lottie)", hint: "GIF, Lottie JSON, atau WebP animasi.", cats: ["animation"], fields: ["section", "loop"], slots: ["animated_decoration"] }
      ],
      fields: {
        section: S("section", "Bagian undangan", SEC, { help: "Bagian tempat aset ini biasanya dipakai." }),
        orientation: S("orientation", "Orientasi", [["portrait", "Portrait (ponsel)"], ["landscape", "Landscape (desktop)"], ["any", "Bebas"]], { def: "portrait" }),
        character_role: S("character_role", "Karakter", [["pasangan", "Pasangan"], ["pria", "Mempelai pria"], ["wanita", "Mempelai wanita"], ["lain", "Karakter lain"]], { req: 1 }),
        placement: S("placement", "Penempatan umum", [["sudut", "Sudut"], ["tepi", "Tepi / border"], ["tengah", "Tengah"], ["berulang", "Berulang (pola)"]]),
        loop: B("loop", "Berulang terus (loop)", { def: true })
      },
      slots: [
        { key: "opening_background", label: "Latar pembuka", group: "background" }, { key: "hero_background", label: "Latar utama (hero)", group: "background" },
        { key: "section_background", label: "Latar section", group: "background" }, { key: "closing_background", label: "Latar penutup", group: "background" },
        { key: "couple_illustration", label: "Ilustrasi pasangan", group: "character" }, { key: "groom_illustration", label: "Ilustrasi mempelai pria", group: "character" }, { key: "bride_illustration", label: "Ilustrasi mempelai wanita", group: "character" },
        { key: "floral_decoration", label: "Dekorasi bunga", group: "decoration" }, { key: "gorga_border", label: "Border / gorga", group: "decoration" }, { key: "frame_border", label: "Frame", group: "decoration" },
        { key: "ornament_corner", label: "Ornamen sudut", group: "decoration" }, { key: "closing_decoration", label: "Dekorasi penutup", group: "decoration" },
        { key: "animated_decoration", label: "Dekorasi animasi", group: "animation" }
      ],
      config: [
        N("x", "Posisi X (%)", { sec: "Posisi & ukuran", ph: 50, min: -50, max: 150 }), N("y", "Posisi Y (%)", { sec: "Posisi & ukuran", ph: 50, min: -50, max: 150 }), N("w", "Lebar (% section)", { sec: "Posisi & ukuran", ph: "auto", min: 1, max: 300 }),
        N("scale", "Skala", { sec: "Transformasi", ph: 1, min: 0.05, max: 10 }), N("rotate", "Rotasi (°)", { sec: "Transformasi", ph: 0, min: -360, max: 360 }),
        N("z", "Lapisan (layer 0-20)", { sec: "Layering", ph: 0, min: 0, max: 20, help: "Angka lebih besar tampil di depan." }), N("opacity", "Opasitas (0-1)", { sec: "Layering", ph: 1, min: 0, max: 1 }),
        S("anim", "Animasi", ANIM2D, { sec: "Animasi" }), N("speed", "Durasi animasi (dtk)", { sec: "Animasi", ph: 6, min: 0.5, max: 60 })
      ],
      layout: []
    },

    /* ======================= SIGNATURE: 3D cinematic ======================= */
    signature: {
      title: "Signature (3D Cinematic)", renderer: "3D cinematic",
      intro: "Model 3D (GLB/glTF), texture & material, environment, serta kamera dan animasi sinematik.",
      groups: [
        { key: "model", label: "Model 3D (GLB / glTF)", hint: "Satu file GLB lebih disarankan (glTF harus embedded). Maks. 50 MB.", cats: ["venue-3d", "environment-3d", "character-3d", "decoration-3d", "furniture-3d"], fields: ["model_role", "has_clip", "clip_name"], slots: ["3d_wedding_venue", "3d_couple", "3d_flower", "3d_decoration"] },
        { key: "material", label: "Texture & material", hint: "Peta texture PNG/JPG/WebP. Pilih jenis peta agar renderer memasangnya di slot material yang benar.", cats: ["texture", "image-assets"], fields: ["map_type", "tiling"], slots: ["texture_floor", "texture_wall", "texture_custom"] },
        { key: "environment", label: "Background / environment", hint: "HDR (.hdr) untuk pencahayaan, atau gambar latar/skybox.", cats: ["hdr-environment", "image-assets"], fields: ["env_kind", "exposure"], slots: ["environment_map", "sky_background"] },
        { key: "camera", label: "Kamera & efek sinematik", hint: "Data animasi kamera (JSON/GLB) dan efek partikel.", cats: ["camera-animation", "particle-effects"], fields: ["duration", "loop"], slots: ["cinematic_camera_scene", "particle_effect"] },
        { key: "music", label: "Musik latar", hint: "MP3/OGG/WAV, maks. 20 MB.", cats: ["background-music"], fields: ["loop", "volume"], slots: ["background_music"] }
      ],
      fields: {
        model_role: S("model_role", "Peran model", [["venue", "Venue / ruangan"], ["pasangan", "Pasangan"], ["dekorasi", "Dekorasi / bunga"], ["furnitur", "Furnitur"], ["karakter", "Karakter lain"]]),
        has_clip: B("has_clip", "Model memiliki animasi bawaan"),
        clip_name: T("clip_name", "Nama animasi utama", { max: 60, help: "Nama clip di dalam model, jika ada." }),
        map_type: S("map_type", "Jenis peta", [["albedo", "Albedo / warna"], ["normal", "Normal"], ["roughness", "Roughness"], ["metalness", "Metalness"], ["emissive", "Emissive"], ["ao", "Ambient occlusion"]], { req: 1 }),
        tiling: N("tiling", "Pengulangan (tiling)", { min: 0.1, max: 64, ph: 1 }),
        env_kind: S("env_kind", "Jenis", [["hdr", "HDR pencahayaan"], ["skybox", "Skybox"], ["backdrop", "Backdrop gambar"]]),
        exposure: N("exposure", "Eksposur", { min: 0, max: 5, ph: 1 }),
        duration: N("duration", "Durasi (detik)", { min: 1, max: 300, ph: 8 }),
        loop: B("loop", "Berulang (loop)", { def: false }),
        volume: N("volume", "Volume bawaan (0-1)", { min: 0, max: 1, ph: 0.6 })
      },
      slots: [
        { key: "3d_wedding_venue", label: "Venue pernikahan 3D", group: "model" }, { key: "3d_couple", label: "Mempelai 3D", group: "model" }, { key: "3d_flower", label: "Bunga / dekorasi 3D", group: "model" }, { key: "3d_decoration", label: "Dekorasi 3D lain", group: "model" },
        { key: "texture_floor", label: "Texture lantai", group: "material" }, { key: "texture_wall", label: "Texture dinding", group: "material" }, { key: "texture_custom", label: "Texture kustom", group: "material" },
        { key: "environment_map", label: "Environment (HDR)", group: "environment" }, { key: "sky_background", label: "Langit / backdrop", group: "environment" },
        { key: "cinematic_camera_scene", label: "Kamera sinematik", group: "camera" }, { key: "particle_effect", label: "Efek partikel", group: "camera" },
        { key: "background_music", label: "Musik latar", group: "music" }
      ],
      config: [
        N("x", "Posisi X", { sec: "Posisi (satuan scene)", ph: 0 }), N("y", "Posisi Y", { sec: "Posisi (satuan scene)", ph: 0 }), N("z", "Posisi Z", { sec: "Posisi (satuan scene)", ph: 0 }),
        N("rx", "Rotasi X (°)", { sec: "Rotasi", ph: 0, min: -360, max: 360 }), N("ry", "Rotasi Y (°)", { sec: "Rotasi", ph: 0, min: -360, max: 360 }), N("rz", "Rotasi Z (°)", { sec: "Rotasi", ph: 0, min: -360, max: 360 }),
        N("scale", "Skala", { sec: "Skala & material", ph: 1, min: 0.01, max: 100 }), B("cast_shadow", "Menghasilkan bayangan", { sec: "Skala & material", def: true }), N("light_boost", "Intensitas cahaya objek", { sec: "Skala & material", ph: 1, min: 0, max: 10 }),
        S("anim", "Animasi objek", ANIM3D, { sec: "Animasi objek" }), T("clip", "Nama clip (jika memakai animasi model)", { sec: "Animasi objek", max: 60 }), N("speed", "Kecepatan animasi", { sec: "Animasi objek", ph: 1, min: 0.1, max: 10 }),
        S("shot", "Jenis shot kamera", [["wide", "Wide"], ["close", "Close-up"], ["orbit", "Orbit"], ["dolly", "Dolly in"], ["crane", "Crane up"]], { sec: "Scene sinematik" }), N("shot_duration", "Durasi shot (dtk)", { sec: "Scene sinematik", ph: 6, min: 1, max: 120 })
      ],
      layout: [
        S("scene.lighting", "Pencahayaan scene", [["soft", "Lembut"], ["warm", "Hangat"], ["dramatic", "Dramatis"], ["night", "Malam"]], { sec: "Pencahayaan", def: "soft" }),
        N("scene.light_intensity", "Intensitas cahaya utama", { sec: "Pencahayaan", ph: 1, min: 0, max: 10 }),
        S("scene.camera_preset", "Pergerakan kamera bawaan", [["orbit", "Orbit"], ["dolly", "Dolly maju"], ["crane", "Crane naik"], ["static", "Statis"]], { sec: "Kamera", def: "dolly" }),
        N("scene.fov", "Sudut pandang (FOV °)", { sec: "Kamera", ph: 45, min: 20, max: 90 }), N("scene.camera_speed", "Kecepatan kamera", { sec: "Kamera", ph: 1, min: 0.1, max: 5 }),
        B("scene.autoplay", "Putar otomatis saat dibuka", { sec: "Kamera", def: true })
      ]
    },

    /* ======================= LUXE: 3D live guest ======================= */
    luxe: {
      title: "Luxe (3D Live Guest)", renderer: "Virtual venue",
      intro: "Venue virtual, avatar, furniture, objek interaktif, dan aset mini game untuk tamu live.",
      groups: [
        { key: "venue_bg", label: "Background virtual venue", hint: "Gambar latar (PNG/JPG/WebP) atau model lingkungan (GLB/glTF).", cats: ["virtual-environment"], fields: ["venue_kind"], slots: ["virtual_venue", "venue_backdrop"] },
        { key: "venue_model", label: "Model 3D venue & area interaktif", hint: "Model ruangan/area. Tandai zona agar renderer tahu fungsinya.", cats: ["virtual-environment", "venue-decoration"], fields: ["zone"], slots: ["venue_model", "interactive_area"] },
        { key: "avatar", label: "Avatar (pria, wanita, pengantin, tamu)", hint: "Model avatar GLB/glTF. Peran menentukan kategori otomatis.", cats: ["guest-avatar", "couple-avatar"], fields: ["avatar_role", "has_clip", "idle_clip", "walk_clip"], slots: ["avatar_male", "avatar_female", "avatar_groom", "avatar_bride", "avatar_guest"] },
        { key: "furniture", label: "Furniture & dekorasi", hint: "Furniture/dekorasi 3D. Isi jumlah tempat duduk bila bisa diduduki.", cats: ["furniture-3d", "venue-decoration"], fields: ["sit_slots", "collidable"], slots: ["furniture", "venue_decoration"] },
        { key: "interactive", label: "Interactive objects", hint: "Objek yang bisa diklik/didekati tamu.", cats: ["interactive-objects"], fields: ["interaction", "label"], slots: ["interactive_objects"] },
        { key: "minigame", label: "Asset mini games", hint: "Aset untuk mini game venue (model, sprite, UI, efek).", cats: ["minigame-assets"], fields: ["game_key", "game_role"], slots: ["mini_game_assets"] },
        { key: "other", label: "UI, audio, partikel, texture & HDR", hint: "Ikon UI, audio ambience, efek partikel, texture, HDR.", cats: ["ui-icons", "audio", "particle-effects", "texture", "hdr-environment"], fields: [], slots: ["ui_icons", "venue_audio", "venue_particles"] }
      ],
      fields: {
        venue_kind: S("venue_kind", "Jenis latar", [["backdrop", "Gambar latar (backdrop)"], ["skybox", "Skybox"], ["model", "Model lingkungan 3D"]]),
        zone: S("zone", "Zona", [["aula", "Aula utama"], ["panggung", "Panggung"], ["pelaminan", "Pelaminan"], ["taman", "Taman"], ["makan", "Area makan"], ["pintu", "Pintu masuk"], ["interaktif", "Area interaktif"]]),
        avatar_role: S("avatar_role", "Peran avatar", [["pria", "Tamu pria"], ["wanita", "Tamu wanita"], ["tamu", "Tamu umum"], ["pengantin_pria", "Pengantin pria"], ["pengantin_wanita", "Pengantin wanita"]], { req: 1, catMap: { pria: "guest-avatar", wanita: "guest-avatar", tamu: "guest-avatar", pengantin_pria: "couple-avatar", pengantin_wanita: "couple-avatar" } }),
        has_clip: B("has_clip", "Memiliki animasi bawaan"),
        idle_clip: T("idle_clip", "Clip diam (idle)", { max: 60 }), walk_clip: T("walk_clip", "Clip berjalan", { max: 60 }),
        sit_slots: N("sit_slots", "Jumlah tempat duduk", { min: 0, max: 50, ph: 0 }), collidable: B("collidable", "Menghalangi jalan (collision)", { def: true }),
        interaction: S("interaction", "Jenis interaksi", [["klik", "Klik"], ["duduk", "Duduk"], ["ambil", "Ambil"], ["buka", "Buka"], ["minigame", "Memulai mini game"]], { req: 1 }), label: T("label", "Label saat didekati", { max: 40 }),
        game_key: T("game_key", "Kunci mini game", { max: 30, pat: "^[a-z][a-z0-9_]*$", help: "Huruf kecil/angka/_, mis. lempar_bunga." }), game_role: S("game_role", "Peran aset", [["model", "Model 3D"], ["sprite", "Sprite 2D"], ["ui", "UI game"], ["efek", "Efek"]])
      },
      slots: [
        { key: "virtual_venue", label: "Venue virtual", group: "venue_bg" }, { key: "venue_backdrop", label: "Backdrop venue", group: "venue_bg" },
        { key: "venue_model", label: "Model venue", group: "venue_model" }, { key: "interactive_area", label: "Area interaktif", group: "venue_model" },
        { key: "avatar_male", label: "Avatar pria", group: "avatar" }, { key: "avatar_female", label: "Avatar wanita", group: "avatar" }, { key: "avatar_groom", label: "Avatar pengantin pria", group: "avatar" }, { key: "avatar_bride", label: "Avatar pengantin wanita", group: "avatar" }, { key: "avatar_guest", label: "Avatar tamu", group: "avatar" },
        { key: "furniture", label: "Furniture", group: "furniture" }, { key: "venue_decoration", label: "Dekorasi venue", group: "furniture" },
        { key: "interactive_objects", label: "Objek interaktif", group: "interactive" }, { key: "mini_game_assets", label: "Aset mini game", group: "minigame" },
        { key: "ui_icons", label: "Ikon UI", group: "other" }, { key: "venue_audio", label: "Audio venue", group: "other" }, { key: "venue_particles", label: "Partikel venue", group: "other" }
      ],
      config: [
        N("x", "Posisi X", { sec: "Posisi di venue", ph: 0 }), N("y", "Posisi Y", { sec: "Posisi di venue", ph: 0 }), N("z", "Posisi Z", { sec: "Posisi di venue", ph: 0 }),
        N("ry", "Rotasi (°)", { sec: "Rotasi & skala", ph: 0, min: -360, max: 360 }), N("scale", "Skala", { sec: "Rotasi & skala", ph: 1, min: 0.01, max: 100 }),
        S("collision", "Collision", [["none", "Tanpa collision"], ["box", "Kotak (box)"], ["mesh", "Mengikuti bentuk (mesh)"]], { sec: "Collision" }), N("collision_size", "Ukuran collision (satuan)", { sec: "Collision", ph: 1, min: 0.1, max: 50 }),
        S("interaction", "Interaksi", [["none", "Tidak ada"], ["sit", "Duduk"], ["click", "Klik"], ["pickup", "Ambil"], ["open", "Buka"], ["minigame", "Mulai mini game"]], { sec: "Interaksi" }), T("interaction_label", "Label interaksi", { sec: "Interaksi", max: 40 }),
        N("interaction_radius", "Jarak interaksi (satuan)", { sec: "Interaksi", ph: 1.5, min: 0.2, max: 20 }), T("minigame_key", "Kunci mini game", { sec: "Interaksi", max: 30, pat: "^[a-z][a-z0-9_]*$" })
      ],
      layout: [
        N("venue.capacity", "Kapasitas tamu live", { sec: "Venue", ph: 50, min: 1, max: 500 }),
        S("venue.collision_default", "Collision bawaan objek", [["none", "Tanpa"], ["box", "Kotak"]], { sec: "Venue", def: "box" }),
        { k: "venue.spawns", l: "Titik spawn tamu", t: "points", sec: "Spawn point", help: "Posisi awal tamu masuk venue (X dan Z di lantai). Maks. 12 titik.", max: 12 }
      ]
    }
  };
})();
