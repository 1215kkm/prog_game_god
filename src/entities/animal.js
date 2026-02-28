import { ANIMAL_TYPE, TERRAIN } from '../core/constants.js';

export class Animal {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.type = type;
        this.config = ANIMAL_TYPE[type];

        this.health = 100;
        this.hunger = 30;
        this.alive = true;
        this.age = Math.random() * 5;
        this.maxAge = 8 + Math.random() * 8;

        this.state = 'idle'; // idle, wandering, eating, fleeing, hunting
        this.stateTimer = 0;
        this.targetX = x;
        this.targetY = y;
        this.speed = this.config.speed * 0.02;

        this.size = 3;
        this.color = this.config.color;
        this.fleeTarget = null;
    }

    update() {
        if (!this.alive) return;

        this.stateTimer++;

        // Aging
        if (this.game.tick % 600 === 0) {
            this.age += 0.5;
            if (this.age >= this.maxAge) {
                this.alive = false;
                return;
            }
        }

        // Hunger
        if (this.game.tick % 60 === 0) {
            this.hunger = Math.min(100, this.hunger + 1);
            if (this.hunger > 90) this.health -= 1;
            if (this.health <= 0) {
                this.alive = false;
                return;
            }
        }

        this.think();
        this.move();
    }

    think() {
        switch (this.state) {
            case 'idle':
                if (this.hunger > 60) {
                    this.state = 'eating';
                    this.stateTimer = 0;
                } else if (Math.random() < 0.05) {
                    this.state = 'wandering';
                    this.stateTimer = 0;
                    this.setRandomTarget(8);
                }
                // Check for predators or people nearby
                if (!this.config.herbivore) {
                    // Predator: hunt if hungry
                    if (this.hunger > 40) {
                        const prey = this.findPrey();
                        if (prey) {
                            this.targetX = prey.x;
                            this.targetY = prey.y;
                            this.state = 'hunting';
                            this.stateTimer = 0;
                        }
                    }
                } else {
                    // Prey: check for predators
                    const predator = this.findPredator();
                    if (predator) {
                        this.fleeFrom(predator.x, predator.y);
                    }
                }
                break;

            case 'wandering':
                if (this.stateTimer > 80 + Math.random() * 80) {
                    this.state = 'idle';
                    this.stateTimer = 0;
                }
                break;

            case 'eating':
                if (this.stateTimer > 40) {
                    this.hunger = Math.max(0, this.hunger - 30);
                    this.health = Math.min(100, this.health + 2);
                    this.state = 'idle';
                    this.stateTimer = 0;
                }
                break;

            case 'fleeing':
                if (this.stateTimer > 60) {
                    this.state = 'idle';
                    this.stateTimer = 0;
                }
                break;

            case 'hunting':
                if (this.stateTimer > 100) {
                    this.state = 'idle';
                    this.stateTimer = 0;
                }
                // Check if reached prey
                const nearbyPrey = this.game.entityManager.animals.find(a =>
                    a !== this && a.alive && a.config.herbivore &&
                    Math.abs(a.x - this.x) < 1 && Math.abs(a.y - this.y) < 1
                );
                if (nearbyPrey) {
                    nearbyPrey.alive = false;
                    this.hunger = Math.max(0, this.hunger - 50);
                    this.state = 'idle';
                    this.stateTimer = 0;
                }
                break;
        }
    }

    move() {
        if (this.state === 'eating' || this.state === 'idle') return;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.5) {
            this.prevX = this.x;
            this.prevY = this.y;
            const spd = this.state === 'fleeing' ? this.speed * 1.8 : this.speed;
            this.x += (dx / dist) * spd;
            this.y += (dy / dist) * spd;
        } else if (this.state === 'wandering') {
            this.setRandomTarget(8);
        }

        // Bounds & water check
        this.x = Math.max(1, Math.min(this.game.world.width - 2, this.x));
        this.y = Math.max(1, Math.min(this.game.world.height - 2, this.y));

        const isFish = this.type === 'FISH';
        const terrain = this.game.world.getTerrain(Math.floor(this.x), Math.floor(this.y));
        const inWater = terrain === TERRAIN.DEEP_WATER || terrain === TERRAIN.SHALLOW_WATER;

        if (isFish && !inWater) {
            this.x = this.prevX;
            this.y = this.prevY;
            this.setRandomTarget(5);
        } else if (!isFish && inWater) {
            this.x = this.prevX;
            this.y = this.prevY;
            this.setRandomTarget(5);
        }
    }

    setRandomTarget(range) {
        this.targetX = this.x + (Math.random() - 0.5) * range * 2;
        this.targetY = this.y + (Math.random() - 0.5) * range * 2;
    }

    fleeFrom(fx, fy) {
        const dx = this.x - fx;
        const dy = this.y - fy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.targetX = this.x + (dx / dist) * 12;
        this.targetY = this.y + (dy / dist) * 12;
        this.state = 'fleeing';
        this.stateTimer = 0;
    }

    findPrey() {
        return this.game.entityManager.animals.find(a =>
            a !== this && a.alive && a.config.herbivore &&
            Math.abs(a.x - this.x) < 12 && Math.abs(a.y - this.y) < 12
        );
    }

    findPredator() {
        return this.game.entityManager.animals.find(a =>
            a !== this && a.alive && !a.config.herbivore &&
            Math.abs(a.x - this.x) < 8 && Math.abs(a.y - this.y) < 8
        );
    }
}
