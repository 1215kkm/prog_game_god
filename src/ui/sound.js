// Procedural sound effects using Web Audio API
// No external audio files needed

export class SoundSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            this.enabled = false;
        }
    }

    // Must be called from a user gesture (click/tap)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    play(sound) {
        if (!this.enabled || !this.ctx) return;
        try {
            switch (sound) {
                case 'click': this.playClick(); break;
                case 'rain': this.playRain(); break;
                case 'thunder': this.playThunder(); break;
                case 'wind': this.playWind(); break;
                case 'bless': this.playBless(); break;
                case 'earthquake': this.playEarthquake(); break;
                case 'build': this.playBuild(); break;
                case 'birth': this.playBirth(); break;
                case 'death': this.playDeath(); break;
                case 'era': this.playEra(); break;
            }
        } catch (e) {
            // Silently fail if audio context is not ready
        }
    }

    createOsc(type, freq, duration, vol = this.volume) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playClick() {
        this.createOsc('sine', 800, 0.05, 0.1);
    }

    playRain() {
        // White noise burst
        const duration = 0.3;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.05;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
    }

    playThunder() {
        // Low rumble + crack
        this.createOsc('sawtooth', 60, 0.8, this.volume * 0.4);
        setTimeout(() => this.createOsc('square', 200, 0.1, this.volume * 0.3), 50);
        // Noise burst
        const duration = 1.0;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3)) * 0.3;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = this.volume * 0.5;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
    }

    playWind() {
        const duration = 0.5;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let prev = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (prev + 0.02 * white) / 1.02;
            prev = data[i];
            data[i] *= 3;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
    }

    playBless() {
        // Ascending chime
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createOsc('sine', freq, 0.4, this.volume * 0.2);
            }, i * 100);
        });
    }

    playEarthquake() {
        // Deep rumble
        this.createOsc('sine', 30, 1.5, this.volume * 0.5);
        this.createOsc('sawtooth', 40, 1.0, this.volume * 0.3);
    }

    playBuild() {
        // Hammer sound
        this.createOsc('square', 400, 0.05, this.volume * 0.15);
        setTimeout(() => this.createOsc('square', 350, 0.05, this.volume * 0.12), 80);
    }

    playBirth() {
        // Happy chime
        this.createOsc('sine', 660, 0.15, this.volume * 0.15);
        setTimeout(() => this.createOsc('sine', 880, 0.2, this.volume * 0.12), 100);
    }

    playDeath() {
        // Low sad tone
        this.createOsc('sine', 220, 0.4, this.volume * 0.15);
        this.createOsc('sine', 185, 0.5, this.volume * 0.1);
    }

    playEra() {
        // Fanfare
        const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createOsc('square', freq, 0.3, this.volume * 0.15);
                this.createOsc('sine', freq, 0.4, this.volume * 0.1);
            }, i * 150);
        });
    }

    // ===== AMBIENT BGM SYSTEM =====
    // Procedural lo-fi ambient music generator
    // Creates gentle, evolving background music with no external files

    startBGM() {
        if (!this.ctx || !this.enabled) return;
        if (this.bgmPlaying) return;

        this.bgmPlaying = true;
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0;
        this.bgmGain.connect(this.ctx.destination);

        // Fade in
        this.bgmGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 3);

        // Start ambient layers
        this.bgmPadLoop();
        this.bgmMelodyLoop();
        this.bgmNatureLoop();
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.bgmGain) {
            this.bgmGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
        }
        if (this.bgmPadTimer) clearTimeout(this.bgmPadTimer);
        if (this.bgmMelodyTimer) clearTimeout(this.bgmMelodyTimer);
        if (this.bgmNatureTimer) clearTimeout(this.bgmNatureTimer);
    }

    // Pad layer: slow evolving chords
    bgmPadLoop() {
        if (!this.bgmPlaying || !this.ctx) return;

        // Pentatonic-friendly chord tones for peaceful feeling
        const chords = [
            [130.81, 164.81, 196.00],  // C3, E3, G3
            [146.83, 174.61, 220.00],  // D3, F3, A3
            [164.81, 196.00, 246.94],  // E3, G3, B3
            [174.61, 220.00, 261.63],  // F3, A3, C4
            [196.00, 246.94, 293.66],  // G3, B3, D4
        ];

        const chord = chords[Math.floor(Math.random() * chords.length)];
        const duration = 6 + Math.random() * 4;

        for (const freq of chord) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.value = freq;

            // Gentle detune for warmth
            osc.detune.value = (Math.random() - 0.5) * 10;

            filter.type = 'lowpass';
            filter.frequency.value = 400 + Math.random() * 200;
            filter.Q.value = 1;

            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 2);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.bgmGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration + 0.1);
        }

        this.bgmPadTimer = setTimeout(() => this.bgmPadLoop(), (duration - 1) * 1000);
    }

    // Melody layer: sparse pentatonic notes
    bgmMelodyLoop() {
        if (!this.bgmPlaying || !this.ctx) return;

        // Pentatonic scale notes (C major pentatonic, octave 4-5)
        const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

        // Sometimes skip to create space
        if (Math.random() < 0.4) {
            this.bgmMelodyTimer = setTimeout(() => this.bgmMelodyLoop(), 2000 + Math.random() * 3000);
            return;
        }

        const freq = notes[Math.floor(Math.random() * notes.length)];
        const duration = 1.5 + Math.random() * 2;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Alternate between sine (bell-like) and triangle (soft)
        osc.type = Math.random() < 0.6 ? 'sine' : 'triangle';
        osc.frequency.value = freq;

        filter.type = 'lowpass';
        filter.frequency.value = 800;

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.025, this.ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration + 0.1);

        const nextDelay = 1500 + Math.random() * 4000;
        this.bgmMelodyTimer = setTimeout(() => this.bgmMelodyLoop(), nextDelay);
    }

    // Nature layer: gentle noise bursts (wind, water ambiance)
    bgmNatureLoop() {
        if (!this.bgmPlaying || !this.ctx) return;

        const duration = 3 + Math.random() * 4;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Brownian noise (soft, wind-like)
        let prev = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (prev + 0.015 * white) / 1.015;
            prev = data[i];
            data[i] *= 2.5;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 200 + Math.random() * 300;
        filter.Q.value = 0.5;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.015, this.ctx.currentTime + 1);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        source.start();

        this.bgmNatureTimer = setTimeout(() => this.bgmNatureLoop(), (duration + 1) * 1000);
    }

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stopBGM();
        }
        return this.enabled;
    }
}
