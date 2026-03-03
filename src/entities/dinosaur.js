import { DINOSAUR_TYPE, TERRAIN } from '../core/constants.js';

export class Dinosaur {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;

        this.type = type;
        this.config = DINOSAUR_TYPE[type];
        this.name = this.config.name;
        this.health = 100 + this.config.size * 20;
        this.maxHealth = this.health;
        this.hunger = 30;
        this.speed = this.config.speed * 0.03;
        this.size = this.config.size;

        this.state = 'wandering';
        this.stateTimer = 0;
        this.targetX = x;
        this.targetY = y;
        this.alive = true;

        this.age = 0;
        this.maxAge = 30 + Math.random() * 20;
    }

    update() {
        if (!this.alive) return;

        this.stateTimer++;
        this.age += 0.002;

        if (this.age >= this.maxAge) {
            this.die('노화');
            return;
        }

        // Hunger
        if (this.game.tick % 60 === 0) {
            this.hunger = Math.min(100, this.hunger + 0.5);
        }
        if (this.hunger > 90) this.health -= 0.3;
        if (this.health <= 0) {
            this.die('아사');
            return;
        }

        this.think();
        this.move();
    }

    think() {
        switch (this.state) {
            case 'wandering':
                if (this.stateTimer > 150 + Math.random() * 200) {
                    if (this.hunger > 60) {
                        this.state = 'hunting';
                        this.stateTimer = 0;
                    } else {
                        this.setRandomTarget();
                        this.stateTimer = 0;
                    }
                }
                if (!this.hasTarget()) this.setRandomTarget();
                break;

            case 'hunting':
                if (this.config.herbivore) {
                    // Eat from environment
                    if (this.stateTimer > 80) {
                        this.hunger = Math.max(0, this.hunger - 30);
                        this.health = Math.min(this.maxHealth, this.health + 5);
                        this.state = 'wandering';
                        this.stateTimer = 0;
                    }
                } else {
                    // Predator: hunt other dinosaurs or animals
                    const prey = this.findPrey();
                    if (prey) {
                        const dx = prey.x - this.x;
                        const dy = prey.y - this.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 1.5) {
                            // Attack
                            prey.health -= 20;
                            this.hunger = Math.max(0, this.hunger - 40);
                            this.state = 'wandering';
                            this.stateTimer = 0;
                        } else {
                            this.targetX = prey.x;
                            this.targetY = prey.y;
                        }
                    }
                    if (this.stateTimer > 300) {
                        this.state = 'wandering';
                        this.stateTimer = 0;
                    }
                }
                break;

            case 'resting':
                if (this.stateTimer > 200) {
                    this.health = Math.min(this.maxHealth, this.health + 10);
                    this.state = 'wandering';
                    this.stateTimer = 0;
                }
                break;
        }
    }

    findPrey() {
        const em = this.game.entityManager;
        let closest = null;
        let closestDist = 15;

        // Hunt other herbivore dinosaurs
        if (em.dinosaurs) {
            for (const d of em.dinosaurs) {
                if (d === this || !d.alive || !d.config.herbivore) continue;
                if (d.size >= this.size) continue; // Don't hunt bigger prey
                const dx = d.x - this.x;
                const dy = d.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = d;
                }
            }
        }

        // Also hunt small animals
        for (const a of em.animals) {
            if (!a.alive) continue;
            const dx = a.x - this.x;
            const dy = a.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestDist = dist;
                closest = a;
            }
        }

        return closest;
    }

    move() {
        if (this.state === 'resting') return;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.5) {
            this.prevX = this.x;
            this.prevY = this.y;
            const spd = this.state === 'hunting' ? this.speed * 1.5 : this.speed;
            this.x += (dx / dist) * spd;
            this.y += (dy / dist) * spd;
        }

        this.x = Math.max(2, Math.min(this.game.world.width - 2, this.x));
        this.y = Math.max(2, Math.min(this.game.world.height - 2, this.y));

        // Avoid water (except for flying types)
        if (this.type !== 'PTERANODON' &&
            this.game.world.isWater(Math.floor(this.x), Math.floor(this.y))) {
            this.x = this.prevX;
            this.y = this.prevY;
            this.setRandomTarget();
        }
    }

    setRandomTarget() {
        const range = 15 + Math.random() * 20;
        this.targetX = this.x + (Math.random() - 0.5) * range;
        this.targetY = this.y + (Math.random() - 0.5) * range;
        this.targetX = Math.max(2, Math.min(this.game.world.width - 2, this.targetX));
        this.targetY = Math.max(2, Math.min(this.game.world.height - 2, this.targetY));
    }

    hasTarget() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        return Math.sqrt(dx * dx + dy * dy) > 1;
    }

    die(cause) {
        this.alive = false;
        this.game.notify(`${this.name}이(가) ${cause}(으)로 사라졌습니다.`);
    }

    getInfo() {
        return {
            name: this.name,
            type: '공룡',
            diet: this.config.herbivore ? '초식' : '육식',
            health: Math.floor(this.health),
            hunger: Math.floor(this.hunger),
            size: this.size,
            age: Math.floor(this.age),
            state: this.state === 'wandering' ? '배회 중' :
                   this.state === 'hunting' ? '사냥 중' : '쉬는 중',
        };
    }
}
