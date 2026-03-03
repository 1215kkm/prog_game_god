import { NPC_STATE, GIANT_CONFIG } from '../core/constants.js';

export class Giant {
    constructor(game, x, y, options = {}) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;

        this.name = options.name || '거인';
        this.giantSize = options.size || GIANT_CONFIG.baseSize;
        this.health = GIANT_CONFIG.health;
        this.speed = GIANT_CONFIG.speed;
        this.threat = GIANT_CONFIG.threat;

        this.state = NPC_STATE.WALKING;
        this.stateTimer = 0;
        this.targetX = x;
        this.targetY = y;
        this.alive = true;

        this.reactionRadius = this.giantSize * 3;
        this.damageRadius = this.giantSize * 1.5;
        this.age = 0;
        this.maxAge = 200 + Math.random() * 100;

        // Stomp cooldown
        this.stompCooldown = 0;
    }

    update() {
        if (!this.alive) return;

        this.stateTimer++;
        this.age += 0.001;

        if (this.age >= this.maxAge) {
            this.die('수명');
            return;
        }

        this.think();
        this.move();
        this.affectSurroundings();

        if (this.stompCooldown > 0) this.stompCooldown--;
    }

    think() {
        switch (this.state) {
            case NPC_STATE.WALKING:
                if (this.stateTimer > 200 + Math.random() * 200) {
                    this.setState(NPC_STATE.IDLE);
                }
                if (!this.hasTarget()) {
                    this.setRandomTarget();
                }
                break;
            case NPC_STATE.IDLE:
                if (this.stateTimer > 100 + Math.random() * 100) {
                    this.setState(NPC_STATE.WALKING);
                    this.setRandomTarget();
                }
                // Stomp while idle
                if (this.stompCooldown <= 0 && Math.random() < 0.01) {
                    this.stomp();
                }
                break;
        }
    }

    move() {
        if (this.state !== NPC_STATE.WALKING) return;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.5) {
            this.prevX = this.x;
            this.prevY = this.y;
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        } else {
            this.setState(NPC_STATE.IDLE);
        }

        // Bounds
        this.x = Math.max(3, Math.min(this.game.world.width - 3, this.x));
        this.y = Math.max(3, Math.min(this.game.world.height - 3, this.y));
    }

    affectSurroundings() {
        // Make nearby people react
        const em = this.game.entityManager;
        for (const person of em.people) {
            if (!person.alive) continue;
            const dx = person.x - this.x;
            const dy = person.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.reactionRadius) {
                // Fear reaction
                if (person.state !== NPC_STATE.FLEEING && person.state !== NPC_STATE.COWERING) {
                    if (dist < this.damageRadius) {
                        person.setState(NPC_STATE.COWERING);
                        person.happiness = Math.max(0, person.happiness - 5);
                    } else {
                        person.flee(this.x, this.y);
                    }
                }
            }
        }

        // Damage buildings nearby while walking
        if (this.state === NPC_STATE.WALKING) {
            for (const building of em.buildings) {
                const dx = building.x - this.x;
                const dy = building.y - this.y;
                if (Math.abs(dx) < this.damageRadius && Math.abs(dy) < this.damageRadius) {
                    building.health -= 0.1;
                }
            }
        }
    }

    stomp() {
        this.stompCooldown = 200;
        this.game.camera3d?.shake(this.giantSize * 0.5, 20);
        this.game.renderer?.addShockwave(this.x, this.y, this.giantSize * 2, '#886644');
        this.game.renderer?.addParticleEffect(this.x, this.y, 'large', '#886644');
        this.game.notify(`${this.name}이(가) 발을 굴렀습니다!`);

        // Damage and scare nearby
        const em = this.game.entityManager;
        for (const person of em.people) {
            const dx = person.x - this.x;
            const dy = person.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.giantSize * 2) {
                person.health -= 5;
                person.flee(this.x, this.y);
            }
        }
    }

    setRandomTarget() {
        const range = 15 + Math.random() * 25;
        this.targetX = this.x + (Math.random() - 0.5) * range;
        this.targetY = this.y + (Math.random() - 0.5) * range;
        this.targetX = Math.max(3, Math.min(this.game.world.width - 3, this.targetX));
        this.targetY = Math.max(3, Math.min(this.game.world.height - 3, this.targetY));
    }

    hasTarget() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        return Math.sqrt(dx * dx + dy * dy) > 1;
    }

    setState(state) {
        this.state = state;
        this.stateTimer = 0;
    }

    die(cause) {
        this.alive = false;
        this.game.notify(`${this.name}이(가) ${cause}(으)로 쓰러졌습니다.`);
    }

    getInfo() {
        return {
            name: this.name,
            type: '거인',
            size: this.giantSize,
            health: Math.floor(this.health),
            state: this.state === NPC_STATE.WALKING ? '이동 중' : '서 있음',
            age: Math.floor(this.age),
        };
    }
}
