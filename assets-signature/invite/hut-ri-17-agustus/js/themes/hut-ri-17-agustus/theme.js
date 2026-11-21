import { defineTheme } from '../types.js';
import shots from './shots.json.js';
/**
 * HUT RI 17 AGUSTUS — "Pesta Rakyat Merdeka".
 * Daytime village-green celebration: a stage with a red-and-white backdrop and rosette, flowing red and
 * white curtains, tall bamboo with umbul-umbul on both sides, flags and bunting, a music/entertainment
 * rig (speakers, truss lights, drums, keyboard), front stairs, a red carpet down the aisle and neat rows
 * of white-covered chairs on green grass. No people, no lettering in the venue.
 * Palette: red, white, green.
 *
 * The world is procedural (scripts/generators/merdeka_world.py → compound.glb): a placeholder venue that
 * can be replaced through `world.modelUrl` (same contract as every theme: Y-up, metres, ground y = 0,
 * front +Z, stage at z 8..18). `characters.none` keeps the stage empty.
 */
export default defineTheme({
    id: 'hut-ri-17-agustus',
    label: 'HUT RI 17 Agustus',
    description: 'Pesta rakyat kemerdekaan: panggung merah putih, tirai berkibar, bambu menjulang, karpet merah, dan deretan kursi putih di lapangan hijau.',
    palette: {
        ivory: '#FBF7F0',
        champagne: '#F1E6DA',
        gold: '#D9A21B',
        blush: '#F2B8B5',
        sage: '#2E8B3E',
        ink: '#5A1215',
        flowerPalette: ['#D7191F', '#FFFFFF', '#F7F4EE', '#E4424A', '#2E8B3E', '#D9A21B'],
        blossom: ['#FFFFFF', '#F5D0D2'],
        hydrangea: ['#FFFFFF', '#D7191F', '#F7F4EE', '#E4424A', '#FBE3E4'],
        sky: { zenith: '#4a90d9', mid: '#8dbdf0', horizon: '#dcebf8', sun: '#fff4d8', fog: '#d4e6f6' },
        light: { sun: '#fff1d2', sky: '#a8c8ee', ground: '#4f8f4a' },
        ground: { grassA: '#3C9A48', grassB: '#348C41', lawn: '#3C9A48', far: '#2f7a3a', bladeBase: '#2b7a37', bladeTip: '#74c46a' },
    },
    world: {
        kind: 'glb',
        modelUrl: 'assets/themes/hut-ri-17-agustus/compound.glb',
        footprint: { minX: -46, maxX: 46, minZ: -34, maxZ: 70 },
        sunDirection: [-0.45, 0.8, 0.55],
        sunIntensity: 2.4,
        hemiIntensity: 0.9,
        terrain: { center: [0, 0, 10], flatRadius: 80, hillHeight: 1.5 },
        landmark: { type: 'none', position: [0, 0, -400] },
        distantHills: true,
        lampMaterial: 'par',
        lampColor: '#fff3d0',
        shinyMaterials: ['gold', 'steel'],
        // red and white confetti-like petals drifting over the field
        petals: ['#D7191F', '#FFFFFF', '#F7F4EE', '#E4424A'],
        labels: { opening: 'Membuka gerbang lapangan', model: 'Memasang panggung merah putih', surroundings: 'Mengibarkan bendera dan bambu', characters: 'Menata kursi tamu', ready: 'Siap' },
    },
    // no figures on the stage
    characters: { none: true },
    defaults: {
        locale: 'id',
        solo: true,
        nameOrder: 'groom-first',
        groom: { nickname: 'Merdeka', fullName: 'HUT Kemerdekaan Republik Indonesia ke-82', parentsLabel: 'Panitia', father: 'Warga RT 05 / RW 02', mother: '', instagram: '', photo: '' },
        weddingDateLabel: 'Selasa · 17 Agustus 2027',
        weddingDateISO: '2027-08-17T08:00:00+07:00',
        location: { city: 'Jakarta', region: 'DKI Jakarta' },
        ceremony: {
            title: 'Upacara Bendera',
            start: '2027-08-17T08:00',
            end: '2027-08-17T10:00',
            dateLabel: 'Selasa, 17 Agustus 2027',
            timeLabel: '08.00 – 10.00 WIB',
            venue: 'Lapangan Merdeka Warga',
            address: 'Jl. Kemerdekaan No. 17, Jakarta',
            mapsUrl: '',
        },
        reception: {
            title: 'Panggung Hiburan & Lomba Rakyat',
            start: '2027-08-17T13:00',
            end: '2027-08-17T18:00',
            dateLabel: 'Selasa, 17 Agustus 2027',
            timeLabel: '13.00 – 18.00 WIB',
            venue: 'Lapangan Merdeka Warga',
            address: 'Jl. Kemerdekaan No. 17, Jakarta',
            mapsUrl: '',
        },
        story: [
            { year: '1945', title: 'Proklamasi', text: 'Pada 17 Agustus 1945, Soekarno dan Hatta membacakan proklamasi kemerdekaan Indonesia.', image: '' },
            { year: '1945', title: 'Sang Merah Putih', text: 'Bendera pusaka dikibarkan, menjadi lambang keberanian dan kesucian bangsa.', image: '' },
            { year: 'Hari ini', title: 'Gotong Royong', text: 'Dari lomba hingga panggung hiburan, semua dirayakan bersama warga dengan semangat kebersamaan.', image: '' },
            { year: '2027', title: 'Merdeka ke-82', text: 'Mari rayakan 82 tahun Indonesia merdeka dan jadi bagian dari perayaannya.', image: '' },
        ],
        text: {
            eyebrow: 'Perayaan Kemerdekaan RI ke-82',
            openButton: 'Buka Undangan',
            guestGreeting: 'Kepada Yth.',
            defaultGuest: 'Warga & Tamu Undangan',
            introVerse: 'Kemerdekaan adalah hasil perjuangan bersama, dan kita rayakan dengan persatuan, kegembiraan, dan rasa syukur.',
            introVerseSource: 'Dirgahayu Republik Indonesia',
            introInvite: 'Dengan penuh semangat kebersamaan, kami mengundang Anda ke perayaan',
            coupleEyebrow: 'Dirgahayu Indonesia',
            storyEyebrow: 'Jejak Perjuangan',
            ceremonyEyebrow: 'Catat Tanggalnya',
            countdownLabel: 'Menuju hari kemerdekaan',
            mapButton: 'Buka peta',
            calendarButton: 'Tambah ke kalender',
            closingTitle: 'Mari merayakan kemerdekaan bersama',
            closingText: 'Terima kasih sudah menjadi bagian dari perayaan ini. Kehadiran Anda membuat hari kemerdekaan semakin meriah.',
            closingSignoff: 'Merdeka! Salam hangat,',
            replayButton: 'Tonton lagi',
            chapterLabel: 'Bab',
            chapterOf: 'dari',
            countdownUnits: ['hari', 'jam', 'menit', 'detik'],
            loadingLabel: 'Menyiapkan lapangan',
        },
    },
    shots: shots,
});
