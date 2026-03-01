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

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}
