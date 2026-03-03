import { TICKS_PER_DAY, DAYS_PER_SEASON, SEASONS, ERAS, TIME_SCALES } from './constants.js';
import { EventBus } from './eventBus.js';
import { Registry } from './registry.js';
import { World } from '../world/world.js';
import { Renderer3D } from '../ui/renderer3d.js';
import { Camera3D } from '../ui/camera3d.js';
import { EntityManager } from '../entities/entityManager.js';
import { WeatherSystem } from '../powers/weather.js';
import { GodPowers } from '../powers/godPowers.js';
import { SimulationEngine } from '../core/simulation.js';
import { UIManager } from '../ui/uiManager.js';
import { Minimap } from '../ui/minimap.js';
import { SoundSystem } from '../ui/sound.js';
import { CinematicCamera } from '../ui/cinematicCamera.js';
import { AmbientMode } from '../ui/ambientMode.js';
import { PlacementSystem } from '../ui/placementSystem.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        // Keep 2D context reference for minimap / legacy use
        this.ctx = null;
        try { this.ctx = canvas.getContext('2d'); } catch(e) {}

        this.running = false;
        this.speed = 1;
        this.tick = 0;
        this.day = 0;
        this.season = 0;
        this.year = 1;

        this.lastTime = 0;
        this.accumulator = 0;
        this.tickRate = 1000 / 30;

        // Max ticks per frame - increased for high speed modes
        this.maxTicksPerFrame = 10;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Extension systems
        this.events = new EventBus();
        this.registry = new Registry();

        // Core systems
        this.world = new World();
        this.camera3d = new Camera3D(this);
        this.entityManager = new EntityManager(this);
        this.weather = new WeatherSystem(this);
        this.godPowers = new GodPowers(this);
        this.simulation = new SimulationEngine(this);
        this.renderer = new Renderer3D(this);
        this.placementSystem = new PlacementSystem(this);
        this.ui = new UIManager(this);
        this.minimap = new Minimap(this);
        this.sound = new SoundSystem();
        this.cinematicCamera = new CinematicCamera(this);
        this.ambientMode = new AmbientMode(this);

        // Legacy camera reference for compatibility
        this.camera = this.camera3d;

        // 3D canvas reference (set by renderer)
        this.canvas3d = null;

        this.notifications = [];
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        const steps = [
            ['World generation', () => this.world.generate()],
            ['3D renderer init', () => this.renderer.init()],
            ['Camera controls', () => this.camera3d.setupControls()],
            ['Spawn entities', () => this.entityManager.spawnInitialEntities()],
            ['Minimap init', () => this.minimap.init()],
            ['UI init', () => this.ui.init()],
            ['Placement system', () => this.placementSystem.init()],
            ['Ambient mode', () => this.ambientMode.init()],
        ];

        for (const [name, fn] of steps) {
            try {
                console.log(`[Init] ${name}...`);
                fn();
                console.log(`[Init] ${name} ✓`);
            } catch (err) {
                console.error(`[Init] ${name} FAILED:`, err);
                this._showError(`Init failed at: ${name}\n${err.message || err}`);
                return; // Stop further initialization
            }
        }

        this.camera3d.centerOn(
            this.world.spawnPoint.x,
            this.world.spawnPoint.y
        );

        this.running = true;
        this.notify('세계가 창조되었습니다.');
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    _showError(message) {
        console.error('[Game Error]', message);
        // Show error as HTML overlay (visible even after canvas swap)
        let el = document.getElementById('game-error-overlay');
        if (!el) {
            el = document.createElement('div');
            el.id = 'game-error-overlay';
            el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);color:#ff4444;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;font-family:monospace;padding:20px;';
            document.body.appendChild(el);
        }
        el.innerHTML = `<div style="font-size:20px;margin-bottom:15px;">⚠ 오류 / Error</div><pre style="color:#ffaaaa;font-size:14px;white-space:pre-wrap;max-width:80%;text-align:center;">${message}</pre><div style="color:#888;font-size:12px;margin-top:15px;">F12 → Console 에서 상세 에러 확인</div>`;
    }

    loop(timestamp) {
        const delta = timestamp - this.lastTime;
        this.lastTime = timestamp;

        try {
            if (this.running) {
                this.accumulator += delta * this.speed;

                // Dynamic cap based on speed
                const maxTicks = this.speed >= 50 ? 100 : this.speed >= 10 ? 30 : 10;
                if (this.accumulator > this.tickRate * maxTicks) {
                    this.accumulator = this.tickRate * maxTicks;
                }

                while (this.accumulator >= this.tickRate) {
                    this.update();
                    this.accumulator -= this.tickRate;
                }
            }

            this.render();
        } catch (err) {
            if (!this._errorLogged) {
                console.error('Game loop error:', err);
                this._showError(`Game loop error:\n${err.message || err}\n\n${err.stack || ''}`);
                this._errorLogged = true;
            }
        }
        requestAnimationFrame((t) => this.loop(t));
    }

    update() {
        this.tick++;

        // Day/season/year tracking
        if (this.tick % TICKS_PER_DAY === 0) {
            this.day++;
            this.events.emit('day:started', this.day);
            if (this.day % DAYS_PER_SEASON === 0) {
                const oldSeason = this.season;
                this.season = (this.season + 1) % 4;
                this.events.emit('season:changed', oldSeason, this.season);
                if (this.season === 0) {
                    this.year++;
                    this.simulation.onNewYear();
                }
                this.simulation.onSeasonChange(this.season);
            }
        }

        // Night/day transition events
        const t = this.timeOfDay;
        const prevT = ((this.tick - 1) % TICKS_PER_DAY) / TICKS_PER_DAY;
        if (prevT <= 0.25 && t > 0.25) this.events.emit('dawn:started');
        if (prevT <= 0.75 && t > 0.75) this.events.emit('night:started');

        this.weather.update();
        this.entityManager.update();
        this.simulation.update();
        this.godPowers.updateCooldowns();
        this.registry.updateWorldModifiers(this);
        this.cinematicCamera.update();
        this.ambientMode.update();
        this.ui.update();

        this.events.emit('tick:update', this.tick);
    }

    render() {
        // 3D render
        this.camera3d.update();
        this.renderer.render();

        // Minimap (uses its own 2D canvas)
        if (!this.ambientMode.active) {
            this.minimap.render();
        }
    }

    get currentSeason() {
        return SEASONS[this.season];
    }

    get currentEra() {
        const tech = this.simulation.techLevel;
        let era = ERAS[0];
        for (const e of ERAS) {
            if (tech >= e.techRequired) era = e;
            else break;
        }
        return era;
    }

    get timeOfDay() {
        const dayTick = this.tick % TICKS_PER_DAY;
        return dayTick / TICKS_PER_DAY;
    }

    get isDaytime() {
        const t = this.timeOfDay;
        return t > 0.25 && t < 0.75;
    }

    notify(message) {
        this.notifications.push({ message, time: Date.now() });
        this.ambientMode.onEvent(message);

        if (!this.ambientMode.active) {
            const area = document.getElementById('notification-area');
            const el = document.createElement('div');
            el.className = 'notification';
            el.textContent = message;
            area.appendChild(el);
            setTimeout(() => el.remove(), 3000);
        }
    }

    setSpeed(speed) {
        this.speed = speed;
        if (speed === 0) {
            this.running = false;
        } else {
            this.running = true;
        }
    }

    pause() {
        this.running = !this.running;
        if (this.running) {
            this.lastTime = performance.now();
            this.accumulator = 0;
        }
    }
}
