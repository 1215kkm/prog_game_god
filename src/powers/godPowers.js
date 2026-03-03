import { TERRAIN } from '../core/constants.js';

export class GodPowers {
    constructor(game) {
        this.game = game;
        this.activePower = null;
        this.cooldowns = {};
        this.powerCost = {
            sun: 0,
            rain: 0,
            storm: 5,
            lightning: 10,
            wind: 0,
            snow: 0,
            earthquake: 20,
            bless: 15,
            plague: 15,
            miracle: 30,
        };
    }

    selectPower(powerName) {
        if (this.activePower === powerName) {
            this.activePower = null;
            return;
        }
        this.activePower = powerName;
    }

    usePower(worldX, worldY) {
        if (!this.activePower) return;
        if (this.cooldowns[this.activePower] > 0) return;

        const tileX = Math.floor(worldX);
        const tileY = Math.floor(worldY);

        // 레지스트리에 등록된 커스텀 파워 확인
        const customPower = this.game.registry.getPower(this.activePower);
        if (customPower) {
            customPower.effect(this.game, worldX, worldY);
            this.cooldowns[this.activePower] = customPower.cooldown || 60;
            this.game.simulation.faith += customPower.faithGain || 2;
            this.game.events.emit('power:used', this.activePower, worldX, worldY);
            if (customPower.sound) this.game.sound.play(customPower.sound);
            if (customPower.particle) {
                const renderer = this.game.renderer;
                renderer.addShockwave(worldX, worldY, 8, 0xffd700);
            }
            return;
        }

        switch (this.activePower) {
            case 'sun':
                this.game.weather.setWeather('clear', true);
                this.game.notify('맑은 날씨를 내렸습니다.');
                break;

            case 'rain':
                this.game.weather.setWeather('rain', true);
                this.game.notify('비를 내리게 했습니다.');
                break;

            case 'storm':
                this.game.weather.setWeather('storm', true);
                this.game.notify('폭풍이 몰려옵니다!');
                break;

            case 'lightning':
                this.strikeLightning(tileX, tileY);
                break;

            case 'wind':
                this.game.weather.setWeather('wind', true);
                this.game.weather.windDirection = Math.random() * Math.PI * 2;
                this.game.notify('강한 바람이 붑니다!');
                break;

            case 'snow':
                this.game.weather.setWeather('snow', true);
                this.game.notify('눈이 내리기 시작합니다.');
                break;

            case 'earthquake':
                this.earthquake(tileX, tileY);
                break;

            case 'bless':
                this.bless(tileX, tileY);
                break;

            case 'plague':
                this.plague(tileX, tileY);
                break;

            case 'miracle':
                this.miracle(tileX, tileY);
                break;
        }

        this.cooldowns[this.activePower] = 60; // cooldown ticks
        this.game.simulation.faith += 2;
        this.game.events.emit('power:used', this.activePower, worldX, worldY);

        // Sound effects
        const soundMap = {
            rain: 'rain', storm: 'thunder', lightning: 'thunder',
            wind: 'wind', earthquake: 'earthquake', bless: 'bless',
            miracle: 'bless', plague: 'death',
        };
        if (soundMap[this.activePower]) {
            this.game.sound.play(soundMap[this.activePower]);
        }

        // 3D particle effects + shockwaves + screen flash
        const renderer = this.game.renderer;

        if (this.activePower === 'bless') {
            renderer.addParticleEffect(worldX, worldY, 'large', '#ffd700');
            renderer.addShockwave(worldX, worldY, 10, 0xffd700);
            renderer.screenFlashAlpha = 0.2;
        }

        if (this.activePower === 'miracle') {
            renderer.addParticleEffect(worldX, worldY, 'large', '#fffff0');
            renderer.addShockwave(worldX, worldY, 15, 0xffffff);
            renderer.addShockwave(worldX, worldY, 12, 0xffd700);
            renderer.addShockwave(worldX, worldY, 8, 0xffcc33);
            renderer.screenFlashAlpha = 0.4;
        }

        if (this.activePower === 'plague') {
            renderer.addParticleEffect(worldX, worldY, 'large', '#44cc44');
            renderer.addShockwave(worldX, worldY, 12, 0x44cc44);
            renderer.screenFlashAlpha = 0.15;
        }

        if (this.activePower === 'lightning') {
            renderer.addParticleEffect(tileX, tileY, 'small', '#ffff88');
            renderer.addShockwave(tileX, tileY, 5, 0xffff66);
            renderer.screenFlashAlpha = 0.35;
        }

        if (this.activePower === 'earthquake') {
            renderer.addParticleEffect(tileX, tileY, 'large', '#8a7a5a');
            renderer.addShockwave(tileX, tileY, 10, 0xb4a050);
            renderer.addShockwave(tileX, tileY, 6, 0xc8a064);
            renderer.screenFlashAlpha = 0.2;
        }

        if (this.activePower === 'storm') {
            renderer.addShockwave(worldX, worldY, 8, 0x6496ff);
            renderer.screenFlashAlpha = 0.15;
        }

        if (this.activePower === 'sun') {
            renderer.addShockwave(worldX, worldY, 8, 0xffe664);
            renderer.addParticleEffect(worldX, worldY, 'small', '#ffd700');
        }

        if (this.activePower === 'rain') {
            renderer.addShockwave(worldX, worldY, 6, 0x64b4ff);
        }

        if (this.activePower === 'snow') {
            renderer.addShockwave(worldX, worldY, 6, 0xc8dcff);
        }

        if (this.activePower === 'wind') {
            renderer.addShockwave(worldX, worldY, 6, 0xb4c8b4);
        }
    }

