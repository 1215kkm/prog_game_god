import { WEATHER } from '../core/constants.js';

export class WeatherSystem {
    constructor(game) {
        this.game = game;
        this.current = WEATHER.CLEAR;
        this.intensity = 0;       // 0-1
        this.windDirection = 0;   // radians
        this.windSpeed = 0;       // 0-1
        this.temperature = 20;    // celsius
        this.naturalTimer = 0;
        this.godOverride = false; // If god set the weather
        this.overrideTimer = 0;

        // Visual effects
        this.raindrops = [];
        this.snowflakes = [];
        this.lightningFlash = 0;
        this.cloudCover = 0;  // 0-1
    }

    update() {
        // Natural weather changes
        if (!this.godOverride) {
            this.naturalTimer++;
            if (this.naturalTimer > 500 + Math.random() * 1000) {
                this.naturalTimer = 0;
                this.setNaturalWeather();
            }
        } else {
            this.overrideTimer--;
            if (this.overrideTimer <= 0) {
                this.godOverride = false;
            }
        }

        // Update visual effects
        this.updateEffects();

        // Weather impacts on world
        this.applyWorldEffects();
    }

    setNaturalWeather() {
        const season = this.game.season;
        const roll = Math.random();

        switch (season) {
            case 0: // Spring
                if (roll < 0.4) this.setWeather('clear');
                else if (roll < 0.7) this.setWeather('cloudy');
                else this.setWeather('rain');
                break;
            case 1: // Summer
                if (roll < 0.5) this.setWeather('clear');
                else if (roll < 0.7) this.setWeather('cloudy');
                else if (roll < 0.9) this.setWeather('rain');
                else this.setWeather('storm');
                break;
            case 2: // Fall
                if (roll < 0.3) this.setWeather('clear');
                else if (roll < 0.6) this.setWeather('cloudy');
                else if (roll < 0.8) this.setWeather('rain');
                else this.setWeather('wind');
                break;
            case 3: // Winter
                if (roll < 0.3) this.setWeather('clear');
                else if (roll < 0.5) this.setWeather('cloudy');
                else this.setWeather('snow');
                break;
        }
    }

    setWeather(type, godCommand = false) {
        this.current = type;
        if (godCommand) {
            this.godOverride = true;
            this.overrideTimer = 300 + Math.random() * 300;
        }

        switch (type) {
            case 'clear':
                this.intensity = 0;
                this.cloudCover = 0.1;
                this.windSpeed = 0.1;
                break;
            case 'cloudy':
                this.intensity = 0;
                this.cloudCover = 0.6;
                this.windSpeed = 0.2;
                break;
            case 'rain':
                this.intensity = 0.5 + Math.random() * 0.3;
                this.cloudCover = 0.8;
                this.windSpeed = 0.3;
                break;
            case 'storm':
                this.intensity = 0.8 + Math.random() * 0.2;
                this.cloudCover = 0.95;
                this.windSpeed = 0.7;
                break;
            case 'snow':
                this.intensity = 0.4 + Math.random() * 0.3;
                this.cloudCover = 0.7;
                this.windSpeed = 0.2;
                break;
            case 'wind':
                this.intensity = 0;
                this.cloudCover = 0.3;
                this.windSpeed = 0.8;
                this.windDirection = Math.random() * Math.PI * 2;
                break;
        }
    }

    updateEffects() {
        const overlay = document.getElementById('weather-overlay');

        // Lightning flash
        if (this.lightningFlash > 0) {
            this.lightningFlash -= 0.1;
            overlay.style.backgroundColor = `rgba(255,255,255,${this.lightningFlash * 0.3})`;
        } else if (this.current === 'storm' && Math.random() < 0.005) {
            this.lightningFlash = 1;
            // Lightning can strike and damage
            this.strikeLightning();
        } else {
            // Ambient overlay based on weather
            switch (this.current) {
                case 'rain':
                    overlay.style.backgroundColor = 'rgba(50,60,80,0.15)';
                    break;
                case 'storm':
                    overlay.style.backgroundColor = 'rgba(30,30,50,0.25)';
                    break;
                case 'snow':
                    overlay.style.backgroundColor = 'rgba(200,210,230,0.1)';
                    break;
                default:
                    overlay.style.backgroundColor = 'transparent';
            }
        }

        // Day/night cycle overlay
        const timeOfDay = this.game.timeOfDay;
        let nightAlpha = 0;
        if (timeOfDay < 0.2 || timeOfDay > 0.8) {
            nightAlpha = 0.3;
        } else if (timeOfDay < 0.3) {
            nightAlpha = 0.3 * (1 - (timeOfDay - 0.2) / 0.1);
        } else if (timeOfDay > 0.7) {
            nightAlpha = 0.3 * ((timeOfDay - 0.7) / 0.1);
        }
        if (nightAlpha > 0) {
            const current = overlay.style.backgroundColor;
            overlay.style.backgroundColor = `rgba(10,10,40,${nightAlpha})`;
        }
    }

    strikeLightning() {
        const cam = this.game.camera;
        const worldX = cam.x + Math.random() * (this.game.canvas.width / cam.zoom);
        const worldY = cam.y + Math.random() * (this.game.canvas.height / cam.zoom);

        // Damage nearby entities
        const tileX = Math.floor(worldX / 24);
        const tileY = Math.floor(worldY / 24);
        this.damageArea(tileX, tileY, 3, 30);
    }

    applyWorldEffects() {
        if (this.game.tick % 60 !== 0) return;

        const sim = this.game.simulation;

        switch (this.current) {
            case 'rain':
                // Rain helps crops
                sim.foodSupply += 0.5;
                break;
            case 'storm':
                // Storm damages
                sim.foodSupply -= 0.3;
                break;
            case 'snow':
                // Snow slows everything
                break;
        }
    }

    damageArea(x, y, radius, damage) {
        const em = this.game.entityManager;
        for (const p of em.people) {
            const dx = p.x - x;
            const dy = p.y - y;
            if (dx * dx + dy * dy < radius * radius) {
                p.health -= damage;
                p.flee(x, y);
            }
        }
        for (const a of em.animals) {
            const dx = a.x - x;
            const dy = a.y - y;
            if (dx * dx + dy * dy < radius * radius) {
                a.health -= damage;
                a.fleeFrom(x, y);
            }
        }
        for (const b of em.buildings) {
            const dx = b.x - x;
            const dy = b.y - y;
            if (dx * dx + dy * dy < (radius + b.size) * (radius + b.size)) {
                b.health -= damage;
            }
        }
    }
}
