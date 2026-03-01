import { TILE_SIZE, TERRAIN_COLORS, TERRAIN, BUILDING_TYPE, NPC_STATE } from '../core/constants.js';
import { SpriteSheet } from './sprites.js';

export class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;

        // Sprite system
        this.sprites = new SpriteSheet();
        this.sprites.generate();

        // Terrain tile cache (offscreen canvas)
        this.terrainCache = null;
        this.terrainCacheSeason = -1;
        this.terrainCacheChunks = {};
        this.CHUNK_SIZE = 32; // tiles per chunk

        // Particle system
        this.particles = [];
    }

    render() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        cam.update();

        ctx.imageSmoothingEnabled = false; // Pixel art!

        ctx.save();
        ctx.translate(cam.shakeX, cam.shakeY);
        ctx.scale(cam.zoom, cam.zoom);
        ctx.translate(-cam.x, -cam.y);

        this.renderTerrain();
        this.renderTerrainDetails();
        this.renderTrees();
        this.renderBuildings();
        this.renderAnimals();
        this.renderPeople();
        this.renderParticles();
        this.renderWeatherParticles();
        this.renderDayNightOverlay();

        ctx.restore();
    }

    // ===== TERRAIN =====
    renderTerrain() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const world = this.game.world;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();

        for (let y = Math.max(0, startY); y < Math.min(world.height, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(world.width, endX); x++) {
                const terrain = world.getTerrain(x, y);
                ctx.fillStyle = this.getTerrainColor(terrain, x, y);
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE + 1, TILE_SIZE + 1);
            }
        }
    }

    renderTerrainDetails() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const world = this.game.world;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();

        // Only render details when zoomed in enough
        if (cam.zoom < 0.8) return;

        for (let y = Math.max(0, startY); y < Math.min(world.height, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(world.width, endX); x++) {
                const terrain = world.getTerrain(x, y);
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;

                // Grass detail - small tufts
                if (terrain === TERRAIN.GRASS) {
                    const hash = (x * 7 + y * 13) % 5;
                    if (hash === 0) {
                        ctx.fillStyle = 'rgba(60,120,40,0.3)';
                        ctx.fillRect(px + 4, py + 8, 2, 3);
                        ctx.fillRect(px + 14, py + 4, 2, 3);
                    }
                    if (hash === 1 && this.game.season === 0) {
                        // Spring flowers
                        ctx.fillStyle = '#ff88aa';
                        ctx.fillRect(px + 6, py + 10, 2, 2);
                        ctx.fillStyle = '#ffff66';
                        ctx.fillRect(px + 16, py + 6, 2, 2);
                    }
                }

                // Farmland detail - crop rows
                if (terrain === TERRAIN.FARMLAND) {
                    const cropPhase = this.game.season;
                    if (cropPhase !== 3) { // Not winter
                        ctx.fillStyle = cropPhase === 2 ? '#ccaa33' : '#44aa22';
                        for (let row = 0; row < 3; row++) {
                            ctx.fillRect(px + 2, py + 4 + row * 8, TILE_SIZE - 4, 2);
                        }
                    }
                }

                // Road detail - lighter center
                if (terrain === TERRAIN.ROAD) {
                    ctx.fillStyle = 'rgba(180,170,140,0.3)';
                    ctx.fillRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);
                }

                // Sand detail - dots
                if (terrain === TERRAIN.SAND) {
                    const hash = (x * 3 + y * 7) % 4;
                    if (hash === 0) {
                        ctx.fillStyle = 'rgba(190,175,130,0.4)';
                        ctx.fillRect(px + 8, py + 8, 2, 2);
                    }
                }

                // Mountain detail - snow caps
                if (terrain === TERRAIN.MOUNTAIN) {
                    ctx.fillStyle = 'rgba(220,220,230,0.4)';
                    ctx.fillRect(px + 4, py + 2, TILE_SIZE - 8, 4);
                }

                // Water edge foam
                if (terrain === TERRAIN.SHALLOW_WATER) {
                    // Check if adjacent to land
                    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
                        const adj = world.getTerrain(x + dx, y + dy);
                        if (adj !== TERRAIN.DEEP_WATER && adj !== TERRAIN.SHALLOW_WATER) {
                            const foamAlpha = 0.2 + Math.sin(this.game.tick * 0.03 + x + y) * 0.1;
                            ctx.fillStyle = `rgba(255,255,255,${foamAlpha})`;
                            if (dx === 0 && dy === -1) ctx.fillRect(px, py, TILE_SIZE, 3);
                            if (dx === 0 && dy === 1) ctx.fillRect(px, py + TILE_SIZE - 3, TILE_SIZE, 3);
                            if (dx === -1 && dy === 0) ctx.fillRect(px, py, 3, TILE_SIZE);
                            if (dx === 1 && dy === 0) ctx.fillRect(px + TILE_SIZE - 3, py, 3, TILE_SIZE);
                        }
                    }
                }
            }
        }
    }

    getTerrainColor(terrain, x, y) {
        const baseColor = TERRAIN_COLORS[terrain];
        if (!baseColor) return '#000';

        const season = this.game.season;
        if (terrain === TERRAIN.GRASS || terrain === TERRAIN.FOREST || terrain === TERRAIN.FARMLAND) {
            switch (season) {
                case 0: return this.tintColor(baseColor, '#80ff80', 0.1);
                case 1: return baseColor;
                case 2: return this.tintColor(baseColor, '#cc8833', 0.25);
                case 3: return this.tintColor(baseColor, '#ccddee', 0.3);
            }
        }

        if (terrain === TERRAIN.DEEP_WATER || terrain === TERRAIN.SHALLOW_WATER) {
            const wave = Math.sin(this.game.tick * 0.02 + x * 0.3 + y * 0.2) * 12;
            return this.adjustBrightness(baseColor, wave);
        }

        // Subtle variation for natural look
        const hash = ((x * 374761393 + y * 668265263) >>> 0) % 20;
        if (hash < 5) return this.adjustBrightness(baseColor, -5 + hash * 2);

        return baseColor;
    }

    tintColor(base, tint, amount) {
        const b = this.hexToRgb(base);
        const t = this.hexToRgb(tint);
        if (!b || !t) return base;
        const r = Math.floor(b.r * (1 - amount) + t.r * amount);
        const g = Math.floor(b.g * (1 - amount) + t.g * amount);
        const bl = Math.floor(b.b * (1 - amount) + t.b * amount);
        return `rgb(${r},${g},${bl})`;
    }

    adjustBrightness(hex, amount) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        return `rgb(${Math.max(0, Math.min(255, rgb.r + amount))},${Math.max(0, Math.min(255, rgb.g + amount))},${Math.max(0, Math.min(255, rgb.b + amount))})`;
    }

    hexToRgb(hex) {
        if (hex.startsWith('rgb')) {
            const m = hex.match(/(\d+)/g);
            if (m) return { r: +m[0], g: +m[1], b: +m[2] };
            return null;
        }
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        } : null;
    }

    // ===== TREES (sprite-based) =====
    renderTrees() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();
        const season = this.game.season;

        let spriteKey;
        if (season === 2) spriteKey = 'treeFall';
        else if (season === 3) spriteKey = 'treeWinter';
        else spriteKey = 'tree';

        const treeSprite = this.sprites.get(spriteKey);
        const pineSprite = this.sprites.get('pine');

        for (const tree of this.game.entityManager.trees) {
            if (tree.x < startX - 1 || tree.x > endX + 1 || tree.y < startY - 1 || tree.y > endY + 1) continue;

            const sx = tree.x * TILE_SIZE;
            const sy = tree.y * TILE_SIZE;

            // Alternate between tree types based on position
            const isPine = ((Math.floor(tree.x) + Math.floor(tree.y)) % 3 === 0);
            const sprite = isPine && season !== 2 ? pineSprite : treeSprite;

            if (sprite) {
                const scale = tree.size / 4;
                ctx.drawImage(sprite,
                    sx - sprite.width * scale / 2,
                    sy - sprite.height * scale + 6,
                    sprite.width * scale,
                    sprite.height * scale
                );
            }
        }
    }

    // ===== BUILDINGS (sprite-based) =====
    renderBuildings() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();

        for (const b of this.game.entityManager.buildings) {
            if (b.x + b.size < startX || b.x > endX || b.y + b.size < startY || b.y > endY) continue;

            const sx = b.x * TILE_SIZE;
            const sy = b.y * TILE_SIZE;
            const bw = b.size * TILE_SIZE;
            const bh = b.size * TILE_SIZE;

            // Try sprite first
            const sprite = this.sprites.get(b.buildingType);
            if (sprite) {
                ctx.drawImage(sprite, sx, sy - sprite.height + bh, bw, sprite.height * (bw / sprite.width));
            } else {
                // Fallback: colored rectangle
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(sx + 2, sy + 2, bw, bh);
                ctx.fillStyle = b.color;
                ctx.fillRect(sx, sy, bw, bh);
                ctx.fillStyle = this.adjustBrightness(b.color, -30);
                ctx.fillRect(sx, sy, bw, bh * 0.3);
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(sx, sy, bw, bh);
            }

            // Damage overlay
            if (b.health < 50) {
                ctx.fillStyle = `rgba(255,0,0,${0.3 * (1 - b.health / 50)})`;
                ctx.fillRect(sx, sy, bw, bh);
            }

            // Health bar when damaged
            if (b.health < 80) {
                const barW = bw * 0.8;
                const barX = sx + (bw - barW) / 2;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(barX, sy - 4, barW, 3);
                ctx.fillStyle = b.health > 30 ? '#4c4' : '#c44';
                ctx.fillRect(barX, sy - 4, barW * b.health / 100, 3);
            }
        }
    }

    // ===== PEOPLE (sprite-based) =====
    renderPeople() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();

        for (const p of this.game.entityManager.people) {
            if (!p.alive) continue;
            if (p.x < startX - 1 || p.x > endX + 1 || p.y < startY - 1 || p.y > endY + 1) continue;

            const sx = p.x * TILE_SIZE;
            const sy = p.y * TILE_SIZE;

            // Choose sprite based on state
            let sprite;
            if (p.age < 15) {
                sprite = this.sprites.get('child');
            } else if (p.state === NPC_STATE.SLEEPING) {
                sprite = this.sprites.get('sleeping');
            } else if (p.state === NPC_STATE.WALKING || p.state === NPC_STATE.FLEEING) {
                // Animate walk
                const walkFrame = Math.floor(this.game.tick / 10) % 2;
                sprite = walkFrame === 0
                    ? this.sprites.get(p.gender === 'male' ? 'maleAdult' : 'femaleAdult')
                    : this.sprites.get(p.gender === 'male' ? 'maleWalk' : 'femaleAdult');
            } else {
                sprite = this.sprites.get(p.gender === 'male' ? 'maleAdult' : 'femaleAdult');
            }

            if (sprite) {
                const scale = p.age < 15 ? 1.0 : 1.2;
                const w = sprite.width * scale;
                const h = sprite.height * scale;
                ctx.drawImage(sprite, sx - w / 2, sy - h + 4, w, h);
            }

            // State bubble (when zoomed in)
            if (cam.zoom > 1.5) {
                let icon = null;
                switch (p.state) {
                    case NPC_STATE.SLEEPING: icon = '💤'; break;
                    case NPC_STATE.EATING: icon = '🍖'; break;
                    case NPC_STATE.WORKING: icon = '⛏'; break;
                    case NPC_STATE.SOCIALIZING: icon = '💬'; break;
                    case NPC_STATE.FLEEING: icon = '❗'; break;
                    case NPC_STATE.GATHERING: icon = '🌿'; break;
                }
                if (icon) {
                    // Speech bubble background
                    const bubbleY = sy - (p.age < 15 ? 16 : 22);
                    ctx.fillStyle = 'rgba(255,255,255,0.8)';
                    ctx.fillRect(sx - 6, bubbleY - 2, 12, 12);
                    ctx.font = '8px sans-serif';
                    ctx.fillText(icon, sx - 4, bubbleY + 8);
                }
            }

            // Name tag when very zoomed in
            if (cam.zoom > 2.5) {
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(sx - 14, sy + 6, 28, 8);
                ctx.fillStyle = '#fff';
                ctx.font = '6px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(p.name, sx, sy + 12);
                ctx.textAlign = 'start';
            }
        }
    }

    // ===== ANIMALS (sprite-based) =====
    renderAnimals() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();

        for (const a of this.game.entityManager.animals) {
            if (!a.alive) continue;
            if (a.x < startX - 1 || a.x > endX + 1 || a.y < startY - 1 || a.y > endY + 1) continue;

            const sx = a.x * TILE_SIZE;
            const sy = a.y * TILE_SIZE;

            const sprite = this.sprites.get(a.type);
            if (sprite) {
                // Bird bob animation
                let offsetY = 0;
                if (a.type === 'BIRD') {
                    offsetY = Math.sin(this.game.tick * 0.1 + a.x) * 3;
                }
                // Fish wave animation
                if (a.type === 'FISH') {
                    offsetY = Math.sin(this.game.tick * 0.05 + a.x * 0.5) * 2;
                }

                const scale = 1.5;
                ctx.drawImage(sprite,
                    sx - sprite.width * scale / 2,
                    sy - sprite.height * scale / 2 + offsetY,
                    sprite.width * scale,
                    sprite.height * scale
                );
            }
        }
    }

    // ===== PARTICLES =====
    addParticle(x, y, type, options = {}) {
        this.particles.push({
            x, y, type,
            vx: options.vx || 0,
            vy: options.vy || 0,
            life: options.life || 60,
            maxLife: options.life || 60,
            size: options.size || 4,
            color: options.color || '#fff',
        });
    }

    renderParticles() {
        const ctx = this.ctx;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            const alpha = p.life / p.maxLife;
            const px = p.x * TILE_SIZE;
            const py = p.y * TILE_SIZE;

            if (p.type === 'sparkle') {
                const sprite = this.sprites.get('sparkle');
                if (sprite) {
                    ctx.globalAlpha = alpha;
                    const s = p.size * (1 + (1 - alpha) * 0.5);
                    ctx.drawImage(sprite, px - s, py - s, s * 2, s * 2);
                    ctx.globalAlpha = 1;
                }
            } else if (p.type === 'fire') {
                const sprite = this.sprites.get('fire');
                if (sprite) {
                    ctx.globalAlpha = alpha;
                    ctx.drawImage(sprite, px - 4, py - 5 - (1 - alpha) * 4, 8, 10);
                    ctx.globalAlpha = 1;
                }
            } else if (p.type === 'skull') {
                const sprite = this.sprites.get('skull');
                if (sprite) {
                    ctx.globalAlpha = alpha * 0.8;
                    ctx.drawImage(sprite, px - 6, py - 6 + (1 - alpha) * -8, 12, 12);
                    ctx.globalAlpha = 1;
                }
            } else {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = alpha;
                ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
                ctx.globalAlpha = 1;
            }
        }
    }

    // ===== WEATHER =====
    renderWeatherParticles() {
        const ctx = this.ctx;
        const weather = this.game.weather;
        const cam = this.game.camera;

        if (weather.current === 'rain' || weather.current === 'storm') {
            const count = weather.current === 'storm' ? 250 : 100;
            ctx.strokeStyle = weather.current === 'storm' ? 'rgba(100,150,255,0.5)' : 'rgba(120,180,255,0.4)';
            ctx.lineWidth = weather.current === 'storm' ? 0.8 : 0.5;

            for (let i = 0; i < count; i++) {
                const rx = cam.x + Math.random() * (this.game.canvas.width / cam.zoom);
                const ry = cam.y + Math.random() * (this.game.canvas.height / cam.zoom);
                const len = weather.current === 'storm' ? 5 + Math.random() * 8 : 3 + Math.random() * 5;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx + weather.windSpeed * 3, ry + len);
                ctx.stroke();
            }

            // Puddles on ground during storm
            if (weather.current === 'storm') {
                ctx.fillStyle = 'rgba(80,120,200,0.08)';
                for (let i = 0; i < 20; i++) {
                    const rx = cam.x + Math.random() * (this.game.canvas.width / cam.zoom);
                    const ry = cam.y + Math.random() * (this.game.canvas.height / cam.zoom);
                    ctx.beginPath();
                    ctx.ellipse(rx, ry, 6 + Math.random() * 8, 2 + Math.random() * 3, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        if (weather.current === 'snow') {
            for (let i = 0; i < 80; i++) {
                const rx = cam.x + Math.random() * (this.game.canvas.width / cam.zoom);
                const ry = cam.y + Math.random() * (this.game.canvas.height / cam.zoom);
                const size = 1 + Math.random() * 3;
                const drift = Math.sin(this.game.tick * 0.02 + i) * 2;
                ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.random() * 0.4})`;
                ctx.fillRect(rx + drift - size / 2, ry - size / 2, size, size);
            }
        }

        // Wind visual (leaves/dust)
        if (weather.current === 'wind') {
            ctx.fillStyle = 'rgba(160,140,100,0.3)';
            for (let i = 0; i < 30; i++) {
                const rx = cam.x + Math.random() * (this.game.canvas.width / cam.zoom);
                const ry = cam.y + Math.random() * (this.game.canvas.height / cam.zoom);
                const windX = Math.cos(weather.windDirection) * 4;
                const windY = Math.sin(weather.windDirection) * 4;
                ctx.fillRect(rx, ry, 2 + Math.random() * 2, 1);
                ctx.fillRect(rx + windX, ry + windY, 1, 1);
            }
        }

        // Lightning flash
        if (weather.lightningFlash > 0) {
            ctx.fillStyle = `rgba(255,255,220,${weather.lightningFlash * 0.15})`;
            ctx.fillRect(cam.x, cam.y,
                this.game.canvas.width / cam.zoom,
                this.game.canvas.height / cam.zoom);

            // Lightning bolt
            if (weather.lightningFlash > 0.7) {
                const bolt = this.sprites.get('lightning');
                if (bolt) {
                    const bx = cam.x + this.game.canvas.width / cam.zoom * (0.3 + Math.random() * 0.4);
                    const by = cam.y;
                    ctx.globalAlpha = weather.lightningFlash;
                    ctx.drawImage(bolt, bx, by, 20, 60);
                    ctx.globalAlpha = 1;
                }
            }
        }
    }

    // ===== DAY/NIGHT =====
    renderDayNightOverlay() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const timeOfDay = this.game.timeOfDay;

        let overlayColor = null;
        let alpha = 0;

        if (timeOfDay < 0.2 || timeOfDay > 0.82) {
            // Night
            overlayColor = '10,10,40';
            alpha = 0.35;
        } else if (timeOfDay < 0.28) {
            // Dawn
            overlayColor = '60,30,20';
            alpha = 0.15 * (1 - (timeOfDay - 0.2) / 0.08);
        } else if (timeOfDay > 0.72) {
            // Dusk
            overlayColor = '50,20,30';
            alpha = 0.15 * ((timeOfDay - 0.72) / 0.1);
        }

        if (overlayColor && alpha > 0) {
            ctx.fillStyle = `rgba(${overlayColor},${alpha})`;
            ctx.fillRect(cam.x, cam.y,
                this.game.canvas.width / cam.zoom,
                this.game.canvas.height / cam.zoom);
        }
    }
}
