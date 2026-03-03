// 3D Diorama Camera System
import * as THREE from 'three';
import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from '../core/constants.js';

export class Camera3D {
    constructor(game) {
        this.game = game;

        // Camera target (world tile coordinates)
        this.targetX = WORLD_WIDTH / 2;
        this.targetZ = WORLD_HEIGHT / 2;

        // Camera orbit angles
        this.orbitAngle = Math.PI / 4;     // horizontal rotation
        this.tiltAngle = Math.PI / 3.5;    // vertical tilt (60 deg from horizontal)
        this.distance = 40;                 // distance from target

        // Zoom
        this.zoom = 1.0;
        this.minZoom = 0.3;
        this.maxZoom = 3.0;

        // Dragging
        this.dragging = false;
        this.rotating = false;
        this.tilting = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragTargetX = 0;
        this.dragTargetZ = 0;
        this.dragOrbitAngle = 0;
        this.dragTiltAngle = 0;

        // Shake
        this.shakeAmount = 0;
        this.shakeDuration = 0;
        this.shakeX = 0;
        this.shakeY = 0;

        // Keyboard
        this.keys = {};

        // Compatibility properties for existing code
        this.x = 0;
        this.y = 0;

        // Three.js camera
        this.threeCamera = null;

        this.setupCamera();
    }

    setupCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 30;
        this.frustumSize = frustumSize;

