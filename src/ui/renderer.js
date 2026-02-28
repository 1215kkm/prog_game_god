import { TILE_SIZE, TERRAIN_COLORS, TERRAIN, BUILDING_TYPE, NPC_STATE } from '../core/constants.js';

export class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.tileCache = null;
        this.tileCacheDirty = true;

        // Offscreen canvas for tile caching
        this.offCanvas = document.createElement('canvas');
        this.offCtx = this.offCanvas.getContext('2d');
    }

    render() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        cam.update();

        ctx.save();
        ctx.translate(cam.shakeX, cam.shakeY);
        ctx.scale(cam.zoom, cam.zoom);
        ctx.translate(-cam.x, -cam.y);

        this.renderTerrain();
        this.renderTrees();
        this.renderBuildings();
        this.renderAnimals();
        this.renderPeople();
        this.renderWeatherParticles();

        ctx.restore();
    }

    renderTerrain() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const world = this.game.world;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();

        for (let y = Math.max(0, startY); y < Math.min(world.height, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(world.width, endX); x++) {
                const terrain = world.getTerrain(x, y);
                ctx.fillStyle = this.getTerrainColor(terrain, x, y);
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    getTerrainColor(terrain, x, y) {
        const baseColor = TERRAIN_COLORS[terrain];
        if (!baseColor) return '#000';

        // Season tinting
        const season = this.game.season;
        if (terrain === TERRAIN.GRASS || terrain === TERRAIN.FOREST || terrain === TERRAIN.FARMLAND) {
            switch (season) {
                case 0: return this.tintColor(baseColor, '#80ff80', 0.1); // Spring - vibrant
                case 1: return baseColor; // Summer
                case 2: return this.tintColor(baseColor, '#cc8833', 0.25); // Fall - golden
                case 3: return this.tintColor(baseColor, '#ccddee', 0.3);  // Winter - frosty
            }
        }

        // Water animation
        if (terrain === TERRAIN.DEEP_WATER || terrain === TERRAIN.SHALLOW_WATER) {
            const wave = Math.sin(this.game.tick * 0.02 + x * 0.3 + y * 0.2) * 15;
            return this.adjustBrightness(baseColor, wave);
        }

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

    renderTrees() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();

        for (const tree of this.game.entityManager.trees) {
            if (tree.x < startX - 1 || tree.x > endX + 1 || tree.y < startY - 1 || tree.y > endY + 1) continue;

            const sx = tree.x * TILE_SIZE;
            const sy = tree.y * TILE_SIZE;
            const size = tree.size;

            // Tree trunk
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(sx + size * 0.8, sy + size * 1.5, size * 0.6, size);

            // Tree crown (circle)
            ctx.fillStyle = tree.color;
            ctx.beginPath();
            ctx.arc(sx + size, sy + size, size * 1.2, 0, Math.PI * 2);
            ctx.fill();

            // Season effects on trees
            if (this.game.season === 2) {
                // Fall: some orange/red leaves
                ctx.fillStyle = `hsl(${20 + Math.random() * 20}, 70%, 45%)`;
                ctx.beginPath();
                ctx.arc(sx + size + Math.random() * 2, sy + size + Math.random() * 2, size * 0.4, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.game.season === 3) {
                // Winter: no leaves, snow on top
                ctx.fillStyle = '#eef';
                ctx.beginPath();
                ctx.arc(sx + size, sy + size - size * 0.5, size * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

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

            // Building shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(sx + 2, sy + 2, bw, bh);

            // Main building
            ctx.fillStyle = b.color;
            ctx.fillRect(sx, sy, bw, bh);

            // Roof (darker)
            ctx.fillStyle = this.adjustBrightness(b.color, -30);
            ctx.fillRect(sx, sy, bw, bh * 0.3);

            // Building outline
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(sx, sy, bw, bh);

            // Special decorations
            if (b.buildingType === 'TEMPLE' || b.buildingType === 'CHURCH') {
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(sx + bw / 2, sy + 2, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Damage indicator
            if (b.health < 50) {
                ctx.fillStyle = `rgba(255,0,0,${0.3 * (1 - b.health / 50)})`;
                ctx.fillRect(sx, sy, bw, bh);
            }
        }
    }

    renderPeople() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();

        for (const p of this.game.entityManager.people) {
            if (!p.alive) continue;
            if (p.x < startX - 1 || p.x > endX + 1 || p.y < startY - 1 || p.y > endY + 1) continue;

            const sx = p.x * TILE_SIZE;
            const sy = p.y * TILE_SIZE;
            const size = p.size;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + size * 0.5, size * 0.7, size * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();

            // Head (lighter)
            ctx.fillStyle = '#ffccaa';
            ctx.beginPath();
            ctx.arc(sx, sy - size * 0.7, size * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // State indicator (only visible when zoomed in)
            if (cam.zoom > 2) {
                let stateIcon = '';
                switch (p.state) {
                    case NPC_STATE.SLEEPING: stateIcon = '💤'; break;
                    case NPC_STATE.EATING: stateIcon = '🍖'; break;
                    case NPC_STATE.WORKING: stateIcon = '⚒'; break;
                    case NPC_STATE.SOCIALIZING: stateIcon = '💬'; break;
                    case NPC_STATE.BUILDING: stateIcon = '🏗'; break;
                    case NPC_STATE.FLEEING: stateIcon = '❗'; break;
                }
                if (stateIcon) {
                    ctx.font = `${8}px sans-serif`;
                    ctx.fillText(stateIcon, sx - 4, sy - size * 1.5);
                }
            }

            // Child indicator
            if (p.age < 15) {
                ctx.fillStyle = 'rgba(255,255,0,0.5)';
                ctx.beginPath();
                ctx.arc(sx, sy, size + 1, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    renderAnimals() {
        const ctx = this.ctx;
        const cam = this.game.camera;
        const { startX, startY, endX, endY } = cam.getVisibleTileRange();

        for (const a of this.game.entityManager.animals) {
            if (!a.alive) continue;
            if (a.x < startX - 1 || a.x > endX + 1 || a.y < startY - 1 || a.y > endY + 1) continue;

            const sx = a.x * TILE_SIZE;
            const sy = a.y * TILE_SIZE;

            // Body
            ctx.fillStyle = a.color;
            ctx.beginPath();
            if (a.type === 'BIRD') {
                // Bird: V shape
                const bobY = Math.sin(this.game.tick * 0.1 + a.x) * 2;
                ctx.moveTo(sx - 3, sy + bobY);
                ctx.lineTo(sx, sy - 2 + bobY);
                ctx.lineTo(sx + 3, sy + bobY);
                ctx.stroke();
            } else if (a.type === 'FISH') {
                // Fish: oval
                ctx.ellipse(sx, sy, 3, 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Generic animal: circle
                ctx.arc(sx, sy, a.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderWeatherParticles() {
        const ctx = this.ctx;
        const weather = this.game.weather;
        const cam = this.game.camera;

        if (weather.current === 'rain' || weather.current === 'storm') {
            const count = weather.current === 'storm' ? 200 : 80;
            ctx.strokeStyle = 'rgba(120,180,255,0.4)';
            ctx.lineWidth = 0.5;

            for (let i = 0; i < count; i++) {
                const rx = cam.x + Math.random() * (this.game.canvas.width / cam.zoom);
                const ry = cam.y + Math.random() * (this.game.canvas.height / cam.zoom);
                const len = 3 + Math.random() * 5;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx + weather.windSpeed * 2, ry + len);
                ctx.stroke();
            }
        }

        if (weather.current === 'snow') {
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            for (let i = 0; i < 60; i++) {
                const rx = cam.x + Math.random() * (this.game.canvas.width / cam.zoom);
                const ry = cam.y + Math.random() * (this.game.canvas.height / cam.zoom);
                const size = 1 + Math.random() * 2;
                ctx.beginPath();
                ctx.arc(rx, ry, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Lightning flash
        if (weather.lightningFlash > 0 && weather.current === 'storm') {
            ctx.fillStyle = `rgba(255,255,200,${weather.lightningFlash * 0.1})`;
            ctx.fillRect(cam.x, cam.y,
                this.game.canvas.width / cam.zoom,
                this.game.canvas.height / cam.zoom);
        }
    }
}
