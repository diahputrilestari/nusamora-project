/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  WEDDING CONFIGURATION — the only file a customer edit should touch.
 *
 *  Every name, date, venue, story chapter, photo, colour and model path used
 *  by the experience is read from here. Scene code never hard-codes content.
 *  Leave a URL empty ("") to use the built-in procedural fallback.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { THEMES } from '../themes/index.js';
/**
 * ACTIVE THEME — switch the whole look (palette, 3D world, camera film) here.
 * Saved themes: 'minang-royal' · 'keraton-jawa' · 'dusk-flower-garden' · 'golden-hour-estate'
 * (see src/themes/; copy src/themes/_template to make a new one).
 */
export const THEME = 'bali-royal';
export const wedding = {
    locale: 'en',
    bride: {
        nickname: 'Anindya',
        fullName: 'Anindya Kirana Putri, S.Ds.',
        parentsLabel: 'Daughter of',
        father: 'Bapak H. Suryo Wibowo',
        mother: 'Ibu Hj. Ratna Dewi',
        instagram: '@anindyakirana',
        photo: '',
    },
    groom: {
        nickname: 'Raka',
        fullName: 'Raka Aditya Pratama, S.T.',
        parentsLabel: 'Son of',
        father: 'Bapak Ir. Hendra Gunawan',
        mother: 'Ibu Sri Lestari',
        instagram: '@rakaaditya',
        photo: '',
    },
    nameOrder: 'bride-first',
    weddingDateLabel: 'Saturday · 12 June 2027',
    weddingDateISO: '2027-06-12T08:00:00+07:00',
    location: { city: 'Bogor', region: 'West Java' },
    timezone: 'Asia/Jakarta',
    ceremony: {
        title: 'Akad Nikah',
        start: '2027-06-12T08:00',
        end: '2027-06-12T10:00',
        dateLabel: 'Saturday, 12 June 2027',
        timeLabel: '08.00 – 10.00 WIB',
        venue: 'Masjid Raya Bogor',
        address: 'Jl. Pajajaran No. 10, Bogor, West Java',
        mapsUrl: 'https://maps.google.com/?q=Masjid+Raya+Bogor',
    },
    reception: {
        title: 'Wedding Reception',
        start: '2027-06-12T11:00',
        end: '2027-06-12T14:00',
        dateLabel: 'Saturday, 12 June 2027',
        timeLabel: '11.00 – 14.00 WIB',
        venue: 'The Glass Garden Pavilion',
        address: 'Jl. Raya Puncak Km. 76, Cisarua, Bogor',
        mapsUrl: 'https://maps.google.com/?q=Cisarua+Bogor',
    },
    story: [
        {
            year: '2019',
            title: 'First Meeting',
            text: 'A rained-out design workshop in Bandung, one shared umbrella, and a conversation that lasted until the last train.',
            image: '',
        },
        {
            year: '2021',
            title: 'The Journey',
            text: 'Two cities, a thousand video calls and every long weekend spent finding our way back to each other.',
            image: '',
        },
        {
            year: '2026',
            title: 'The Proposal',
            text: 'At sunset by Lake Situ Gunung, Raka asked a question with a ring he had been hiding for three months. She said yes.',
            image: '',
        },
        {
            year: '2027',
            title: 'Forever Begins',
            text: 'With the blessing of both families, we are ready to begin our life together, and we would love you to be there.',
            image: '',
        },
    ],
    gallery: [],
    couplePhoto: '',
    text: {
        eyebrow: 'The Wedding of',
        openButton: 'Open Invitation',
        guestGreeting: 'Dear',
        defaultGuest: 'Honoured Guest',
        introVerse: 'And of His signs is that He created for you mates from among yourselves, that you may find tranquillity in them; and He placed between you affection and mercy.',
        introVerseSource: 'QS. Ar-Rum : 21',
        introInvite: 'Together with their families, request the honour of your presence',
        coupleEyebrow: 'The Bride & Groom',
        storyEyebrow: 'Our Love Story',
        ceremonyEyebrow: 'Save the Date',
        countdownLabel: 'Counting down to our day',
        mapButton: 'Open map',
        calendarButton: 'Add to calendar',
        closingTitle: 'We invite you to celebrate our special day',
        closingText: 'Thank you for being part of our journey. Your presence and prayers are the most precious gift.',
        closingSignoff: 'With love,',
        replayButton: 'Watch again',
    },
    audio: {
        musicUrl: '',
        musicVolume: 0.55,
        ambience: true,
    },
    characters: {
        brideModelUrl: '',
        groomModelUrl: '',
        modelScale: 1,
        idleClip: 'Idle',
    },
    // set by THEME at the top of this file — edit palettes in src/themes/<id>/theme.ts
    themeId: THEME,
    theme: THEMES[THEME].palette,
    experience: {
        autoplayDwell: 7.5,
        autoplayDefault: true,
        seed: 1206,
    },
};
/** Names in the configured order, e.g. ["Anindya", "Raka"] */
export function coupleNames(cfg = wedding) {
    return cfg.nameOrder === 'bride-first'
        ? [cfg.bride.nickname, cfg.groom.nickname]
        : [cfg.groom.nickname, cfg.bride.nickname];
}
export function monogram(cfg = wedding) {
    const [a, b] = coupleNames(cfg);
    return `${a[0]}${b[0]}`;
}
