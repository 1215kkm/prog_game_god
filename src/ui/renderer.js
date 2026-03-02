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

        // Shockwave / ring effects for god powers
        this.shockwaves = [];

        // Screen flash effects
        this.screenFlash = { alpha: 0, color: '255,255,255' };

        // God power glow points (persistent for a while)
        this.glowPoints = [];

        // Offscreen canvas for smooth terrain rendering
        this._terrainCanvas = null;
        this._terrainCtx = null;
    }

    render() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        cam.update();

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.save();
        ctx.translate(cam.shakeX, cam.shakeY);
        ctx.scale(cam.zoom, cam.zoom);
        ctx.translate(-cam.x, -cam.y);

        this.renderTerrain();
        this.renderWaterShimmer();
        this.renderTerrainDetails();
        this.renderShadows();
        this.renderTrees();
        this.renderBuildings();
        this.renderVehicles();
        this.renderBuildingSmoke();
        this.renderAnimals();
        this.renderPeople();
        this.renderParticles();
        this.renderShockwaves();
        this.renderGlowPoints();
        this.renderWeatherParticles();
        this.renderFireflies();
        this.renderDayNightOverlay();

        ctx.restore();

        // Screen flash (screen space)
        this.renderScreenFlash();

        // Diorama edge (always active for miniature world feel)
        this.renderDioramaEdge();

        // Post-processing (screen space)
        if (this.game.ambientMode && this.game.ambientMode.active) {
            this.renderVignette();
        }
    }

    // ===== TERRAIN (smooth offscreen canvas rendering) =====
    renderTerrain() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const world = this.game.world;
        const range = cam.getVisibleTileRange();

        // Add 1-tile padding for smooth edge blending
        const sx = Math.max(0, range.startX - 1);
        const sy = Math.max(0, range.startY - 1);
        const ex = Math.min(world.width, range.endX + 1);
        const ey = Math.min(world.height, range.endY + 1);
        const rw = ex - sx;
        const rh = ey - sy;

        if (rw <= 0 || rh <= 0) return;

        // Lazy-init offscreen canvas
        if (!this._terrainCanvas) {
            this._terrainCanvas = document.createElement('canvas');
            this._terrainCtx = this._terrainCanvas.getContext('2d');
        }
        if (this._terrainCanvas.width < rw || this._terrainCanvas.height < rh) {
            this._terrainCanvas.width = rw + 4;
            this._terrainCanvas.height = rh + 4;
        }

        const tctx = this._terrainCtx;

        // Draw each tile as 1 pixel on offscreen canvas
        for (let y = sy; y < ey; y++) {
            for (let x = sx; x < ex; x++) {
                const terrain = world.getTerrain(x, y);
                tctx.fillStyle = this.getTerrainColor(terrain, x, y);
                tctx.fillRect(x - sx, y - sy, 1, 1);
            }
        }

        // Draw scaled up with bilinear smoothing → eliminates grid pattern
        const prevSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
            this._terrainCanvas,
            0, 0, rw, rh,
            sx * TILE_SIZE, sy * TILE_SIZE,
            rw * TILE_SIZE, rh * TILE_SIZE
        );
        ctx.imageSmoothingEnabled = prevSmoothing;
    }

    renderTerrainDetails() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const world = this.game.world;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();

        if (cam.zoom < 0.5) return;
        const T = TILE_SIZE;

        for (let y = Math.max(0, startY); y < Math.min(world.height, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(world.width, endX); x++) {
                const terrain = world.getTerrain(x, y);
                const px = x * T;
                const py = y * T;
                const hash = ((x * 374761393 + y * 668265263) >>> 0) % 100;
                const hash2 = ((x * 127849 + y * 893521) >>> 0) % 100;

                // Grass - rich detail with tufts, flowers, small stones
                if (terrain === TERRAIN.GRASS) {
                    // Grass tufts (varied sizes)
                    if (hash < 30) {
                        const shade = hash < 15 ? 'rgba(50,110,35,0.35)' : 'rgba(70,140,50,0.25)';
                        ctx.fillStyle = shade;
                        const tx = px + (hash2 % 20) + 2;
                        const ty = py + (hash % 18) + 4;
                        ctx.fillRect(tx, ty, 2, 4);
                        ctx.fillRect(tx + 1, ty - 1, 1, 1);
                    }
                    if (hash > 60 && hash < 75) {
                        ctx.fillStyle = 'rgba(55,130,40,0.3)';
                        ctx.fillRect(px + 16 + (hash2 % 8), py + 6 + (hash % 10), 2, 3);
                    }
                    // Spring/summer flowers
                    if (this.game.season <= 1) {
                        if (hash2 < 8) {
                            const colors = ['#ff88aa', '#ffff66', '#ff6688', '#aaddff', '#ffaa44'];
                            ctx.fillStyle = colors[hash % 5];
                            ctx.fillRect(px + 6 + (hash2 % 16), py + 4 + (hash % 16), 3, 3);
                        }
                        if (hash2 > 85) {
                            ctx.fillStyle = '#ffee55';
                            ctx.fillRect(px + 20 + (hash % 6), py + 14 + (hash2 % 8), 2, 2);
                        }
                    }
                    // Small stones
                    if (hash > 90) {
                        ctx.fillStyle = 'rgba(140,130,120,0.3)';
                        ctx.fillRect(px + 10 + (hash2 % 10), py + 10 + (hash % 10), 3, 2);
                    }
                }

                // Forest floor - fallen leaves, moss, undergrowth
                if (terrain === TERRAIN.FOREST) {
                    if (hash < 25) {
                        ctx.fillStyle = 'rgba(30,70,25,0.3)';
                        ctx.fillRect(px + (hash2 % 20) + 2, py + (hash % 20) + 2, 4, 2);
                    }
                    if (hash > 70 && this.game.season === 2) {
                        ctx.fillStyle = 'rgba(180,120,40,0.25)';
                        ctx.fillRect(px + (hash2 % 22) + 2, py + (hash % 18) + 6, 3, 2);
                    }
                }

                // Farmland - richer crop rows with growth stages
                if (terrain === TERRAIN.FARMLAND) {
                    const season = this.game.season;
                    const rows = 4;
                    const rowH = Math.floor(T / rows);
                    for (let row = 0; row < rows; row++) {
                        // Furrow
                        ctx.fillStyle = 'rgba(100,80,40,0.2)';
                        ctx.fillRect(px + 1, py + row * rowH + rowH - 1, T - 2, 1);
                        if (season !== 3) {
                            // Crop colors by season
                            const cropColor = season === 0 ? '#55bb33' : season === 1 ? '#44aa22' : '#ccaa33';
                            ctx.fillStyle = cropColor;
                            const cropH = season === 0 ? 2 : season === 1 ? 3 : 4;
                            for (let c = 0; c < 5; c++) {
                                ctx.fillRect(px + 3 + c * 6, py + row * rowH + 2, 3, cropH);
                            }
                        }
                    }
                }

                // Road - texture with wheel marks
                if (terrain === TERRAIN.ROAD) {
                    ctx.fillStyle = 'rgba(180,170,140,0.25)';
                    ctx.fillRect(px + T * 0.2, py + T * 0.2, T * 0.6, T * 0.6);
                    // Wheel tracks
                    ctx.fillStyle = 'rgba(120,110,80,0.15)';
                    ctx.fillRect(px + T * 0.3, py, 2, T);
                    ctx.fillRect(px + T * 0.65, py, 2, T);
                }

                // Sand - ripple patterns, shells
                if (terrain === TERRAIN.SAND) {
                    if (hash < 20) {
                        ctx.fillStyle = 'rgba(200,185,140,0.25)';
                        ctx.fillRect(px + 2, py + (hash % 16) + 4, T - 4, 1);
                    }
                    if (hash > 90) {
                        ctx.fillStyle = 'rgba(220,200,170,0.4)';
                        ctx.fillRect(px + (hash2 % 18) + 4, py + (hash % 18) + 4, 2, 2);
                    }
                }

                // Mountain - cracks, snow highlights, rocky texture
                if (terrain === TERRAIN.MOUNTAIN) {
                    ctx.fillStyle = 'rgba(220,220,235,0.35)';
                    ctx.fillRect(px + 4, py + 2, T - 8, 5);
                    if (hash < 30) {
                        ctx.fillStyle = 'rgba(60,60,70,0.2)';
                        ctx.fillRect(px + (hash2 % 16) + 4, py + (hash % 16) + 8, 1, 6);
                    }
                }

                // Hill - grass patches on rock
                if (terrain === TERRAIN.HILL) {
                    if (hash < 25) {
                        ctx.fillStyle = 'rgba(80,130,50,0.2)';
                        ctx.fillRect(px + (hash2 % 18) + 3, py + (hash % 18) + 3, 4, 3);
                    }
                }

                // Water edge foam (enhanced)
                if (terrain === TERRAIN.SHALLOW_WATER) {
                    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
                        const adj = world.getTerrain(x + dx, y + dy);
                        if (adj !== TERRAIN.DEEP_WATER && adj !== TERRAIN.SHALLOW_WATER && adj !== undefined) {
                            const foamAlpha = 0.25 + Math.sin(this.game.tick * 0.03 + x + y) * 0.12;
                            ctx.fillStyle = `rgba(255,255,255,${foamAlpha})`;
                            const thickness = 4;
                            if (dx === 0 && dy === -1) ctx.fillRect(px, py, T, thickness);
                            if (dx === 0 && dy === 1) ctx.fillRect(px, py + T - thickness, T, thickness);
                            if (dx === -1 && dy === 0) ctx.fillRect(px, py, thickness, T);
                            if (dx === 1 && dy === 0) ctx.fillRect(px + T - thickness, py, thickness, T);
                            // Secondary foam line
                            const foam2 = 0.12 + Math.sin(this.game.tick * 0.02 + x * 2 + y) * 0.06;
                            ctx.fillStyle = `rgba(220,240,255,${foam2})`;
                            if (dx === 0 && dy === -1) ctx.fillRect(px, py + thickness, T, 2);
                            if (dx === 0 && dy === 1) ctx.fillRect(px, py + T - thickness - 2, T, 2);
                        }
                    }
                }

                // Terrain edge blending (wider, smoother borders between terrain types)
                if (cam.zoom > 0.7) {
                    for (const [dx, dy] of [[1,0],[0,1]]) {
                        const adjTerrain = world.getTerrain(x + dx, y + dy);
                        if (adjTerrain !== terrain && adjTerrain !== undefined) {
                            const adjColor = TERRAIN_COLORS[adjTerrain];
                            if (adjColor) {
                                ctx.fillStyle = this.tintColor(adjColor, TERRAIN_COLORS[terrain] || '#000', 0.5);
                                ctx.globalAlpha = 0.25;
                                if (dx === 1) ctx.fillRect(px + T - 6, py, 6, T);
                                if (dy === 1) ctx.fillRect(px, py + T - 6, T, 6);
                                ctx.globalAlpha = 0.1;
                                if (dx === 1) ctx.fillRect(px + T - 10, py, 4, T);
                                if (dy === 1) ctx.fillRect(px, py + T - 10, T, 4);
                                ctx.globalAlpha = 1;
                            }
                        }
                    }
                }
            }
        }
    }

    // Smooth 2D noise (no grid artifacts)
    _smoothNoise(x, y) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const n00 = this._tileHash(ix, iy);
        const n10 = this._tileHash(ix + 1, iy);
        const n01 = this._tileHash(ix, iy + 1);
        const n11 = this._tileHash(ix + 1, iy + 1);
        return (n00 * (1 - sx) + n10 * sx) * (1 - sy) +
               (n01 * (1 - sx) + n11 * sx) * sy;
    }

    _tileHash(x, y) {
        return (((x * 374761393 + y * 668265263) ^ 0x5DEECE66) >>> 0) / 4294967296;
    }

    getTerrainColor(terrain, x, y) {
        const baseColor = TERRAIN_COLORS[terrain];
        if (!baseColor) return '#000';

        const season = this.game.season;

        // Smooth noise-based variation (eliminates per-tile grid pattern)
        const n1 = this._smoothNoise(x * 0.3, y * 0.3);
        const n2 = this._smoothNoise(x * 0.7 + 50, y * 0.7 + 50);
        const variation = (n1 - 0.5) * 10 + (n2 - 0.5) * 5;

        if (terrain === TERRAIN.GRASS || terrain === TERRAIN.FOREST || terrain === TERRAIN.FARMLAND) {
            let color;
            switch (season) {
                case 0: color = this.tintColor(baseColor, '#80ff80', 0.12); break;
                case 1: color = baseColor; break;
                case 2: color = this.tintColor(baseColor, '#cc8833', 0.25); break;
                case 3: color = this.tintColor(baseColor, '#ccddee', 0.3); break;
                default: color = baseColor;
            }
            return this.adjustBrightness(color, variation);
        }

        if (terrain === TERRAIN.DEEP_WATER || terrain === TERRAIN.SHALLOW_WATER) {
            const wave = Math.sin(this.game.tick * 0.02 + x * 0.3 + y * 0.2) * 8;
            const wave2 = Math.cos(this.game.tick * 0.015 + x * 0.5 - y * 0.3) * 4;
            return this.adjustBrightness(baseColor, wave + wave2 + variation * 0.4);
        }

        if (terrain === TERRAIN.SAND) {
            return this.adjustBrightness(baseColor, variation + Math.sin(x * 0.8 + y * 0.6) * 3);
        }

        if (terrain === TERRAIN.MOUNTAIN || terrain === TERRAIN.HILL) {
            return this.adjustBrightness(baseColor, variation * 1.2);
        }

        return this.adjustBrightness(baseColor, variation * 0.4);
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

    // ===== SHADOWS (depth/diorama effect) =====
    renderShadows() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();

        ctx.fillStyle = 'rgba(0,0,0,0.12)';

        // Tree shadows
        for (const tree of this.game.entityManager.trees) {
            if (tree.x < startX - 1 || tree.x > endX + 1 || tree.y < startY - 1 || tree.y > endY + 1) continue;
            const sx = tree.x * TILE_SIZE;
            const sy = tree.y * TILE_SIZE;
            const scale = tree.size / 4;
            const w = 12 * scale;
            ctx.beginPath();
            ctx.ellipse(sx + 4, sy + 4, w, w * 0.4, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Building shadows
        for (const b of this.game.entityManager.buildings) {
            if (b.x + b.size < startX || b.x > endX || b.y + b.size < startY || b.y > endY) continue;
            const sx = b.x * TILE_SIZE;
            const sy = b.y * TILE_SIZE;
            const bw = b.size * TILE_SIZE;
            const bh = b.size * TILE_SIZE;
            ctx.fillRect(sx + 4, sy + bh - 2, bw + 4, 6);
        }
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
                const scale = tree.size / 3;
                ctx.drawImage(sprite,
                    sx - sprite.width * scale / 2,
                    sy - sprite.height * scale + 8,
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

    // ===== VEHICLES (decorative, near roads/buildings) =====
    renderVehicles() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const world = this.game.world;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();
        const tick = this.game.tick;
        const era = this.game.currentEra;

        // Only show vehicles in later eras
        const eraIndex = this.game.simulation.techLevel;
        if (eraIndex < 60) return; // Bronze age+

        // Render decorative vehicles on/near roads
        for (let y = Math.max(0, startY); y < Math.min(world.height, endY); y += 3) {
            for (let x = Math.max(0, startX); x < Math.min(world.width, endX); x += 3) {
                const terrain = world.getTerrain(x, y);
                if (terrain !== TERRAIN.ROAD) continue;

                const hash = ((x * 374761393 + y * 668265263) >>> 0) % 100;
                if (hash > 12) continue; // Only some roads have vehicles

                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;
                // Animate position slowly along road
                const offset = Math.sin(tick * 0.005 + hash) * TILE_SIZE * 0.3;

                if (eraIndex >= 1000) {
                    // Modern era - car
                    const sprite = this.sprites.get('car');
                    if (sprite) {
                        ctx.drawImage(sprite, px + offset, py + 2, TILE_SIZE * 0.8, TILE_SIZE * 0.5);
                    }
                } else if (eraIndex >= 250) {
                    // Medieval+ - cart
                    const sprite = this.sprites.get('cart');
                    if (sprite) {
                        ctx.drawImage(sprite, px + offset, py + 4, TILE_SIZE * 0.7, TILE_SIZE * 0.45);
                    }
                }
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
                const scale = p.age < 15 ? 1.6 : 2.0;
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

                const scale = 2.2;
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

    // ===== WATER SHIMMER (ambient enhancement) =====
    renderWaterShimmer() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const world = this.game.world;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();
        const tick = this.game.tick;
        const T = TILE_SIZE;

        if (cam.zoom < 0.5) return;

        for (let y = Math.max(0, startY); y < Math.min(world.height, endY); y += 2) {
            for (let x = Math.max(0, startX); x < Math.min(world.width, endX); x += 2) {
                const terrain = world.getTerrain(x, y);
                if (terrain !== TERRAIN.DEEP_WATER && terrain !== TERRAIN.SHALLOW_WATER) continue;

                const px = x * T;
                const py = y * T;

                // Primary shimmer
                const shimmer = Math.sin(tick * 0.03 + x * 0.7 + y * 0.5) *
                               Math.cos(tick * 0.02 + x * 0.3 - y * 0.4);

                if (shimmer > 0.4) {
                    const alpha = (shimmer - 0.4) * 0.35;
                    ctx.fillStyle = `rgba(200,230,255,${alpha})`;
                    const sx = 3 + Math.sin(tick * 0.04 + x) * 3;
                    const sy = 3 + Math.cos(tick * 0.03 + y) * 3;
                    ctx.fillRect(px + sx, py + sy, 4, 2);
                }

                // Secondary shimmer
                const shimmer2 = Math.sin(tick * 0.025 + x * 1.1 + y * 0.8);
                if (shimmer2 > 0.6) {
                    const alpha = (shimmer2 - 0.6) * 0.3;
                    ctx.fillStyle = `rgba(255,255,240,${alpha})`;
                    ctx.fillRect(px + T * 0.5 + Math.sin(tick * 0.05) * 4, py + T * 0.3, 3, 1);
                }

                // Third shimmer for depth
                const shimmer3 = Math.cos(tick * 0.018 + x * 0.5 + y * 1.2);
                if (shimmer3 > 0.65) {
                    const alpha = (shimmer3 - 0.65) * 0.2;
                    ctx.fillStyle = `rgba(180,220,255,${alpha})`;
                    ctx.fillRect(px + T * 0.7 + Math.cos(tick * 0.06) * 2, py + T * 0.6, 3, 1);
                }
            }
        }
    }

    // ===== BUILDING SMOKE (ambient life detail) =====
    renderBuildingSmoke() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const tick = this.game.tick;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();

        if (cam.zoom < 0.5) return;

        for (const b of this.game.entityManager.buildings) {
            if (b.x + b.size < startX || b.x > endX || b.y + b.size < startY || b.y > endY) continue;

            const smokeTypes = ['WORKSHOP', 'FACTORY', 'HUT'];
            if (!smokeTypes.includes(b.buildingType)) continue;

            const bx = (b.x + b.size * 0.7) * TILE_SIZE;
            const by = b.y * TILE_SIZE;

            // More smoke puffs with larger size
            for (let i = 0; i < 4; i++) {
                const age = ((tick + i * 35) % 140) / 140;
                if (age > 0.95) continue;

                const smokeX = bx + Math.sin(tick * 0.01 + i * 2) * 6 * age;
                const smokeY = by - 10 - age * 30;
                const size = 3 + age * 6;
                const alpha = Math.max(0, 0.18 * (1 - age));

                ctx.fillStyle = `rgba(180,180,190,${alpha})`;
                ctx.beginPath();
                ctx.arc(smokeX, smokeY, size, 0, Math.PI * 2);
                ctx.fill();

                // Lighter inner puff
                if (age < 0.5) {
                    ctx.fillStyle = `rgba(200,200,210,${alpha * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(smokeX, smokeY, size * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Building windows glow at night
            if (!this.game.isDaytime && b.buildingType !== 'FARM') {
                ctx.fillStyle = 'rgba(255,220,120,0.15)';
                const sx = b.x * TILE_SIZE;
                const sy = b.y * TILE_SIZE;
                const bw = b.size * TILE_SIZE;
                const bh = b.size * TILE_SIZE;
                ctx.fillRect(sx + bw * 0.2, sy + bh * 0.3, bw * 0.6, bh * 0.4);
            }
        }
    }

    // ===== FIREFLIES (night ambient effect) =====
    renderFireflies() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const timeOfDay = this.game.timeOfDay;
        const tick = this.game.tick;

        // Only at night / dusk / dawn
        if (timeOfDay > 0.25 && timeOfDay < 0.72) return;

        const viewW = this.game.canvas.width / cam.zoom;
        const viewH = this.game.canvas.height / cam.zoom;

        // Generate stable firefly positions based on camera area
        const count = this.game.ambientMode && this.game.ambientMode.active ? 25 : 10;
        for (let i = 0; i < count; i++) {
            // Pseudo-random but stable positions using index-based seeds
            const seed1 = Math.sin(i * 127.1 + 311.7) * 43758.5453;
            const seed2 = Math.sin(i * 269.5 + 183.3) * 43758.5453;
            const baseX = cam.x + (seed1 - Math.floor(seed1)) * viewW;
            const baseY = cam.y + (seed2 - Math.floor(seed2)) * viewH;

            // Floating motion
            const fx = baseX + Math.sin(tick * 0.008 + i * 1.7) * 8;
            const fy = baseY + Math.cos(tick * 0.006 + i * 2.3) * 6;

            // Pulsing glow
            const pulse = Math.sin(tick * 0.03 + i * 0.8);
            if (pulse < 0.2) continue; // Blink off sometimes

            const alpha = pulse * 0.5;
            const glowSize = 3 + pulse * 3;

            // Glow
            const grd = ctx.createRadialGradient(fx, fy, 0, fx, fy, glowSize);
            grd.addColorStop(0, `rgba(200,255,100,${alpha})`);
            grd.addColorStop(0.5, `rgba(150,255,50,${alpha * 0.3})`);
            grd.addColorStop(1, 'rgba(100,200,50,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(fx - glowSize, fy - glowSize, glowSize * 2, glowSize * 2);

            // Core bright dot
            ctx.fillStyle = `rgba(255,255,200,${alpha * 0.8})`;
            ctx.fillRect(fx - 0.5, fy - 0.5, 1, 1);
        }
    }

    // ===== DAY/NIGHT (icon-only, no screen overlay) =====
    renderDayNightOverlay() {
        // Day/night is shown only via the HUD time icon (☀️🌙🌅🌇)
        // No screen-darkening overlay - keeps the view always bright and clear
    }

    // ===== SHOCKWAVE RINGS (god power feedback) =====
    addShockwave(x, y, options = {}) {
        this.shockwaves.push({
            x, y,
            radius: options.startRadius || 0,
            maxRadius: options.maxRadius || 12,
            life: options.life || 40,
            maxLife: options.life || 40,
            color: options.color || '255,215,0',
            lineWidth: options.lineWidth || 3,
        });
    }

    renderShockwaves() {
        const ctx = this.ctx;
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const s = this.shockwaves[i];
            s.life--;
            const progress = 1 - s.life / s.maxLife;
            s.radius = s.maxRadius * progress;

            if (s.life <= 0) {
                this.shockwaves.splice(i, 1);
                continue;
            }

            const alpha = (s.life / s.maxLife) * 0.8;
            const px = s.x * TILE_SIZE;
            const py = s.y * TILE_SIZE;

            // Outer ring
            ctx.strokeStyle = `rgba(${s.color},${alpha})`;
            ctx.lineWidth = s.lineWidth * (s.life / s.maxLife);
            ctx.beginPath();
            ctx.arc(px, py, s.radius * TILE_SIZE, 0, Math.PI * 2);
            ctx.stroke();

            // Inner glow fill
            const grd = ctx.createRadialGradient(px, py, 0, px, py, s.radius * TILE_SIZE);
            grd.addColorStop(0, `rgba(${s.color},${alpha * 0.15})`);
            grd.addColorStop(0.7, `rgba(${s.color},${alpha * 0.05})`);
            grd.addColorStop(1, `rgba(${s.color},0)`);
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(px, py, s.radius * TILE_SIZE, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ===== GLOW POINTS (persistent god power marks) =====
    addGlowPoint(x, y, options = {}) {
        this.glowPoints.push({
            x, y,
            life: options.life || 120,
            maxLife: options.life || 120,
            color: options.color || '255,215,0',
            radius: options.radius || 4,
            pulse: options.pulse !== false,
        });
    }

    renderGlowPoints() {
        const ctx = this.ctx;
        for (let i = this.glowPoints.length - 1; i >= 0; i--) {
            const g = this.glowPoints[i];
            g.life--;
            if (g.life <= 0) {
                this.glowPoints.splice(i, 1);
                continue;
            }

            const alpha = (g.life / g.maxLife) * 0.6;
            const px = g.x * TILE_SIZE;
            const py = g.y * TILE_SIZE;
            const pulseScale = g.pulse ? 1 + Math.sin(this.game.tick * 0.1) * 0.3 : 1;
            const r = g.radius * TILE_SIZE * pulseScale;

            const grd = ctx.createRadialGradient(px, py, 0, px, py, r);
            grd.addColorStop(0, `rgba(${g.color},${alpha * 0.5})`);
            grd.addColorStop(0.4, `rgba(${g.color},${alpha * 0.2})`);
            grd.addColorStop(1, `rgba(${g.color},0)`);
            ctx.fillStyle = grd;
            ctx.fillRect(px - r, py - r, r * 2, r * 2);
        }
    }

    // ===== SCREEN FLASH (god power feedback, screen-space) =====
    triggerScreenFlash(color = '255,255,255', intensity = 0.4) {
        this.screenFlash = { alpha: intensity, color };
    }

    renderScreenFlash() {
        if (this.screenFlash.alpha <= 0) return;
        const ctx = this.ctx;
        ctx.fillStyle = `rgba(${this.screenFlash.color},${this.screenFlash.alpha})`;
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        this.screenFlash.alpha -= 0.015;
        if (this.screenFlash.alpha < 0) this.screenFlash.alpha = 0;
    }

    // ===== DIORAMA VIGNETTE (subtle for all modes, stronger for ambient) =====
    renderDioramaEdge() {
        const ctx = this.ctx;
        const w = this.game.canvas.width;
        const h = this.game.canvas.height;

        // Subtle edge darkening for diorama feel (always active)
        const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75);
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(0.8, 'rgba(0,0,0,0)');
        grd.addColorStop(1, 'rgba(0,0,0,0.15)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
    }

    // ===== VIGNETTE (screen-space, ambient mode only) =====
    renderVignette() {
        const ctx = this.ctx;
        const w = this.game.canvas.width;
        const h = this.game.canvas.height;

        // Dark vignette around edges for cinematic look
        const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.7);
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(0.7, 'rgba(0,0,0,0)');
        grd.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
    }
}
