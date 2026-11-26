/* Data portofolio NusaMora. Satu sumber untuk /portofolio, /portofolio/<slug>, dan seksi beranda.
   Menambah proyek = tambah satu objek di NM_PORTFOLIO.projects. Tidak perlu mengubah kode lain.

   status: "live-demo" | "concept" | "template" | "coming-soon"
   demoUrl: isi HANYA bila demo benar-benar ada (path "/live/..." yang ada di repo atau https). Kosongkan (null) bila belum ada;
            tombol demo tidak akan tampil.
   Semua proyek di bawah adalah konsep showcase kreatif, bukan proyek pelanggan. Jangan ubah menjadi klaim proyek pelanggan
   tanpa verifikasi. Visual memakai tangkapan template NusaMora yang paling mendekati konsep (lihat visualNote); ganti dengan
   render final saat tersedia. */
(function () {
  var IMG = "/assets/img/";
  window.NM_PORTFOLIO = {
    categories: [
      { key: "all", label: "All Experiences" },
      { key: "wedding", label: "Wedding" },
      { key: "engagement", label: "Engagement" },
      { key: "birthday", label: "Birthday" },
      { key: "anniversary", label: "Anniversary" },
      { key: "graduation", label: "Graduation" },
      { key: "religious", label: "Religious Events" },
      { key: "school", label: "School Events" },
      { key: "corporate", label: "Corporate Events" },
      { key: "virtual", label: "Virtual Experiences" }
    ],
    statuses: {
      "live-demo": "Live Demo",
      "concept": "Concept Showcase",
      "template": "Available Template",
      "coming-soon": "Coming Soon"
    },
    statusNotes: {
      "live-demo": "A working demo you can open and try yourself.",
      "concept": "A creative concept that shows what is possible. Not a customer project.",
      "template": "Built from a template you can use today.",
      "coming-soon": "Announced, not yet published."
    },
    visualNote: "Visual: tangkapan template NusaMora yang paling mendekati konsep ini. Render final akan menggantikannya.",
    projects: [
      {
        id: "pf-001", slug: "secret-garden-wedding", title: "Secret Garden Wedding", category: "wedding", alsoIn: ["virtual"],
        short: "An enchanting wedding experience surrounded by romantic gardens, floral decorations, and elegant architectural details.",
        full: "Guests step through a floral arch into a hidden garden, choose an avatar, and wander a romantic wedding stage lit by soft, warm light. Every corner is designed to feel like a quiet discovery: petals, pastel blooms, and elegant architectural details.",
        concept: "A garden that feels secret, intimate, and quietly magical, where the guest is invited in rather than simply shown a page.",
        inspiration: "Secret garden, pink flowers, a floral arch, a romantic wedding stage, soft pastel colors, and elegant lighting.",
        experience: "Guests enter the venue as avatars, meet other guests live, leave notes in the guestbook, browse the photo gallery, and play small games together.",
        theme: "Romantic garden, soft pastel pink",
        features: ["3D Virtual Venue", "Avatar Interaction", "Live Guest", "Interactive Guestbook", "Photo Gallery", "Mini Games"],
        cover: { src: IMG + "romantic-garden-s1.webp", alt: "Layar pemilihan karakter berlatar taman bunga merah muda dengan lengkung bunga", pos: "50% 45%" },
        gallery: [
          { src: IMG + "live-sage-garden.webp", alt: "Venue 3D bergaya taman dengan karpet hijau dan avatar tamu" },
          { src: IMG + "signature-dusk-flower-garden.webp", alt: "Pasangan avatar di taman bunga saat senja" }
        ],
        demoUrl: null, status: "concept", featured: true
      },
      {
        id: "pf-002", slug: "mediterranean-romance", title: "Mediterranean Romance", category: "wedding", alsoIn: ["virtual"],
        short: "A Mediterranean-inspired wedding experience featuring beautiful coastal architecture, white buildings, blue domes, and romantic scenery.",
        full: "A coastal celebration built around white walls, blue accents, and open-air elegance. Guests arrive at an outdoor wedding venue where the palette stays calm and the details stay refined.",
        concept: "The calm of a seaside town translated into a wedding venue: white and blue, light and air.",
        inspiration: "Santorini-inspired architecture, a white and blue palette, Mediterranean flowers, ocean views, and an elegant outdoor wedding.",
        experience: "Guests explore the venue with avatars, chat in real time, and browse the photo gallery.",
        theme: "Coastal white and blue",
        features: ["3D Virtual Venue", "Interactive Avatars", "Guest Interaction", "Live Chat", "Photo Gallery"],
        cover: { src: IMG + "live-blue-elegance.webp", alt: "Venue 3D bernuansa putih dan biru dengan karpet biru dan avatar tamu", pos: "50% 42%" },
        gallery: [
          { src: IMG + "live-blue-elegance.webp", alt: "Venue pernikahan bernuansa putih dan biru dengan dekorasi bunga" }
        ],
        demoUrl: null, status: "concept", featured: false
      },
      {
        id: "pf-003", slug: "japanese-winter-wedding", title: "Japanese Winter Wedding", category: "wedding", alsoIn: ["virtual"],
        short: "A magical winter wedding inspired by traditional Japanese architecture and beautiful snowy landscapes.",
        full: "Traditional Japanese architecture meets a quiet winter landscape. Guests walk past lanterns and red bridges toward a ceremony stage framed by sakura, in a world designed to feel peaceful and ceremonial.",
        concept: "A winter scene where tradition and stillness set the tone for the celebration.",
        inspiration: "Snow-covered Japanese temples, traditional architecture, winter sakura, red bridges, Japanese lanterns, and traditional wedding attire.",
        experience: "Guests explore the grounds as avatars, greet each other live, sign the guestbook, and join mini games.",
        theme: "Japanese winter, sakura pink",
        features: ["3D Virtual Venue", "Interactive Avatars", "Live Guest", "Mini Games", "Guestbook"],
        cover: { src: IMG + "live-sakura-wedding.webp", alt: "Venue 3D bertema sakura dan arsitektur Jepang dengan avatar mempelai", pos: "50% 40%" },
        gallery: [
          { src: IMG + "live-sakura-wedding.webp", alt: "Taman sakura dengan jembatan merah dan lentera di venue 3D" }
        ],
        demoUrl: null, status: "concept", featured: true
      },
      {
        id: "pf-004", slug: "golden-anniversary", title: "Golden Anniversary", category: "anniversary", alsoIn: ["virtual"],
        short: "A memorable celebration of 50 years of love, commitment, and family memories.",
        full: "A warm, golden celebration of a lifetime together. Family photos, spoken wishes, and a stage dressed in gold and flowers turn fifty years into a shared moment for everyone who is invited.",
        concept: "A celebration that honors a long story, with space for the whole family to add to it.",
        inspiration: "Elegant gold decoration, a golden anniversary stage, floral arrangements, a family photo gallery, and warm lighting.",
        experience: "Guests leave digital wishes, browse the family photo gallery, and celebrate together live.",
        theme: "Champagne gold, warm light",
        features: ["Interactive Guestbook", "Digital Wishes", "Family Photo Gallery", "Mini Games", "Live Guest Interaction"],
        cover: { src: IMG + "signature-golden-hour-estate.webp", alt: "Pasangan avatar di taman dengan cahaya keemasan", pos: "50% 55%" },
        gallery: [
          { src: IMG + "signature-golden-hour-estate.webp", alt: "Pasangan avatar saat cahaya keemasan di taman" },
          { src: IMG + "live-anniversary.webp", alt: "Venue 3D dengan panggung ungu dan emas serta dekorasi perayaan" }
        ],
        demoUrl: null, status: "concept", featured: false
      },
      {
        id: "pf-005", slug: "japanese-high-school", title: "Japanese High School", category: "school", alsoIn: ["virtual"],
        short: "An interactive Japanese-inspired virtual classroom where students can explore, meet other participants, and interact with the classroom environment.",
        full: "A virtual classroom in a pastel Japanese school setting. Students move around as chibi avatars, meet each other, and interact with objects in the room.",
        concept: "A school event that feels like a place students can walk around in.",
        inspiration: "A Japanese high school classroom, sakura trees, wooden desks, chibi student avatars, and a pastel pink theme.",
        experience: "Participants choose avatars, move with a virtual joystick, chat, use emotes, and see who else is in the room.",
        theme: "Pastel pink, sakura",
        features: ["Multiple Avatars", "Virtual Joystick", "Interactive Objects", "Participant List", "Chat", "Avatar Emotes"],
        cover: { src: IMG + "live-hardiknas.webp", alt: "Venue 3D bertema sekolah dengan papan tulis dan avatar siswa", pos: "50% 38%" },
        gallery: [
          { src: IMG + "live-hardiknas.webp", alt: "Ruang acara sekolah 3D dengan panggung dan avatar siswa" },
          { src: IMG + "live-guru.webp", alt: "Ruang kelas 3D bertema Hari Guru dengan papan tulis" }
        ],
        demoUrl: null, status: "concept", featured: false
      },
      {
        id: "pf-006", slug: "corporate-town-hall", title: "Corporate Town Hall", category: "corporate", alsoIn: ["virtual"],
        short: "An interactive virtual corporate meeting environment designed to create more engaging employee experiences.",
        full: "A modern virtual stage with a presentation screen and audience seating. Participants join as avatars, follow the presentation, and interact through chat.",
        concept: "A company meeting where the audience is present in a shared space instead of being a grid of faces.",
        inspiration: "A modern corporate stage, a presentation screen, audience seating, professional lighting, and elegant event decorations.",
        experience: "A live presentation on the stage, a virtual audience, interactive chat, and participant interaction.",
        theme: "Corporate blue and violet",
        features: ["Virtual Audience", "Interactive Chat", "Live Presentation", "Participant Interaction"],
        cover: { src: IMG + "live-seminar.webp", alt: "Venue seminar 3D dengan panggung, layar presentasi, dan kursi audiens", pos: "50% 40%" },
        gallery: [
          { src: IMG + "live-seminar.webp", alt: "Panggung virtual dengan layar presentasi dan podium" }
        ],
        demoUrl: null, status: "concept", featured: true
      }
    ]
  };
})();
