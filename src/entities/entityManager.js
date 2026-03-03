import { Person } from './person.js';
import { Animal } from './animal.js';
import { Building } from './building.js';
import { Giant } from './giant.js';
import { Dinosaur } from './dinosaur.js';
import { Vehicle } from './vehicle.js';
import { TERRAIN, ANIMAL_TYPE, BUILDING_TYPE, DINOSAUR_TYPE, VEHICLE_TYPE, ERAS } from '../core/constants.js';

export class EntityManager {
    constructor(game) {
        this.game = game;
        this.people = [];
        this.animals = [];
        this.buildings = [];
        this.trees = [];
        this.customEntities = [];
        this.giants = [];
        this.dinosaurs = [];
        this.vehicles = [];

        this.dinosaurEra = true;
        this.dinosaurExtinctionTriggered = false;
    }

    spawnInitialEntities() {
        const sp = this.game.world.spawnPoint;

        if (this.dinosaurEra) {
            this.spawnInitialDinosaurs();
        }

        for (let i = 0; i < 12; i++) {
            const ox = (Math.random() - 0.5) * 10;
            const oy = (Math.random() - 0.5) * 10;
            const px = sp.x + ox;
            const py = sp.y + oy;
            if (this.game.world.isWalkable(Math.floor(px), Math.floor(py))) {
                this.people.push(new Person(this.game, px, py, { age: 15 + Math.random() * 25 }));
            }
        }

        for (let i = 0; i < 3; i++) {
            const ox = (Math.random() - 0.5) * 8;
            const oy = (Math.random() - 0.5) * 8;
            this.people.push(new Person(this.game, sp.x + ox, sp.y + oy, { age: 3 + Math.random() * 8 }));
        }

        for (let i = 0; i < 3; i++) {
            this.tryBuildNear(sp, 'HUT');
        }

        this.spawnAnimals();
        this.spawnTrees();
    }

    spawnInitialDinosaurs() {
        const world = this.game.world;
        const dinoConfigs = [
            { type: 'TREX', count: 5 },
            { type: 'TRICERATOPS', count: 8 },
            { type: 'RAPTOR', count: 10 },
            { type: 'BRONTO', count: 4 },
            { type: 'PTERANODON', count: 6 },
            { type: 'STEGO', count: 6 },
        ];

        for (const dc of dinoConfigs) {
            let spawned = 0;
            let attempts = 0;
            while (spawned < dc.count && attempts < dc.count * 20) {
                attempts++;
                const x = Math.random() * world.width;
                const y = Math.random() * world.height;
                const terrain = world.getTerrain(Math.floor(x), Math.floor(y));
                if (terrain !== TERRAIN.DEEP_WATER && terrain !== TERRAIN.SHALLOW_WATER &&
                    terrain !== TERRAIN.SNOW_PEAK) {
                    this.dinosaurs.push(new Dinosaur(this.game, x, y, dc.type));
                    spawned++;
                }
            }
        }
    }

    spawnAnimals() {
        const world = this.game.world;
        const animalConfigs = [
            { type: 'RABBIT', count: 30, terrain: [TERRAIN.GRASS, TERRAIN.FOREST] },
            { type: 'DEER', count: 20, terrain: [TERRAIN.GRASS, TERRAIN.FOREST, TERRAIN.HILL] },
            { type: 'WOLF', count: 8, terrain: [TERRAIN.FOREST, TERRAIN.HILL] },
            { type: 'BEAR', count: 5, terrain: [TERRAIN.FOREST, TERRAIN.MOUNTAIN] },
            { type: 'BIRD', count: 25, terrain: [TERRAIN.GRASS, TERRAIN.FOREST, TERRAIN.HILL] },
            { type: 'FISH', count: 20, terrain: [TERRAIN.SHALLOW_WATER, TERRAIN.DEEP_WATER] },
        ];

        for (const ac of animalConfigs) {
            let spawned = 0;
            let attempts = 0;
            while (spawned < ac.count && attempts < ac.count * 10) {
                attempts++;
                const x = Math.random() * world.width;
                const y = Math.random() * world.height;
                const terrain = world.getTerrain(Math.floor(x), Math.floor(y));
                if (ac.terrain.includes(terrain)) {
                    this.animals.push(new Animal(this.game, x, y, ac.type));
                    spawned++;
                }
            }
        }
    }