        this.threeCamera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            500
        );

        this.updateCameraPosition();
    }

    setupControls() {
        const canvas = this.game.canvas3d || this.game.canvas;
        if (!canvas) return;

        // Mouse events
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.dragging = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.dragTargetX = this.targetX;
                this.dragTargetZ = this.targetZ;
            } else if (e.button === 1) {
                // Middle-click: orbit + tilt
                this.tilting = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.dragOrbitAngle = this.orbitAngle;
                this.dragTiltAngle = this.tiltAngle;
                e.preventDefault();
            } else if (e.button === 2) {
                this.rotating = true;
                this.dragStartX = e.clientX;
                this.dragOrbitAngle = this.orbitAngle;
                e.preventDefault();
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (this.dragging) {
                const dx = (e.clientX - this.dragStartX) / (this.zoom * 20);
                const dy = (e.clientY - this.dragStartY) / (this.zoom * 20);
                const cosA = Math.cos(this.orbitAngle);
                const sinA = Math.sin(this.orbitAngle);
                this.targetX = this.dragTargetX - (dx * cosA + dy * sinA);
                this.targetZ = this.dragTargetZ - (-dx * sinA + dy * cosA);
                this.clamp();
            }
            if (this.tilting) {
                const dx = (e.clientX - this.dragStartX) * 0.005;
                const dy = (e.clientY - this.dragStartY) * 0.005;
                this.orbitAngle = this.dragOrbitAngle + dx;
                this.tiltAngle = Math.max(0.15, Math.min(Math.PI / 2.1, this.dragTiltAngle + dy));
            }
            if (this.rotating) {
                const dx = (e.clientX - this.dragStartX) * 0.005;
                this.orbitAngle = this.dragOrbitAngle + dx;
            }

            // Update ghost preview position for placement system
            if (this.game.placementSystem && this.game.placementSystem.active) {
                const rect = canvas.getBoundingClientRect();
                const hit = this.game.renderer.raycastAtScreen(
                    e.clientX - rect.left, e.clientY - rect.top);
                if (hit) {
                    this.game.renderer.updateGhostPosition(hit.x, hit.z);
                }
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0 && this.dragging) {
                const dx = Math.abs(e.clientX - this.dragStartX);
                const dy = Math.abs(e.clientY - this.dragStartY);
                if (dx < 5 && dy < 5) {
                    this.handleClick(e);
                }
                this.dragging = false;
            }
            if (e.button === 1) {
                this.tilting = false;
            }
            if (e.button === 2) {
                this.rotating = false;
            }
        });

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));
            this.updateProjection();
        }, { passive: false });

        // Touch support
        let lastTouchDist = 0;
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                this.dragging = true;
                this.dragStartX = e.touches[0].clientX;
                this.dragStartY = e.touches[0].clientY;
                this.dragTargetX = this.targetX;
                this.dragTargetZ = this.targetZ;
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDist = Math.sqrt(dx * dx + dy * dy);
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this.dragging) {
                const dx = (e.touches[0].clientX - this.dragStartX) / (this.zoom * 20);
                const dy = (e.touches[0].clientY - this.dragStartY) / (this.zoom * 20);
                const cosA = Math.cos(this.orbitAngle);
                const sinA = Math.sin(this.orbitAngle);
                this.targetX = this.dragTargetX - (dx * cosA + dy * sinA);
                this.targetZ = this.dragTargetZ - (-dx * sinA + dy * cosA);
                this.clamp();
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (lastTouchDist > 0) {
                    const scale = dist / lastTouchDist;
                    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * scale));
                    this.updateProjection();
                }
                lastTouchDist = dist;
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                if (this.dragging) {
                    // Check for tap
                    this.dragging = false;
                }
                lastTouchDist = 0;
            }
        });

        // Keyboard
        window.addEventListener('keydown', (e) => { this.keys[e.key] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });
    }

    handleClick(e) {
        const rect = (this.game.canvas3d || this.game.canvas).getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Raycast to find world position
        const hit = this.game.renderer.raycastAtScreen(mx, my);
        if (!hit) return;

        const worldX = hit.x;
        const worldY = hit.z;

        // Placement system active?
        if (this.game.placementSystem && this.game.placementSystem.active) {
            this.game.placementSystem.placeAt(worldX, worldY);
            return;
        }

        // God power active?
        if (this.game.godPowers.activePower) {
            this.game.godPowers.usePower(worldX, worldY);
            return;
        }

        // Select entity
        const result = this.game.entityManager.getEntityAt(worldX, worldY, 1.5);
        if (result) {
            this.game.ui.showEntityInfo(result);
        } else {
            this.game.ui.showTileInfo(Math.floor(worldX), Math.floor(worldY));
        }
    }

    update() {
        // Keyboard scrolling
        const scrollSpeed = 0.5 / this.zoom;
        const cosA = Math.cos(this.orbitAngle);
        const sinA = Math.sin(this.orbitAngle);

        let moveX = 0, moveZ = 0;
        if (this.keys['ArrowLeft'] || this.keys['a']) { moveX -= scrollSpeed; }
        if (this.keys['ArrowRight'] || this.keys['d']) { moveX += scrollSpeed; }
        if (this.keys['ArrowUp'] || this.keys['w']) { moveZ -= scrollSpeed; }
        if (this.keys['ArrowDown'] || this.keys['s']) { moveZ += scrollSpeed; }

        if (moveX || moveZ) {
            this.targetX += moveX * cosA + moveZ * sinA;
            this.targetZ += -moveX * sinA + moveZ * cosA;
            this.clamp();
        }

        // Q/E to rotate
        if (this.keys['q']) this.orbitAngle -= 0.02;
        if (this.keys['e']) this.orbitAngle += 0.02;

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

        this.updateCameraPosition();

        // Update compatibility props
        this.x = this.targetX;
        this.y = this.targetZ;
    }

    updateCameraPosition() {
        if (!this.threeCamera) return;

        const d = this.distance / this.zoom;
        const cx = this.targetX + Math.cos(this.orbitAngle) * Math.cos(this.tiltAngle) * d;
        const cy = Math.sin(this.tiltAngle) * d;
        const cz = this.targetZ + Math.sin(this.orbitAngle) * Math.cos(this.tiltAngle) * d;

        this.threeCamera.position.set(
            cx + this.shakeX,
            cy + this.shakeY,
            cz
        );
        this.threeCamera.lookAt(this.targetX, 0, this.targetZ);
    }

    updateProjection() {
        if (!this.threeCamera) return;
        const aspect = window.innerWidth / window.innerHeight;
        const size = this.frustumSize / this.zoom;
        this.threeCamera.left = -size * aspect / 2;
        this.threeCamera.right = size * aspect / 2;
        this.threeCamera.top = size / 2;
        this.threeCamera.bottom = -size / 2;
        this.threeCamera.updateProjectionMatrix();
    }

    centerOn(tileX, tileY) {
        this.targetX = tileX;
        this.targetZ = tileY;
        this.clamp();
    }

    clamp() {
        this.targetX = Math.max(5, Math.min(WORLD_WIDTH - 5, this.targetX));
        this.targetZ = Math.max(5, Math.min(WORLD_HEIGHT - 5, this.targetZ));
    }

    shake(amount, duration) {
        this.shakeAmount = amount * 0.3;
        this.shakeDuration = duration;
    }

    onResize(w, h) {
        this.updateProjection();
    }

    // Compatibility methods for existing code
    screenToWorld(sx, sy) {
        const hit = this.game.renderer.raycastAtScreen(sx, sy);
        if (hit) return { x: hit.x, y: hit.z };
        return { x: this.targetX, y: this.targetZ };
    }

    worldToScreen(wx, wy) {
        if (!this.threeCamera) return { x: 0, y: 0 };
        const vec = new THREE.Vector3(wx, 0, wy);
        vec.project(this.threeCamera);
        const canvas = this.game.canvas3d || this.game.canvas;
        return {
            x: (vec.x + 1) / 2 * canvas.clientWidth,
            y: (-vec.y + 1) / 2 * canvas.clientHeight
        };
    }

    getVisibleTileRange() {
        const r = this.distance / this.zoom;
        return {
            startX: Math.floor(this.targetX - r),
            startY: Math.floor(this.targetZ - r),
            endX: Math.ceil(this.targetX + r),
            endY: Math.ceil(this.targetZ + r)
        };
    }
}
