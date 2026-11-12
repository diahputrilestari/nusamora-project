/**
 * Audio for the invitation.
 *
 *  • Music: plays config.audio.musicUrl if set; otherwise a built-in
 *    generative score (soft felt-piano arpeggios over a warm string pad,
 *    with a synthetic hall reverb) so the product works with zero assets.
 *  • Ambience: procedural breeze, birdsong and water, cross-faded per scene.
 *
 * Browsers block audio until a user gesture, so nothing starts until
 * `start()` is called from the "Open Invitation" click.
 */
const CHORDS = [
    // I – vi – IV – V – I – iii – IV – V   (D major, voiced low→high, MIDI)
    [50, 57, 62, 66, 69],
    [47, 54, 59, 62, 66],
    [43, 50, 55, 59, 62],
    [45, 52, 57, 61, 64],
    [50, 57, 62, 66, 69],
    [42, 49, 54, 57, 61],
    [43, 50, 55, 59, 67],
    [45, 52, 57, 61, 64],
];
const MELODY = [74, 73, 71, 69, 71, 73, 74, 76, 78, 76, 74, 73, 71, 69, 71, 69];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
export class AudioEngine {
    constructor(musicUrl, musicVolume = 0.55, ambienceOn = true) {
        this.musicUrl = musicUrl;
        this.musicVolume = musicVolume;
        this.ambienceOn = ambienceOn;
        this.ctx = null;
        this.el = null;
        this.timer = null;
        this.nextTime = 0;
        this.beat = 0;
        this.birdTimer = null;
        this.ambience = { birds: 0.6, water: 0 };
        this.muted = false;
        this.started = false;
    }
    async start() {
        if (this.started)
            return;
        this.started = true;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC)
            return;
        this.ctx = new AC();
        await this.ctx.resume().catch(() => { });
        const ctx = this.ctx;
        this.master = ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(ctx.destination);
        this.musicBus = ctx.createGain();
        this.musicBus.gain.value = this.musicVolume;
        this.ambBus = ctx.createGain();
        this.ambBus.gain.value = this.ambienceOn ? 0.5 : 0;
        this.reverb = ctx.createConvolver();
        this.reverb.buffer = this.impulse(3.2, 2.6);
        const wet = ctx.createGain();
        wet.gain.value = 0.42;
        this.musicBus.connect(this.master);
        this.musicBus.connect(this.reverb);
        this.reverb.connect(wet);
        wet.connect(this.master);
        this.ambBus.connect(this.master);
        if (this.musicUrl)
            this.startFile();
        else
            this.startScore();
        if (this.ambienceOn)
            this.startAmbience();
        // smooth 3.5 s fade-in
        const now = ctx.currentTime;
        this.master.gain.setValueAtTime(0, now);
        this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 1, now + 3.5);
    }
    startFile() {
        const el = new Audio(this.musicUrl);
        el.loop = true;
        el.crossOrigin = 'anonymous';
        this.el = el;
        try {
            const src = this.ctx.createMediaElementSource(el);
            src.connect(this.musicBus);
        }
        catch {
            /* CORS-restricted file: play directly, volume via element */
            el.volume = this.musicVolume;
        }
        el.play().catch(() => {
            console.warn('[audio] music file could not play, falling back to generative score');
            this.el = null;
            this.startScore();
        });
    }
    /* ───────── generative score ───────── */
    startScore() {
        const ctx = this.ctx;
        this.nextTime = ctx.currentTime + 0.3;
        const spb = 60 / 66 / 2; // eighth notes at 66 bpm
        const schedule = () => {
            while (this.nextTime < ctx.currentTime + 0.6) {
                this.playBeat(this.beat, this.nextTime, spb);
                this.beat++;
                this.nextTime += spb;
            }
        };
        schedule();
        this.timer = window.setInterval(schedule, 120);
    }
    playBeat(beat, t, spb) {
        const bar = Math.floor(beat / 8);
        const chord = CHORDS[bar % CHORDS.length];
        const pos = beat % 8;
        if (pos === 0) {
            this.pad(chord.slice(0, 3).map((n) => n - 12), t, spb * 8.2);
            this.piano(chord[0] - 12, t, 0.34, 3.5);
        }
        // rolling arpeggio: 1-3-5-8-5-3-5-8
        const pattern = [1, 2, 3, 4, 3, 2, 3, 4];
        this.piano(chord[pattern[pos]], t + (Math.random() - 0.5) * 0.012, 0.13 + (pos === 0 ? 0.05 : 0), 2.2);
        // sparse melody every other bar
        if (bar % 2 === 1 && (pos === 0 || pos === 4)) {
            const note = MELODY[(Math.floor(bar / 2) * 2 + pos / 4) % MELODY.length];
            this.piano(note, t + 0.02, 0.2, 3);
        }
    }
    piano(note, t, vel, decay) {
        const ctx = this.ctx;
        const f = midi(note);
        const out = ctx.createGain();
        out.gain.setValueAtTime(0, t);
        out.gain.linearRampToValueAtTime(vel, t + 0.008);
        out.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.25);
        out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(Math.min(6000, f * 7), t);
        lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.5), t + decay * 0.8);
        lp.connect(out);
        out.connect(this.musicBus);
        const partials = [
            [1, 1, 'triangle'],
            [2, 0.28, 'sine'],
            [3, 0.08, 'sine'],
            [4.01, 0.04, 'sine'],
        ];
        for (const [mul, g, type] of partials) {
            const o = ctx.createOscillator();
            o.type = type;
            o.frequency.value = f * mul;
            o.detune.value = (Math.random() - 0.5) * 6;
            const og = ctx.createGain();
            og.gain.value = g;
            o.connect(og);
            og.connect(lp);
            o.start(t);
            o.stop(t + decay + 0.05);
        }
    }
    pad(notes, t, len) {
        const ctx = this.ctx;
        const out = ctx.createGain();
        out.gain.setValueAtTime(0, t);
        out.gain.linearRampToValueAtTime(0.045, t + len * 0.35);
        out.gain.linearRampToValueAtTime(0, t + len);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        lp.Q.value = 0.4;
        lp.connect(out);
        out.connect(this.musicBus);
        for (const n of notes) {
            for (const d of [-7, 7]) {
                const o = ctx.createOscillator();
                o.type = 'sawtooth';
                o.frequency.value = midi(n);
                o.detune.value = d;
                o.connect(lp);
                o.start(t);
                o.stop(t + len + 0.1);
            }
        }
    }
    impulse(seconds, decay) {
        const ctx = this.ctx;
        const len = Math.floor(ctx.sampleRate * seconds);
        const buf = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const d = buf.getChannelData(c);
            for (let i = 0; i < len; i++)
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
        return buf;
    }
    /* ───────── ambience ───────── */
    noiseSource() {
        const ctx = this.ctx;
        const len = ctx.sampleRate * 4;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
            const w = Math.random() * 2 - 1;
            last = (last + 0.02 * w) / 1.02; // brown-ish
            d[i] = last * 3.5;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        return src;
    }
    startAmbience() {
        const ctx = this.ctx;
        // breeze: brown noise, slowly modulated low-pass
        const wind = this.noiseSource();
        const wlp = ctx.createBiquadFilter();
        wlp.type = 'lowpass';
        wlp.frequency.value = 500;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.07;
        const lfoG = ctx.createGain();
        lfoG.gain.value = 260;
        lfo.connect(lfoG);
        lfoG.connect(wlp.frequency);
        this.windGain = ctx.createGain();
        this.windGain.gain.value = 0.16;
        wind.connect(wlp);
        wlp.connect(this.windGain);
        this.windGain.connect(this.ambBus);
        wind.start();
        lfo.start();
        // water: band-passed noise shimmer
        const water = this.noiseSource();
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1400;
        bp.Q.value = 0.6;
        this.waterGain = ctx.createGain();
        this.waterGain.gain.value = 0;
        water.connect(bp);
        bp.connect(this.waterGain);
        this.waterGain.connect(this.ambBus);
        water.start();
        this.birdsGain = ctx.createGain();
        this.birdsGain.gain.value = this.ambience.birds * 0.5;
        this.birdsGain.connect(this.ambBus);
        this.birdsGain.connect(this.reverb);
        const chirpLoop = () => {
            if (!this.ctx)
                return;
            if (Math.random() < 0.85)
                this.chirp();
            this.birdTimer = window.setTimeout(chirpLoop, 1200 + Math.random() * 3800);
        };
        chirpLoop();
    }
    chirp() {
        const ctx = this.ctx;
        const t = ctx.currentTime + 0.05;
        const base = 2600 + Math.random() * 1800;
        const notes = 2 + Math.floor(Math.random() * 4);
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) {
            pan.pan.value = Math.random() * 1.6 - 0.8;
            pan.connect(this.birdsGain);
        }
        for (let i = 0; i < notes; i++) {
            const s = t + i * (0.09 + Math.random() * 0.05);
            const o = ctx.createOscillator();
            o.type = 'sine';
            o.frequency.setValueAtTime(base, s);
            o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.4), s + 0.04);
            o.frequency.exponentialRampToValueAtTime(base * 0.9, s + 0.08);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, s);
            g.gain.linearRampToValueAtTime(0.05, s + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, s + 0.09);
            o.connect(g);
            g.connect(pan ?? this.birdsGain);
            o.start(s);
            o.stop(s + 0.1);
        }
    }
    setAmbience(a) {
        this.ambience = a;
        if (!this.ctx || !this.birdsGain)
            return;
        const t = this.ctx.currentTime;
        this.birdsGain.gain.setTargetAtTime(a.birds * 0.5, t, 1.2);
        this.waterGain.gain.setTargetAtTime(a.water * 0.05, t, 1.2);
    }
    setMuted(m) {
        this.muted = m;
        if (this.el && !this.ctx)
            this.el.muted = m;
        if (!this.ctx)
            return;
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setValueAtTime(this.master.gain.value, t);
        this.master.gain.linearRampToValueAtTime(m ? 0 : 1, t + 0.8);
    }
    /** Pause when the tab is hidden, resume on return */
    setSuspended(s) {
        if (!this.ctx)
            return;
        if (s) {
            this.ctx.suspend();
            this.el?.pause();
        }
        else {
            this.ctx.resume();
            this.el?.play().catch(() => { });
        }
    }
    dispose() {
        if (this.timer)
            clearInterval(this.timer);
        if (this.birdTimer)
            clearTimeout(this.birdTimer);
        this.el?.pause();
        this.ctx?.close();
        this.ctx = null;
    }
}
