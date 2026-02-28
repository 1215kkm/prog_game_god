import { TERRAIN_COLORS, TILE_SIZE } from '../core/constants.js';

export class Minimap {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scale = this.canvas.width / game.world.width;
        this.imageData = null;
        this.lastRenderTick = 0;

        this.setupInteraction();
    }

    init() {
        this.scale = this.canvas.width / this.game.world.width;
        this.renderFull();
    }

    setupInteraction() {
        const handleClick = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const tileX = mx / this.scale;
            const tileY = my / this.scale;
            this.game.camera.centerOn(tileX, tileY);
        };

        this.canvas.addEventListener('click', handleClick);

        let dragging = false;
        this.canvas.addEventListener('mousedown', () => { dragging = true; });
        this.canvas.addEventListener('mousemove', (e) => {
            if (dragging) handleClick(e);
        });
        window.addEventListener('mouseup', () => { dragging = false; });
    }

    renderFull() {
        const world = this.game.world;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.imageData = ctx.createImageData(w, h);
        const data = this.imageData.data;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const tileX = Math.floor(x / this.scale);
                const tileY = Math.floor(y / this.scale);
                const terrain = world.getTerrain(tileX, tileY);
                const color = TERRAIN_COLORS[terrain] || '#000';

                const rgb = this.hexToRgb(color);
                const idx = (y * w + x) * 4;
                data[idx] = rgb.r;
                data[idx + 1] = rgb.g;
                data[idx + 2] = rgb.b;
                data[idx + 3] = 255;
            }
        }
    }

    render() {
        // Only re-render terrain every 300 ticks
        if (this.game.tick - this.lastRenderTick > 300) {
            this.renderFull();
            this.lastRenderTick = this.game.tick;
        }

        if (!this.imageData) return;

        const ctx = this.ctx;
        ctx.putImageData(this.imageData, 0, 0);

        // Draw entities
        // Buildings
        ctx.fillStyle = '#ff0';
        for (const b of this.game.entityManager.buildings) {
            ctx.fillRect(b.x * this.scale, b.y * this.scale, Math.max(1, b.size * this.scale), Math.max(1, b.size * this.scale));
        }

        // People (as dots)
        ctx.fillStyle = '#fff';
        for (const p of this.game.entityManager.people) {
            if (!p.alive) continue;
            ctx.fillRect(p.x * this.scale - 0.5, p.y * this.scale - 0.5, 1, 1);
        }

        // Camera viewport
        const cam = this.game.camera;
        const canvas = this.game.canvas;
        const vx = cam.x / TILE_SIZE * this.scale;
        const vy = cam.y / TILE_SIZE * this.scale;
        const vw = (canvas.width / cam.zoom) / TILE_SIZE * this.scale;
        const vh = (canvas.height / cam.zoom) / TILE_SIZE * this.scale;

        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(vx, vy, vw, vh);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        } : { r: 0, g: 0, b: 0 };
    }
}
