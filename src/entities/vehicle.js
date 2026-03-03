import { VEHICLE_TYPE, TERRAIN, ERAS } from '../core/constants.js';

export class Vehicle {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;

        this.type = type;
        this.config = VEHICLE_TYPE[type];
        this.speed = this.config.speed * 0.02;
        this.alive = true;

        this.targetX = x;
        this.targetY = y;
        this.path = [];
        this.pathIndex = 0;

        this.lifespan = 500 + Math.random() * 500;
        this.age = 0;

        this.findNextRoadTarget();
    }

    update() {
        if (!this.alive) return;

        this.age++;
        if (this.age > this.lifespan) {
            this.alive = false;
            return;
        }

        // Check if era still supports this vehicle
        const currentEra = this.game.currentEra;
        const requiredEra = ERAS.find(e => e.id === this.config.eraId);
        if (requiredEra && this.game.simulation.techLevel < requiredEra.techRequired) {
            this.alive = false;
            return;
        }

        this.move();
    }

    move() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.3) {
            this.prevX = this.x;
            this.prevY = this.y;
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        } else {
            this.findNextRoadTarget();
        }

        this.x = Math.max(1, Math.min(this.game.world.width - 2, this.x));
        this.y = Math.max(1, Math.min(this.game.world.height - 2, this.y));
    }

    findNextRoadTarget() {
        const world = this.game.world;
        const cx = Math.floor(this.x);
        const cy = Math.floor(this.y);

        // Look for adjacent road tiles
        const neighbors = [];
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
                const terrain = world.getTerrain(nx, ny);
                if (terrain === TERRAIN.ROAD || terrain === TERRAIN.GRASS) {
                    neighbors.push({ x: nx + 0.5, y: ny + 0.5 });
                }
            }
        }

        if (neighbors.length > 0) {
            const target = neighbors[Math.floor(Math.random() * neighbors.length)];
            this.targetX = target.x;
            this.targetY = target.y;
        } else {
            // Random direction if no roads nearby
            this.targetX = this.x + (Math.random() - 0.5) * 10;
            this.targetY = this.y + (Math.random() - 0.5) * 10;
        }
    }
}
