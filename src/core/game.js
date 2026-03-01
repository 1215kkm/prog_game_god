import { TICKS_PER_DAY, DAYS_PER_SEASON, SEASONS, ERAS } from './constants.js';
import { World } from '../world/world.js';
import { Renderer } from '../ui/renderer.js';
import { Camera } from '../ui/camera.js';
import { EntityManager } from '../entities/entityManager.js';
import { WeatherSystem } from '../powers/weather.js';
import { GodPowers } from '../powers/godPowers.js';
import { SimulationEngine } from '../core/simulation.js';
import { UIManager } from '../ui/uiManager.js';
import { Minimap } from '../ui/minimap.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.running = false;
        this.speed = 1;
        this.tick = 0;
        this.day = 0;
        this.season = 0;
        this.year = 1;

        this.lastTime = 0;
        this.accumulator = 0;
        this.tickRate = 1000 / 30; // 30 ticks per second at 1x speed

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Core systems
        this.world = new World();
        this.camera = new Camera(this);
        this.entityManager = new EntityManager(this);
        this.weather = new WeatherSystem(this);
        this.godPowers = new GodPowers(this);
        this.simulation = new SimulationEngine(this);
        this.renderer = new Renderer(this);
        this.ui = new UIManager(this);
        this.minimap = new Minimap(this);

        this.notifications = [];
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        this.world.generate();
        this.entityManager.spawnInitialEntities();
        this.minimap.init();
        this.ui.init();
        this.camera.centerOn(
            this.world.spawnPoint.x,
            this.world.spawnPoint.y
        );
        this.running = true;
        this.notify('세계가 창조되었습니다.');
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    loop(timestamp) {
        const delta = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.running) {
            this.accumulator += delta * this.speed;

            // Cap accumulator to prevent spiral of death
            if (this.accumulator > this.tickRate * 10) {
                this.accumulator = this.tickRate * 10;
            }

            while (this.accumulator >= this.tickRate) {
                this.update();
                this.accumulator -= this.tickRate;
            }
        }

        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }

    update() {
        this.tick++;

        // Day/season/year tracking
        if (this.tick % TICKS_PER_DAY === 0) {
            this.day++;
            if (this.day % DAYS_PER_SEASON === 0) {
                this.season = (this.season + 1) % 4;
                if (this.season === 0) {
                    this.year++;
                    this.simulation.onNewYear();
                }
                this.simulation.onSeasonChange(this.season);
            }
        }

        this.weather.update();
        this.entityManager.update();
        this.simulation.update();
        this.godPowers.updateCooldowns();
        this.ui.update();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.renderer.render();
        this.minimap.render();
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
        return dayTick / TICKS_PER_DAY; // 0-1, 0=midnight, 0.5=noon
    }

    get isDaytime() {
        const t = this.timeOfDay;
        return t > 0.25 && t < 0.75;
    }

    notify(message) {
        this.notifications.push({ message, time: Date.now() });
        const area = document.getElementById('notification-area');
        const el = document.createElement('div');
        el.className = 'notification';
        el.textContent = message;
        area.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    pause() {
        this.running = !this.running;
        if (this.running) {
            this.lastTime = performance.now();
            this.accumulator = 0;
        }
    }
}
