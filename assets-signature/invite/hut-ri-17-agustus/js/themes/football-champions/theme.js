import { defineTheme } from '../types.js';
import shots from './shots.json.js';
/**
 * FOOTBALL CHAMPIONS BIRTHDAY — "Night of the Champions".
 * International night stadium: full stands, green pitch with markings, goals with nets, four floodlight
 * towers, LED scoreboard, club flags and championship banners, a championship stage (LED stairs,
 * emblem backdrop, white-gold throne sofa), giant gold trophies, scattered footballs, hanging jerseys,
 * gold stars and football gift boxes, plus the eight interactive-area kiosks.
 * Palette: royal/navy blue, metallic gold, pitch green, white.
 *
 * The world is procedural (scripts/generators/football_world.py → compound.glb) and is a PLACEHOLDER
 * venue: it is replaced by the supplied venue GLB through `world.modelUrl` (same contract: Y-up,
 * metres, ground y = 0, front +Z). The camera film is shared with the other themes, so the stage must
 * stay at z = 8..18 (spot 'pelaminan' z = 13) and the stands outside x ±46 / z < -26.
 *
 * REPLACEABLE ASSET SLOTS:
 *   VENUE_MODEL    → world.modelUrl   (compound.glb today)
 *   CHILD_AVATAR   → characters.coupleModelUrl  (avatar.glb, the supplied chibi footballer)
 * See docs/football-champions-assets.md.
 */
