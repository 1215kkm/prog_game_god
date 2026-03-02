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

        // Sound effects
        const soundMap = {
            rain: 'rain', storm: 'thunder', lightning: 'thunder',
            wind: 'wind', earthquake: 'earthquake', bless: 'bless',
            miracle: 'bless', plague: 'death',
        };
        if (soundMap[this.activePower]) {
            this.game.sound.play(soundMap[this.activePower]);
        }

        // Enhanced particle effects + shockwaves + screen flash
        const renderer = this.game.renderer;

        if (this.activePower === 'bless') {
            // Golden sparkle shower
            for (let i = 0; i < 40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 6;
                renderer.addParticle(
                    worldX + Math.cos(angle) * dist,
                    worldY + Math.sin(angle) * dist,
                    'sparkle',
                    { vy: -0.04 - Math.random() * 0.02, vx: (Math.random() - 0.5) * 0.02, life: 60 + Math.random() * 40, size: 5 + Math.random() * 4 }
                );
            }
            renderer.addShockwave(worldX, worldY, { maxRadius: 10, life: 50, color: '255,215,0', lineWidth: 3 });
            renderer.addGlowPoint(worldX, worldY, { life: 180, color: '255,215,0', radius: 5 });
            renderer.triggerScreenFlash('255,230,100', 0.2);
        }

        if (this.activePower === 'miracle') {
            // Massive golden explosion
            for (let i = 0; i < 80; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 10;
                renderer.addParticle(
                    worldX + Math.cos(angle) * dist,
                    worldY + Math.sin(angle) * dist,
                    'sparkle',
                    { vy: -0.05 - Math.random() * 0.03, vx: (Math.random() - 0.5) * 0.04, life: 80 + Math.random() * 60, size: 6 + Math.random() * 5 }
                );
            }
            // Triple shockwave
            renderer.addShockwave(worldX, worldY, { maxRadius: 15, life: 60, color: '255,255,200', lineWidth: 5 });
            renderer.addShockwave(worldX, worldY, { maxRadius: 12, life: 45, color: '255,215,0', lineWidth: 3 });
            renderer.addShockwave(worldX, worldY, { maxRadius: 8, life: 30, color: '255,200,50', lineWidth: 2 });
            renderer.addGlowPoint(worldX, worldY, { life: 300, color: '255,255,180', radius: 8 });
            renderer.triggerScreenFlash('255,255,200', 0.4);
        }

        if (this.activePower === 'plague') {
            // Green toxic cloud
            for (let i = 0; i < 25; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 8;
                renderer.addParticle(
                    worldX + Math.cos(angle) * dist,
                    worldY + Math.sin(angle) * dist,
                    'skull',
                    { vy: -0.025, vx: (Math.random() - 0.5) * 0.015, life: 70 + Math.random() * 40, size: 6 }
                );
            }
            // Sickly green particles
            for (let i = 0; i < 30; i++) {
                renderer.addParticle(
                    worldX + (Math.random() - 0.5) * 16,
                    worldY + (Math.random() - 0.5) * 16,
                    'generic',
                    { vy: -0.01, life: 50 + Math.random() * 30, size: 3, color: '#44cc44' }
                );
            }
            renderer.addShockwave(worldX, worldY, { maxRadius: 12, life: 50, color: '80,200,80', lineWidth: 3 });
            renderer.addGlowPoint(worldX, worldY, { life: 200, color: '80,180,60', radius: 6 });
            renderer.triggerScreenFlash('80,200,80', 0.15);
        }

        if (this.activePower === 'lightning') {
            // Explosive fire burst
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.02 + Math.random() * 0.03;
                renderer.addParticle(
                    tileX + (Math.random() - 0.5) * 3,
                    tileY + (Math.random() - 0.5) * 3,
                    'fire',
                    { vy: Math.sin(angle) * speed - 0.02, vx: Math.cos(angle) * speed, life: 40 + Math.random() * 30, size: 5 }
                );
            }
            renderer.addShockwave(tileX, tileY, { maxRadius: 5, life: 20, color: '255,255,100', lineWidth: 4 });
            renderer.triggerScreenFlash('255,255,200', 0.35);
        }

        if (this.activePower === 'earthquake') {
            // Ground debris particles
            for (let i = 0; i < 40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.015 + Math.random() * 0.03;
                renderer.addParticle(
                    tileX + (Math.random() - 0.5) * 12,
                    tileY + (Math.random() - 0.5) * 12,
                    'generic',
                    { vy: -0.02 + Math.sin(angle) * speed, vx: Math.cos(angle) * speed, life: 50 + Math.random() * 30, size: 3 + Math.random() * 3, color: '#8a7a5a' }
                );
            }
            renderer.addShockwave(tileX, tileY, { maxRadius: 10, life: 40, color: '180,140,80', lineWidth: 4 });
            renderer.addShockwave(tileX, tileY, { maxRadius: 6, life: 25, color: '200,160,100', lineWidth: 2 });
            renderer.addGlowPoint(tileX, tileY, { life: 100, color: '180,140,80', radius: 5 });
            renderer.triggerScreenFlash('180,140,80', 0.2);
        }

        if (this.activePower === 'storm') {
            renderer.addShockwave(worldX, worldY, { maxRadius: 8, life: 30, color: '100,150,255', lineWidth: 3 });
            renderer.triggerScreenFlash('100,150,200', 0.15);
        }

        if (this.activePower === 'sun') {
            renderer.addShockwave(worldX, worldY, { maxRadius: 8, life: 30, color: '255,230,100', lineWidth: 2 });
            for (let i = 0; i < 20; i++) {
                renderer.addParticle(
                    worldX + (Math.random() - 0.5) * 12,
                    worldY + (Math.random() - 0.5) * 12,
                    'sparkle',
                    { vy: -0.02, life: 40 + Math.random() * 20, size: 3 + Math.random() * 3 }
                );
            }
        }

        if (this.activePower === 'rain') {
            renderer.addShockwave(worldX, worldY, { maxRadius: 6, life: 25, color: '100,180,255', lineWidth: 2 });
        }

        if (this.activePower === 'snow') {
            renderer.addShockwave(worldX, worldY, { maxRadius: 6, life: 25, color: '200,220,255', lineWidth: 2 });
        }

        if (this.activePower === 'wind') {
            renderer.addShockwave(worldX, worldY, { maxRadius: 6, life: 25, color: '180,200,180', lineWidth: 2 });
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
        this.game.camera.shake(10, 30);
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
