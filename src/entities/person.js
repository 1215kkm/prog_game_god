import { NPC_STATE, TICKS_PER_DAY, TERRAIN, PERSONALITY } from '../core/constants.js';

// Korean name pools
const LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];
const MALE_NAMES = ['민수', '준호', '성진', '지훈', '현우', '동현', '승민', '태호', '영호', '철수', '기태', '상우', '도윤', '시우', '건우', '예준', '하준', '서준', '주원', '지호'];
const FEMALE_NAMES = ['수연', '미영', '지은', '서연', '유진', '하나', '소영', '민지', '예은', '수빈', '지아', '서윤', '하윤', '지우', '채원', '은서', '다은', '소연', '유나', '민서'];

export class Person {
    constructor(game, x, y, options = {}) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;

        this.gender = options.gender || (Math.random() > 0.5 ? 'male' : 'female');
        this.lastName = options.lastName || LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        const namePool = this.gender === 'male' ? MALE_NAMES : FEMALE_NAMES;
        this.firstName = options.firstName || namePool[Math.floor(Math.random() * namePool.length)];
        this.name = this.lastName + this.firstName;

        this.age = options.age ?? (10 + Math.random() * 30);
        this.maxAge = 60 + Math.random() * 30;
        this.health = 100;
        this.hunger = 50;
        this.energy = 80;
        this.happiness = 50;
        this.intelligence = 20 + Math.random() * 30;
        this.strength = 20 + Math.random() * 30;

        // Personality system
        this.personality = options.personality || 'NORMAL';
        const pConfig = PERSONALITY[this.personality];
        if (pConfig) {
            if (pConfig.intelligence) this.intelligence *= pConfig.intelligence;
            if (pConfig.strength) this.strength *= pConfig.strength;
            if (pConfig.charisma) this.charisma = pConfig.charisma;
        }
        this.charisma = this.charisma || 1.0;
        this.criminalActivity = 0; // criminal behavior counter

        this.state = NPC_STATE.IDLE;
        this.stateTimer = 0;
        this.targetX = x;
        this.targetY = y;
        this.path = null;
        this.pathIndex = 0;
        this.speed = 0.03 + Math.random() * 0.02;

        this.home = null;
        this.workplace = null;
        this.spouse = null;
        this.children = [];
        this.alive = true;

        this.socialCooldown = 0;
        this.workOutput = 0;

        // Visual
        this.size = this.age < 15 ? 3 : 4;
        this.color = pConfig ? pConfig.color : (this.gender === 'male' ? '#4488cc' : '#cc4488');