    spawnTrees() {
        const world = this.game.world;
        for (let y = 0; y < world.height; y += 3) {
            for (let x = 0; x < world.width; x += 3) {
                const terrain = world.getTerrain(x, y);
                if (terrain === TERRAIN.FOREST && Math.random() < 0.4) {
                    this.trees.push({
                        x: x + Math.random() * 2,
                        y: y + Math.random() * 2,
                        size: 3 + Math.random() * 3,
                        color: `hsl(${120 + Math.random() * 30}, ${40 + Math.random() * 20}%, ${20 + Math.random() * 15}%)`,
                    });
                }
            }
        }
    }

    update() {
        const events = this.game.events;

        for (let i = this.people.length - 1; i >= 0; i--) {
            this.people[i].update();
            if (!this.people[i].alive) {
                events.emit('entity:died', this.people[i], 'person');
                this.people.splice(i, 1);
            }
        }

        for (let i = this.animals.length - 1; i >= 0; i--) {
            this.animals[i].update();
            if (!this.animals[i].alive) {
                events.emit('entity:died', this.animals[i], 'animal');
                this.animals.splice(i, 1);
            }
        }

        for (let i = this.buildings.length - 1; i >= 0; i--) {
            this.buildings[i].update();
            if (this.buildings[i].health <= 0) {
                events.emit('building:destroyed', this.buildings[i]);
                this.buildings.splice(i, 1);
            }
        }

        for (let i = this.giants.length - 1; i >= 0; i--) {
            this.giants[i].update();
            if (!this.giants[i].alive) {
                events.emit('entity:died', this.giants[i], 'giant');
                this.giants.splice(i, 1);
            }
        }

        for (let i = this.dinosaurs.length - 1; i >= 0; i--) {
            this.dinosaurs[i].update();
            if (!this.dinosaurs[i].alive) {
                events.emit('entity:died', this.dinosaurs[i], 'dinosaur');
                this.dinosaurs.splice(i, 1);
            }
        }

        for (let i = this.vehicles.length - 1; i >= 0; i--) {
            this.vehicles[i].update();
            if (!this.vehicles[i].alive) {
                this.vehicles.splice(i, 1);
            }
        }

        for (let i = this.customEntities.length - 1; i >= 0; i--) {
            const ce = this.customEntities[i];
            if (ce.def.behavior) ce.def.behavior(ce, this.game, 1);
            if (!ce.alive) {
                if (ce.def.onDeath) ce.def.onDeath(ce, this.game);
                events.emit('entity:died', ce, ce.def.type);
                this.customEntities.splice(i, 1);
            }
        }

        // Dinosaur extinction
        if (this.dinosaurEra && !this.dinosaurExtinctionTriggered && this.game.year >= 3) {
            this.triggerDinosaurExtinction();
        }

        if (this.game.tick % 3000 === 0 && this.animals.length < 50) {
            this.spawnRandomAnimal();
        }

        if (this.game.tick % 2000 === 0) {
            this.manageVehicles();
        }
    }

    triggerDinosaurExtinction() {
        this.dinosaurExtinctionTriggered = true;
        this.game.notify('🌠 하늘에서 거대한 운석이 떨어집니다!');

        const center = this.game.world.spawnPoint;
        if (this.game.renderer?.addShockwave) {
            this.game.renderer.addShockwave(center.x, center.y, 50, '#ff4400');
            this.game.renderer.addParticleEffect(center.x, center.y, 'large', '#ff6600');
        }
        if (this.game.camera3d) this.game.camera3d.shake(5, 60);
        else if (this.game.camera?.shake) this.game.camera.shake(15, 60);

        for (const dino of this.dinosaurs) {
            dino.health -= 80;
        }

        this.game.notify('💥 대멸종! 공룡들이 사라지고 있습니다...');
        this.dinosaurEra = false;
    }

    manageVehicles() {
        const techLevel = this.game.simulation.techLevel;
        const maxVehicles = Math.min(20, Math.floor(techLevel / 100));
        if (this.vehicles.length >= maxVehicles) return;

        const availableTypes = [];
        for (const [type, config] of Object.entries(VEHICLE_TYPE)) {
            const era = ERAS.find(e => e.id === config.eraId);
            if (era && techLevel >= era.techRequired) {
                availableTypes.push(type);
            }
        }
        if (availableTypes.length === 0) return;

        const world = this.game.world;
        for (let attempt = 0; attempt < 30; attempt++) {
            const x = Math.random() * world.width;
            const y = Math.random() * world.height;
            if (world.getTerrain(Math.floor(x), Math.floor(y)) === TERRAIN.ROAD) {
                const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
                this.vehicles.push(new Vehicle(this.game, x, y, type));
                return;
            }
        }
    }

