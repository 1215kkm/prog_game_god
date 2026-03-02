import { TILE_SIZE } from '../core/constants.js';

export class Camera {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
        this.zoom = 1.2;
        this.minZoom = 0.3;
        this.maxZoom = 4;

        this.dragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragCamX = 0;
        this.dragCamY = 0;

        // Shake
        this.shakeAmount = 0;
        this.shakeDuration = 0;
        this.shakeX = 0;
        this.shakeY = 0;

        this.setupControls();
    }

    setupControls() {
        const canvas = this.game.canvas;

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.dragging = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.dragCamX = this.x;
                this.dragCamY = this.y;
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (this.dragging) {
                const dx = (e.clientX - this.dragStartX) / this.zoom;
                const dy = (e.clientY - this.dragStartY) / this.zoom;
                this.x = this.dragCamX - dx;
                this.y = this.dragCamY - dy;
                this.clamp();
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                const dx = Math.abs(e.clientX - this.dragStartX);
                const dy = Math.abs(e.clientY - this.dragStartY);
                if (dx < 5 && dy < 5) {
                    // This was a click, not a drag
                    this.handleClick(e);
                }
                this.dragging = false;
            }
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const oldZoom = this.zoom;
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomDelta));

            // Zoom toward mouse position
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const worldX = this.x + mx / oldZoom;
            const worldY = this.y + my / oldZoom;
            this.x = worldX - mx / this.zoom;
            this.y = worldY - my / this.zoom;
            this.clamp();
        }, { passive: false });

        // Touch support
        let lastTouchDist = 0;
        let lastTouchX = 0;
        let lastTouchY = 0;

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                this.dragging = true;
                this.dragStartX = e.touches[0].clientX;
                this.dragStartY = e.touches[0].clientY;
                this.dragCamX = this.x;
                this.dragCamY = this.y;
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDist = Math.sqrt(dx * dx + dy * dy);
                lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this.dragging) {
                const dx = (e.touches[0].clientX - this.dragStartX) / this.zoom;
                const dy = (e.touches[0].clientY - this.dragStartY) / this.zoom;
                this.x = this.dragCamX - dx;
                this.y = this.dragCamY - dy;
                this.clamp();
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (lastTouchDist > 0) {
                    const scale = dist / lastTouchDist;
                    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * scale));
                }
                lastTouchDist = dist;
                this.clamp();
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            this.dragging = false;
            lastTouchDist = 0;
        });

        // Keyboard
        this.keys = {};
        window.addEventListener('keydown', (e) => { this.keys[e.key] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });
    }

    handleClick(e) {
        const rect = this.game.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const worldX = (this.x + mx / this.zoom) / TILE_SIZE;
        const worldY = (this.y + my / this.zoom) / TILE_SIZE;

        // If a god power is selected, use it
        if (this.game.godPowers.activePower) {
            this.game.godPowers.usePower(worldX, worldY);
            return;
        }

        // Otherwise, select entity
        const result = this.game.entityManager.getEntityAt(worldX, worldY, 1.5);
        if (result) {
            this.game.ui.showEntityInfo(result);
        } else {
            this.game.ui.showTileInfo(Math.floor(worldX), Math.floor(worldY));
        }
    }

    update() {
        // Keyboard scrolling
        const scrollSpeed = 5 / this.zoom;
        if (this.keys['ArrowLeft'] || this.keys['a']) this.x -= scrollSpeed;
        if (this.keys['ArrowRight'] || this.keys['d']) this.x += scrollSpeed;
        if (this.keys['ArrowUp'] || this.keys['w']) this.y -= scrollSpeed;
        if (this.keys['ArrowDown'] || this.keys['s']) this.y += scrollSpeed;

        // Shake
        if (this.shakeDuration > 0) {
            this.shakeDuration--;
            this.shakeX = (Math.random() - 0.5) * this.shakeAmount;
            this.shakeY = (Math.random() - 0.5) * this.shakeAmount;
            this.shakeAmount *= 0.95;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        this.clamp();
    }

    centerOn(tileX, tileY) {
        const canvas = this.game.canvas;
        this.x = tileX * TILE_SIZE - canvas.width / (2 * this.zoom);
        this.y = tileY * TILE_SIZE - canvas.height / (2 * this.zoom);
        this.clamp();
    }

    clamp() {
        const world = this.game.world;
        const maxX = world.getPixelWidth() - this.game.canvas.width / this.zoom;
        const maxY = world.getPixelHeight() - this.game.canvas.height / this.zoom;
        this.x = Math.max(0, Math.min(maxX, this.x));
        this.y = Math.max(0, Math.min(maxY, this.y));
    }

    shake(amount, duration) {
        this.shakeAmount = amount;
        this.shakeDuration = duration;
    }

    screenToWorld(sx, sy) {
        return {
            x: (this.x + sx / this.zoom) / TILE_SIZE,
            y: (this.y + sy / this.zoom) / TILE_SIZE,
        };
    }

    worldToScreen(wx, wy) {
        return {
            x: (wx * TILE_SIZE - this.x) * this.zoom + this.shakeX,
            y: (wy * TILE_SIZE - this.y) * this.zoom + this.shakeY,
        };
    }

    getVisibleTileRange() {
        const canvas = this.game.canvas;
        const startX = Math.floor(this.x / TILE_SIZE);
        const startY = Math.floor(this.y / TILE_SIZE);
        const endX = Math.ceil((this.x + canvas.width / this.zoom) / TILE_SIZE);
        const endY = Math.ceil((this.y + canvas.height / this.zoom) / TILE_SIZE);
        return { startX, startY, endX, endY };
    }
}