        // Reaction state
        this.fearTarget = null;
        this.inspireBoost = 0;
    }

    update() {
        if (!this.alive) return;

        this.stateTimer++;

        // Aging
        if (this.game.tick % (TICKS_PER_DAY * 10) === 0) {
            this.age += 0.5;
            this.size = this.age < 15 ? 3 : 4;
            if (this.age >= this.maxAge) {
                this.die('노환');
                return;
            }
        }

        // Needs decay
        if (this.game.tick % 30 === 0) {
            this.hunger = Math.min(100, this.hunger + 0.5);
            this.energy = Math.max(0, this.energy - 0.3);
        }

        // Health effects
        if (this.hunger > 90) this.health -= 0.5;
        if (this.energy < 10) this.health -= 0.2;
        if (this.health <= 0) {
            this.die('건강 악화');
            return;
        }

        // Weather effects
        const weather = this.game.weather.current;
        if (weather === 'storm') {
            this.happiness = Math.max(0, this.happiness - 0.1);
            if (Math.random() < 0.0001) {
                this.health -= 20;
                this.game.notify(`${this.name}이(가) 폭풍에 다쳤습니다!`);
            }
        }

        // Personality-specific behaviors
        this.personalityBehavior();

        // Inspire boost decay
        if (this.inspireBoost > 0) this.inspireBoost -= 0.01;

        // AI behavior
        this.think();
        this.move();
    }

    personalityBehavior() {
        switch (this.personality) {
            case 'CRIMINAL':
                // Occasionally steal food or lower others' happiness
                if (this.game.tick % 200 === 0 && Math.random() < 0.3) {
                    this.criminalActivity++;
                    const nearby = this.game.entityManager.findNearbyPerson(this, 5);
                    if (nearby) {
                        nearby.happiness = Math.max(0, nearby.happiness - 3);
                        this.game.simulation.foodSupply += 1; // steal food
                        if (this.criminalActivity % 5 === 0) {
                            this.game.notify(`${this.name}이(가) 범죄를 저질렀습니다!`);
                        }
                    }
                }
                break;
            case 'HEALER':
                // Periodically heal nearby people
                if (this.game.tick % 150 === 0) {
                    const nearby = this.game.entityManager.findNearbyPerson(this, 5);
                    if (nearby && nearby.health < 80) {
                        nearby.health = Math.min(100, nearby.health + 10);
                        nearby.happiness = Math.min(100, nearby.happiness + 2);
                    }
                }
                break;
            case 'LEADER':
                // Boost nearby people's work output and happiness
                if (this.game.tick % 100 === 0) {
                    const em = this.game.entityManager;
                    for (const p of em.people) {
                        if (p === this || !p.alive) continue;
                        const dx = p.x - this.x;
                        const dy = p.y - this.y;
                        if (dx * dx + dy * dy < 64) { // radius 8
                            p.happiness = Math.min(100, p.happiness + 1);
                            p.inspireBoost = 1.5;
                        }
                    }
                }
                break;
            case 'SCHOLAR':
                // Boost tech level
                if (this.game.tick % 100 === 0 && this.state === NPC_STATE.WORKING) {
                    this.game.simulation.techLevel += this.intelligence * 0.001;
                }
                break;
            case 'WARRIOR':
                // Protect from criminals nearby
                if (this.game.tick % 60 === 0) {
                    const em = this.game.entityManager;
                    for (const p of em.people) {
                        if (p === this || !p.alive || p.personality !== 'CRIMINAL') continue;
                        const dx = p.x - this.x;
                        const dy = p.y - this.y;
                        if (dx * dx + dy * dy < 36) { // radius 6
                            p.flee(this.x, this.y);
                            if (Math.random() < 0.1) {
                                p.health -= 10;
                                this.game.notify(`${this.name}이(가) ${p.name}을(를) 제압했습니다!`);
                            }
                        }
                    }
                }
                break;
        }
    }

    // React to a newly placed entity
    reactTo(entity, distance) {
        // Giant reaction
        if (entity.constructor?.name === 'Giant' || entity.giantSize) {
            if (distance < 5) {
                this.setState(NPC_STATE.COWERING);
                this.happiness = Math.max(0, this.happiness - 10);
            } else {
                this.flee(entity.x, entity.y);
                this.happiness = Math.max(0, this.happiness - 5);
            }
            this.game.notify(`${this.name}이(가) 거인을 보고 두려워합니다!`);
            return;
        }

        // Dinosaur reaction
        if (entity.constructor?.name === 'Dinosaur') {
            this.flee(entity.x, entity.y);
            this.happiness = Math.max(0, this.happiness - 15);
            return;
        }

        // Person with personality reaction
        if (entity.personality) {
            const pConfig = PERSONALITY[entity.personality];
            if (!pConfig) return;

            if (pConfig.threat > 0.5) {
                // Criminal - flee
                if (distance < 8) {
                    this.flee(entity.x, entity.y);
                    this.happiness = Math.max(0, this.happiness - 5);
                    if (Math.random() < 0.3) {
                        this.game.notify(`${this.name}이(가) 수상한 인물을 보고 피합니다.`);
                    }
                }
            } else if (pConfig.effect === 'inspire') {
                // Leader - approach
                this.happiness = Math.min(100, this.happiness + 5);
                this.inspireBoost = 1.5;
                if (Math.random() < 0.3) {
                    this.game.notify(`${this.name}이(가) 지도자에게 감화받았습니다.`);
                }
            } else if (pConfig.effect === 'heal') {
                // Healer - be happy
                this.happiness = Math.min(100, this.happiness + 3);
                this.health = Math.min(100, this.health + 5);
            } else if (pConfig.effect === 'educate') {
                // Scholar - boost intelligence
                this.intelligence = Math.min(100, this.intelligence + 2);
            } else if (pConfig.effect === 'protect') {
                // Warrior - feel safe
                this.happiness = Math.min(100, this.happiness + 2);
            }
        }
    }

    think() {
        const timeOfDay = this.game.timeOfDay;
        const isDaytime = this.game.isDaytime;

        switch (this.state) {
            case NPC_STATE.IDLE:
                if (this.hunger > 70) {
                    this.setState(NPC_STATE.EATING);
                } else if (this.energy < 20 || !isDaytime) {
                    this.setState(NPC_STATE.SLEEPING);
                } else if (isDaytime && this.age >= 15 && Math.random() < 0.3) {
                    this.setState(NPC_STATE.WORKING);
                } else if (this.socialCooldown <= 0 && Math.random() < 0.2) {
                    this.setState(NPC_STATE.SOCIALIZING);
                } else if (Math.random() < 0.4) {
                    this.setState(NPC_STATE.WALKING);
                }
                break;

            case NPC_STATE.WALKING:
                if (this.stateTimer > 100 + Math.random() * 100) {
                    this.setState(NPC_STATE.IDLE);
                }
                if (!this.path || this.pathIndex >= this.path.length) {
                    this.setRandomTarget();
                }
                break;

            case NPC_STATE.WORKING:
                if (this.stateTimer > 200) {
                    const boost = this.inspireBoost > 0 ? this.inspireBoost : 1;
                    this.workOutput += this.strength * 0.1 * boost;
                    this.game.simulation.techLevel += this.intelligence * 0.0001 * boost;
                    this.energy -= 5;
                    this.hunger += 3;
                    this.setState(NPC_STATE.IDLE);
                }
                break;

            case NPC_STATE.EATING:
                if (this.stateTimer > 30) {
                    if (this.game.simulation.foodSupply > 0) {
                        this.hunger = Math.max(0, this.hunger - 40);
                        this.game.simulation.foodSupply -= 0.5;
                        this.health = Math.min(100, this.health + 2);
                    }
                    this.setState(NPC_STATE.IDLE);
                }
                break;

            case NPC_STATE.SLEEPING:
                if (this.stateTimer > TICKS_PER_DAY * 0.3) {
                    this.energy = Math.min(100, this.energy + 50);
                    this.health = Math.min(100, this.health + 1);
                    this.setState(NPC_STATE.IDLE);
                }
                break;

            case NPC_STATE.SOCIALIZING:
                if (this.stateTimer > 60) {
                    const nearby = this.game.entityManager.findNearbyPerson(this, 5);
                    if (nearby) {
                        this.happiness = Math.min(100, this.happiness + 5);
                        nearby.happiness = Math.min(100, nearby.happiness + 5);
                        this.game.simulation.cultureLevel += 0.001;

                        // Romance
                        if (!this.spouse && !nearby.spouse &&
                            this.age >= 18 && nearby.age >= 18 &&
                            this.gender !== nearby.gender &&
                            Math.random() < 0.02) {
                            this.spouse = nearby;
                            nearby.spouse = this;
                            this.game.notify(`${this.name}과 ${nearby.name}이(가) 결혼했습니다!`);
                        }
                    }
                    this.socialCooldown = 100;
                    this.setState(NPC_STATE.IDLE);
                }
                break;

            case NPC_STATE.GATHERING:
                if (this.stateTimer > 80) {
                    this.game.simulation.resources.wood += 0.5;
                    this.game.simulation.foodSupply += 1;
                    this.hunger += 5;
                    this.energy -= 3;
                    this.setState(NPC_STATE.IDLE);
                }
                break;

            case NPC_STATE.FLEEING:
                if (this.stateTimer > 60) {
                    this.setState(NPC_STATE.IDLE);
                }
                break;

            case NPC_STATE.COWERING:
                if (this.stateTimer > 120) {
                    this.setState(NPC_STATE.IDLE);
                }
                break;

            case NPC_STATE.FIGHTING:
                if (this.stateTimer > 80) {
                    this.setState(NPC_STATE.IDLE);
                }
                break;
        }

        if (this.socialCooldown > 0) this.socialCooldown--;
    }

    move() {
        if (this.state === NPC_STATE.SLEEPING || this.state === NPC_STATE.EATING ||
            this.state === NPC_STATE.COWERING) return;

        if (this.path && this.pathIndex < this.path.length) {
            const target = this.path[this.pathIndex];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.3) {
                this.pathIndex++;
            } else {
                this.prevX = this.x;
                this.prevY = this.y;
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
        } else if (this.state === NPC_STATE.WALKING || this.state === NPC_STATE.FLEEING) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.5) {
                this.prevX = this.x;
                this.prevY = this.y;
                const spd = this.state === NPC_STATE.FLEEING ? this.speed * 2 : this.speed;
                this.x += (dx / dist) * spd;
                this.y += (dy / dist) * spd;
            }
        }

        // Keep in bounds
        this.x = Math.max(1, Math.min(this.game.world.width - 2, this.x));
        this.y = Math.max(1, Math.min(this.game.world.height - 2, this.y));

        // Avoid water
        if (this.game.world.isWater(Math.floor(this.x), Math.floor(this.y))) {
            this.x = this.prevX;
            this.y = this.prevY;
            this.setRandomTarget();
        }
    }

    setState(state) {
        this.state = state;
        this.stateTimer = 0;
    }

    setRandomTarget() {
        const range = 10 + Math.random() * 15;
        this.targetX = this.x + (Math.random() - 0.5) * range;
        this.targetY = this.y + (Math.random() - 0.5) * range;
        this.targetX = Math.max(1, Math.min(this.game.world.width - 2, this.targetX));
        this.targetY = Math.max(1, Math.min(this.game.world.height - 2, this.targetY));
        this.path = null;
    }

    flee(fromX, fromY) {
        const dx = this.x - fromX;
        const dy = this.y - fromY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.targetX = this.x + (dx / dist) * 15;
        this.targetY = this.y + (dy / dist) * 15;
        this.setState(NPC_STATE.FLEEING);
    }

    die(cause) {
        this.alive = false;
        if (this.spouse) {
            this.spouse.spouse = null;
            this.spouse.happiness -= 20;
        }
        this.game.notify(`${this.name}(${Math.floor(this.age)}세)이(가) ${cause}(으)로 사망했습니다.`);
    }

    getInfo() {
        const stateNames = {
            [NPC_STATE.IDLE]: '쉬는 중',
            [NPC_STATE.WALKING]: '이동 중',
            [NPC_STATE.WORKING]: '일하는 중',
            [NPC_STATE.EATING]: '식사 중',
            [NPC_STATE.SLEEPING]: '잠자는 중',
            [NPC_STATE.SOCIALIZING]: '대화 중',
            [NPC_STATE.BUILDING]: '건설 중',
            [NPC_STATE.GATHERING]: '채집 중',
            [NPC_STATE.FLEEING]: '도망 중',
            [NPC_STATE.COWERING]: '겁먹은 상태',
            [NPC_STATE.FIGHTING]: '싸우는 중',
        };
        const pConfig = PERSONALITY[this.personality];
        return {
            name: this.name,
            gender: this.gender === 'male' ? '남성' : '여성',
            age: Math.floor(this.age),
            state: stateNames[this.state] || '알 수 없음',
            health: Math.floor(this.health),
            hunger: Math.floor(this.hunger),
            energy: Math.floor(this.energy),
            happiness: Math.floor(this.happiness),
            intelligence: Math.floor(this.intelligence),
            strength: Math.floor(this.strength),
            spouse: this.spouse ? this.spouse.name : '없음',
            personality: pConfig ? pConfig.name : '평범',
            personalityIcon: pConfig ? pConfig.icon : '👤',
        };
    }
}