    spawnPersonAt(x, y, options = {}) {
        if (!this.game.world.isWalkable(Math.floor(x), Math.floor(y))) return null;
        const person = new Person(this.game, x, y, options);
        this.people.push(person);
        this.game.events.emit('entity:spawned', person, 'person');
        return person;
    }

    spawnGiant(x, y, size) {
        if (!this.game.world.isWalkable(Math.floor(x), Math.floor(y))) return null;
        const giant = new Giant(this.game, x, y, { size });
        this.giants.push(giant);
        this.game.events.emit('entity:spawned', giant, 'giant');
        return giant;
    }

    spawnAnimalAt(x, y, type) {
        const animal = new Animal(this.game, x, y, type);
        this.animals.push(animal);
        this.game.events.emit('entity:spawned', animal, 'animal');
        return animal;
    }

    spawnDinosaur(x, y, type) {
        if (!DINOSAUR_TYPE[type]) return null;
        const dino = new Dinosaur(this.game, x, y, type);
        this.dinosaurs.push(dino);
        this.game.events.emit('entity:spawned', dino, 'dinosaur');
        return dino;
    }

    tryBuildAt(x, y, buildingType) {
        const size = BUILDING_TYPE[buildingType]?.size || 1;
        if (!this.canPlaceBuilding(x, y, size)) return null;
        const building = new Building(this.game, x, y, buildingType);
        this.buildings.push(building);
        const world = this.game.world;
        for (let dy = -1; dy <= size; dy++) {
            for (let dx = -1; dx <= size; dx++) {
                if (dx === -1 || dy === -1 || dx === size || dy === size) {
                    const rx = x + dx, ry = y + dy;
                    if (world.getTerrain(rx, ry) === TERRAIN.GRASS) {
                        world.setTerrain(rx, ry, TERRAIN.ROAD);
                    }
                }
            }
        }
        if (buildingType === 'FARM') {
            for (let dy = -1; dy <= size; dy++) {
                for (let dx = -1; dx <= size; dx++) {
                    const fx = x + dx, fy = y + dy;
                    const t = world.getTerrain(fx, fy);
                    if (t === TERRAIN.GRASS || t === TERRAIN.FOREST) {
                        world.setTerrain(fx, fy, TERRAIN.FARMLAND);
                    }
                }
            }
        }
        this.game.events.emit('building:built', building);
        return building;
    }