export default defineTheme({
    id: 'football-champions',
    label: 'Football Champions Birthday',
    description: 'Night of the Champions: international night stadium, floodlights, LED scoreboard, championship stage and giant gold trophy in navy, gold and pitch green.',
    palette: {
        ivory: '#F4F6FB',
        champagne: '#D9DEEC',
        gold: '#E8B92E',
        blush: '#F2C23A',
        sage: '#2F8F3A',
        ink: '#14275F',
        // gold, royal blue, white, navy, pitch green confetti
        flowerPalette: ['#F2C23A', '#1F4FBF', '#FFFFFF', '#E8B92E', '#3F78FF', '#14275F'],
        blossom: ['#1b3a6e', '#2f8f3a'],
        hydrangea: ['#FFFFFF', '#F2C23A', '#1F4FBF', '#D9DEEC', '#E8B92E'],
        sky: { zenith: '#040a1e', mid: '#0c1f4d', horizon: '#1d3b82', sun: '#bcd2ff', fog: '#0b1633' },
        light: { sun: '#a9c2ff', sky: '#5b7dd0', ground: '#1c3a22' },
        ground: { grassA: '#2f8f3a', grassB: '#3aa046', lawn: '#2f8f3a', far: '#1f4d2c', bladeBase: '#1f6a2c', bladeTip: '#6cc062' },
    },
    world: {
        kind: 'glb',
        modelUrl: '/assets/themes/football-champions/compound.glb', // VENUE_MODEL
        footprint: { minX: -64, maxX: 64, minZ: -56, maxZ: 54 },
        sunDirection: [-0.3, 0.9, 0.45],
        sunIntensity: 1.1,
        hemiIntensity: 0.85,
        terrain: { center: [0, 0, 0], flatRadius: 110, hillHeight: 0 },
        landmark: { type: 'none', position: [0, 0, -400] },
        distantHills: false,
        lampMaterial: 'lamp',
        lampColor: '#fff2cf',
        shinyMaterials: ['gold', 'bright_gold', 'stage_led', 'steel'],
        // floodlights over the pitch + stage glow
        interiorLights: [
            { position: [-30, 26, -10], color: '#e8efff', intensity: 900, distance: 80 },
            { position: [30, 26, -10], color: '#e8efff', intensity: 900, distance: 80 },
            { position: [-30, 26, 40], color: '#e8efff', intensity: 900, distance: 80 },
            { position: [30, 26, 40], color: '#e8efff', intensity: 900, distance: 80 },
            { position: [0, 6, 14], color: '#ffd77a', intensity: 160, distance: 28 },
            { position: [0, 16, -44], color: '#6f9bff', intensity: 220, distance: 40 },
        ],
        // falling gold + blue confetti
        petals: ['#F2C23A', '#1F4FBF', '#FFFFFF', '#E8B92E'],
        props: [{ type: 'welcomeEasel', pose: [6, 0, 53, -0.35], heading: 'SELAMAT ULANG TAHUN' }],
        labels: { opening: 'Membuka gerbang stadion', model: 'Menyalakan lampu stadion', surroundings: 'Memasang bendera dan dekorasi juara', characters: 'Menyiapkan jersey sang juara', ready: 'Siap' },
    },
    // CHILD_AVATAR: the supplied 3D chibi birthday boy (blue jersey, number, champion medal, ball) —
    // Meshy export web-packed with scripts/generators/pack_glb.py (geometry untouched, 5.5 MB). Faces +Z.
    characters: { coupleModelUrl: '/assets/themes/football-champions/avatar.glb', height: 1.6 },
    // Birthday copy (replaces the sample wedding wording; the dashboard/DB content overrides it per invitation)
    defaults: {
        locale: 'id',
        solo: true,
        nameOrder: 'groom-first',
        groom: {
            nickname: 'Arka',
            fullName: 'Arka Putra Wijaya',
            parentsLabel: 'Putra dari',
            father: 'Bapak Dimas Wijaya',
            mother: 'Ibu Laras Wijaya',
            instagram: '',
            photo: '',
        },
        weddingDateLabel: 'Sabtu · 12 Desember 2026',
        weddingDateISO: '2026-12-12T15:00:00+07:00',
        location: { city: 'Jakarta', region: 'DKI Jakarta' },
        ceremony: {
            title: 'Kick-Off Ulang Tahun',
            start: '2026-12-12T15:00',
            end: '2026-12-12T17:00',
            dateLabel: 'Sabtu, 12 Desember 2026',
            timeLabel: '15.00 – 17.00 WIB',
            venue: 'Stadion Mini Nusa Arena',
            address: 'Jl. Merdeka No. 7, Jakarta',
            mapsUrl: '',
        },
        reception: {
            title: 'Pesta Juara & Tiup Lilin',
            start: '2026-12-12T17:00',
            end: '2026-12-12T20:00',
            dateLabel: 'Sabtu, 12 Desember 2026',
            timeLabel: '17.00 – 20.00 WIB',
            venue: 'Stadion Mini Nusa Arena',
            address: 'Jl. Merdeka No. 7, Jakarta',
            mapsUrl: '',
        },
        story: [
            { year: '2019', title: 'Hari Kelahiran', text: 'Seorang jagoan kecil lahir dan langsung mencuri hati seluruh keluarga.', image: '' },
            { year: '2022', title: 'Tendangan Pertama', text: 'Bola pertama menggelinding di halaman rumah, dan sejak itu Arka tak pernah lepas dari lapangan.', image: '' },
            { year: '2025', title: 'Bergabung ke Tim', text: 'Seragam biru, nomor punggung 7, dan semangat juara di setiap latihan.', image: '' },
            { year: '2026', title: 'Usia 7 Tahun', text: 'Saatnya merayakan ulang tahun ke-7 di stadion impian, dan kami ingin kamu hadir menjadi bagian dari tim.', image: '' },
        ],
        text: {
            eyebrow: 'Ulang Tahun ke-7',
            openButton: 'Buka Undangan',
            guestGreeting: 'Kepada Yth.',
            defaultGuest: 'Tamu Undangan',
            introVerse: 'Setiap anak adalah juara. Hari ini kita rayakan semangat, tawa, dan mimpi besar seorang jagoan kecil.',
            introVerseSource: 'Football Champions Birthday Party',
            introInvite: 'Dengan penuh sukacita, kami mengundang kamu ke pesta ulang tahun',
            coupleEyebrow: 'Sang Juara Kecil',
            storyEyebrow: 'Perjalanan Sang Juara',
            ceremonyEyebrow: 'Catat Tanggalnya',
            countdownLabel: 'Menuju hari pertandingan',
            mapButton: 'Buka peta',
            calendarButton: 'Tambah ke kalender',
            closingTitle: 'Ayo rayakan ulang tahun sang juara bersama kami',
            closingText: 'Terima kasih sudah menjadi bagian dari tim kami. Kehadiran dan doa kamu adalah hadiah terbaik.',
            closingSignoff: 'Salam juara,',
            replayButton: 'Tonton lagi',
            chapterLabel: 'Bab',
            chapterOf: 'dari',
            countdownUnits: ['hari', 'jam', 'menit', 'detik'],
            loadingLabel: 'Menyalakan lampu stadion',
        },
    },
    shots: shots,
});