    strikeLightning(x, y) {
        this.game.weather.lightningFlash = 1;
        this.game.weather.damageArea(x, y, 3, 40);
        this.game.notify('번개가 내리쳤습니다!');

        // Can start fires (turn forest to grass)
        const world = this.game.world;
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (world.getTerrain(x + dx, y + dy) === TERRAIN.FOREST && Math.random() < 0.3) {
                    world.setTerrain(x + dx, y + dy, TERRAIN.GRASS);
                }
            }
        }

        // People fear and gain faith
        for (const p of this.game.entityManager.people) {
            const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
            if (dist < 20) {
                p.flee(x, y);
                this.game.simulation.faith += 0.5;
            }
        }
    }

    earthquake(x, y) {
        const radius = 8;
        this.game.weather.damageArea(x, y, radius, 25);

        // Terrain changes
        const world = this.game.world;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const tx = x + dx, ty = y + dy;
                const terrain = world.getTerrain(tx, ty);
                if (Math.random() < 0.2) {
                    if (terrain === TERRAIN.GRASS) world.setTerrain(tx, ty, TERRAIN.HILL);
                    else if (terrain === TERRAIN.HILL) world.setTerrain(tx, ty, TERRAIN.MOUNTAIN);
                }
            }
        }

        this.game.notify('대지가 흔들립니다! 지진이 발생했습니다!');

        // Everyone panics
        for (const p of this.game.entityManager.people) {
            const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
            if (dist < 30) {
                p.flee(x, y);
            }
        }

        this.game.simulation.faith += 5;

        // Screen shake effect
        this.game.camera3d.shake(10, 30);
    }

    bless(x, y) {
        const radius = 10;
        const em = this.game.entityManager;

        // Heal and make happy
        for (const p of em.people) {
            const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
            if (dist < radius) {
                p.health = Math.min(100, p.health + 30);
                p.happiness = Math.min(100, p.happiness + 20);
                p.hunger = Math.max(0, p.hunger - 20);
                p.energy = Math.min(100, p.energy + 20);
            }
        }

        // Boost fertility
        const world = this.game.world;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const tx = x + dx, ty = y + dy;
                if (tx >= 0 && tx < world.width && ty >= 0 && ty < world.height) {
                    world.fertility[ty * world.width + tx] = Math.min(1,
                        world.fertility[ty * world.width + tx] + 0.3);
                }
            }
        }

        this.game.simulation.foodSupply += 20;
        this.game.simulation.faith += 5;
        this.game.notify('축복이 내려졌습니다! 땅이 비옥해집니다.');
    }

    plague(x, y) {
        const radius = 12;
        const em = this.game.entityManager;

        for (const p of em.people) {
            const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
            if (dist < radius && Math.random() < 0.5) {
                p.health -= 40;
                p.happiness -= 30;
                p.energy -= 20;
            }
        }

        for (const a of em.animals) {
            const dist = Math.sqrt((a.x - x) ** 2 + (a.y - y) ** 2);
            if (dist < radius && Math.random() < 0.3) {
                a.health -= 50;
            }
        }

        this.game.simulation.faith -= 3;
        this.game.notify('역병이 퍼집니다! 사람들이 고통받고 있습니다.');
    }

    miracle(x, y) {
        const radius = 15;
        const em = this.game.entityManager;

        // Full heal everyone nearby
        for (const p of em.people) {
            const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
            if (dist < radius) {
                p.health = 100;
                p.happiness = 100;
                p.hunger = 0;
                p.energy = 100;
                p.intelligence = Math.min(100, p.intelligence + 10);
            }
        }

        // Massive tech & culture boost
        this.game.simulation.techLevel += 10;
        this.game.simulation.cultureLevel += 10;
        this.game.simulation.foodSupply += 50;
        this.game.simulation.faith += 20;

        // Turn barren land to fertile
        const world = this.game.world;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const tx = x + dx, ty = y + dy;
                const terrain = world.getTerrain(tx, ty);
                if (terrain === TERRAIN.SAND || terrain === TERRAIN.HILL) {
                    world.setTerrain(tx, ty, TERRAIN.GRASS);
                }
            }
        }

        this.game.notify('기적이 일어났습니다! 모든 것이 회복됩니다!');
    }

    updateCooldowns() {
        for (const key in this.cooldowns) {
            if (this.cooldowns[key] > 0) this.cooldowns[key]--;
        }
    }
}