    spawnRandomAnimal() {
        const types = Object.keys(ANIMAL_TYPE);
        const type = types[Math.floor(Math.random() * types.length)];
        const world = this.game.world;
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * world.width;
            const y = Math.random() * world.height;
            const terrain = world.getTerrain(Math.floor(x), Math.floor(y));
            const isWater = terrain === TERRAIN.DEEP_WATER || terrain === TERRAIN.SHALLOW_WATER;
            if (type === 'FISH' ? isWater : !isWater && terrain !== TERRAIN.SNOW_PEAK) {
                this.animals.push(new Animal(this.game, x, y, type));
                return;
            }
        }
    }

    tryBuildNear(center, buildingType) {
        const world = this.game.world;
        const size = BUILDING_TYPE[buildingType]?.size || 1;
        for (let r = 1; r < 20; r++) {
            for (let attempts = 0; attempts < r * 4; attempts++) {
                const angle = Math.random() * Math.PI * 2;
                const x = Math.floor(center.x + Math.cos(angle) * r);
                const y = Math.floor(center.y + Math.sin(angle) * r);
                if (this.canPlaceBuilding(x, y, size)) {
                    const building = new Building(this.game, x, y, buildingType);
                    this.buildings.push(building);
                    for (let dy = -1; dy <= size; dy++) {
                        for (let dx = -1; dx <= size; dx++) {
                            if (dx === -1 || dy === -1 || dx === size || dy === size) {
                                const rx = x + dx, ry = y + dy;
                                if (world.getTerrain(rx, ry) === TERRAIN.GRASS) {
                                    world.setTerrain(rx, ry, TERRAIN.ROAD);
                                }
                            }
                        }
                    }
                    if (buildingType === 'FARM') {
                        for (let dy = -1; dy <= size; dy++) {
                            for (let dx = -1; dx <= size; dx++) {
                                const fx = x + dx, fy = y + dy;
                                const t = world.getTerrain(fx, fy);
                                if (t === TERRAIN.GRASS || t === TERRAIN.FOREST) {
                                    world.setTerrain(fx, fy, TERRAIN.FARMLAND);
                                }
                            }
                        }
                    }
                    return building;
                }
            }
        }
        return null;
    }

    canPlaceBuilding(x, y, size) {
        const world = this.game.world;
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const t = world.getTerrain(x + dx, y + dy);
                if (t === TERRAIN.DEEP_WATER || t === TERRAIN.SHALLOW_WATER ||
                    t === TERRAIN.MOUNTAIN || t === TERRAIN.SNOW_PEAK) return false;
            }
        }
        for (const b of this.buildings) {
            if (Math.abs(b.x - x) < Math.max(size, b.size) + 1 &&
                Math.abs(b.y - y) < Math.max(size, b.size) + 1) return false;
        }
        return true;
    }

    getSettlementCenter() {
        if (this.buildings.length === 0) return this.game.world.spawnPoint;
        let cx = 0, cy = 0;
        for (const b of this.buildings) { cx += b.x; cy += b.y; }
        return { x: cx / this.buildings.length, y: cy / this.buildings.length };
    }

    tryPopulationGrowth() {
        const couples = this.people.filter(p =>
            p.alive && p.spouse && p.age >= 18 && p.age <= 45 && p.gender === 'female');
        for (const mother of couples) {
            if (Math.random() < 0.3 && this.game.simulation.foodSupply > this.people.length) {
                const child = new Person(this.game, mother.x, mother.y, { age: 0, lastName: mother.lastName });
                mother.children.push(child);
                if (mother.spouse) mother.spouse.children.push(child);
                this.people.push(child);
                this.game.notify(`${mother.name}에게 아이가 태어났습니다!`);
            }
        }
    }

    findNearbyPerson(person, radius) {
        for (const p of this.people) {
            if (p === person || !p.alive) continue;
            const dx = p.x - person.x;
            const dy = p.y - person.y;
            if (dx * dx + dy * dy < radius * radius) return p;
        }
        return null;
    }

    getEntityAt(worldX, worldY, radius = 1) {
        const r2 = radius * radius;
        for (const g of this.giants) {
            if (!g.alive) continue;
            const dx = g.x - worldX, dy = g.y - worldY;
            if (dx * dx + dy * dy < r2 * 4) return { type: 'giant', entity: g };
        }
        for (const d of this.dinosaurs) {
            if (!d.alive) continue;
            const dx = d.x - worldX, dy = d.y - worldY;
            if (dx * dx + dy * dy < r2 * 4) return { type: 'dinosaur', entity: d };
        }
        for (const ce of this.customEntities) {
            if (!ce.alive) continue;
            const dx = ce.x - worldX, dy = ce.y - worldY;
            if (dx * dx + dy * dy < r2) return { type: ce.def.type, entity: ce };
        }
        for (const p of this.people) {
            if (!p.alive) continue;
            const dx = p.x - worldX, dy = p.y - worldY;
            if (dx * dx + dy * dy < r2) return { type: 'person', entity: p };
        }
        for (const b of this.buildings) {
            if (worldX >= b.x && worldX < b.x + b.size && worldY >= b.y && worldY < b.y + b.size)
                return { type: 'building', entity: b };
        }
        for (const a of this.animals) {
            if (!a.alive) continue;
            const dx = a.x - worldX, dy = a.y - worldY;
            if (dx * dx + dy * dy < r2) return { type: 'animal', entity: a };
        }
        return null;
    }

    spawnCustom(type, x, y, overrides = {}) {
        const def = this.game.registry.getEntity(type);
        if (!def) return null;
        const entity = {
            x, y, alive: true, def, target: null,
            health: def.config.health || 100, speed: def.config.speed || 1,
            size: def.config.size || 1, color: def.config.color || '#ff00ff',
            data: {}, ...overrides,
            moveTo(tx, ty) {
                const dx = tx - this.x, dy = ty - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0.1) { this.x += (dx / dist) * this.speed * 0.05; this.y += (dy / dist) * this.speed * 0.05; }
            },
            distanceTo(other) { const dx = this.x - (other.x||0), dy = this.y - (other.y||0); return Math.sqrt(dx*dx+dy*dy); },
            kill() { this.alive = false; },
        };
        this.customEntities.push(entity);
        this.game.events.emit('entity:spawned', entity, type);
        if (def.onSpawn) def.onSpawn(entity, this.game);
        if (def.reactions) {
            for (const [event, handler] of Object.entries(def.reactions)) {
                this.game.events.on(event, (...args) => { if (entity.alive) handler(entity, ...args); });
            }
        }
        return entity;
    }

    spawnTree(x, y, size = 5) {
        const tree = {
            x, y, size,
            color: `hsl(${120 + Math.random() * 30}, ${40 + Math.random() * 20}%, ${20 + Math.random() * 15}%)`,
        };
        this.trees.push(tree);
        this.game.events.emit('entity:spawned', tree, 'tree');
        return tree;
    }
}
