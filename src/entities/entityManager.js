import { Person } from './person.js';
import { Animal } from './animal.js';
import { Building } from './building.js';
import { TERRAIN, ANIMAL_TYPE, BUILDING_TYPE } from '../core/constants.js';

export class EntityManager {
    constructor(game) {
        this.game = game;
        this.people = [];
        this.animals = [];
        this.buildings = [];
        this.trees = []; // Decorative trees
    }

    spawnInitialEntities() {
        const sp = this.game.world.spawnPoint;

        // Spawn initial people (a small tribe)
        for (let i = 0; i < 12; i++) {
            const ox = (Math.random() - 0.5) * 10;
            const oy = (Math.random() - 0.5) * 10;
            const px = sp.x + ox;
            const py = sp.y + oy;
            if (this.game.world.isWalkable(Math.floor(px), Math.floor(py))) {
                const age = 15 + Math.random() * 25;
                this.people.push(new Person(this.game, px, py, { age }));
            }
        }

        // A couple of children
        for (let i = 0; i < 3; i++) {
            const ox = (Math.random() - 0.5) * 8;
            const oy = (Math.random() - 0.5) * 8;
            this.people.push(new Person(this.game, sp.x + ox, sp.y + oy, { age: 3 + Math.random() * 8 }));
        }

        // Initial huts
        for (let i = 0; i < 3; i++) {
            this.tryBuildNear(sp, 'HUT');
        }

        // Animals scattered across the map
        this.spawnAnimals();

        // Decorative trees in forests
        this.spawnTrees();
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
        // Update people
        for (let i = this.people.length - 1; i >= 0; i--) {
            this.people[i].update();
            if (!this.people[i].alive) {
                this.people.splice(i, 1);
            }
        }

        // Update animals
        for (let i = this.animals.length - 1; i >= 0; i--) {
            this.animals[i].update();
            if (!this.animals[i].alive) {
                this.animals.splice(i, 1);
            }
        }

        // Update buildings
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            this.buildings[i].update();
            if (this.buildings[i].health <= 0) {
                this.buildings.splice(i, 1);
            }
        }

        // Periodically replenish animals
        if (this.game.tick % 3000 === 0) {
            if (this.animals.length < 50) {
                this.spawnRandomAnimal();
            }
        }
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

                    // Mark terrain as road nearby
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
                        // Mark surrounding as farmland
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
                    t === TERRAIN.MOUNTAIN || t === TERRAIN.SNOW_PEAK) {
                    return false;
                }
            }
        }
        // Check no overlapping buildings
        for (const b of this.buildings) {
            if (Math.abs(b.x - x) < Math.max(size, b.size) + 1 &&
                Math.abs(b.y - y) < Math.max(size, b.size) + 1) {
                return false;
            }
        }
        return true;
    }

    getSettlementCenter() {
        if (this.buildings.length === 0) return this.game.world.spawnPoint;
        let cx = 0, cy = 0;
        for (const b of this.buildings) {
            cx += b.x;
            cy += b.y;
        }
        return { x: cx / this.buildings.length, y: cy / this.buildings.length };
    }

    tryPopulationGrowth() {
        const couples = this.people.filter(p =>
            p.alive && p.spouse && p.age >= 18 && p.age <= 45 && p.gender === 'female'
        );

        for (const mother of couples) {
            if (Math.random() < 0.3 && this.game.simulation.foodSupply > this.people.length) {
                const child = new Person(this.game, mother.x, mother.y, {
                    age: 0,
                    lastName: mother.lastName,
                });
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
        // Check people
        for (const p of this.people) {
            if (!p.alive) continue;
            const dx = p.x - worldX;
            const dy = p.y - worldY;
            if (dx * dx + dy * dy < radius * radius) return { type: 'person', entity: p };
        }
        // Check buildings
        for (const b of this.buildings) {
            if (worldX >= b.x && worldX < b.x + b.size &&
                worldY >= b.y && worldY < b.y + b.size) {
                return { type: 'building', entity: b };
            }
        }
        // Check animals
        for (const a of this.animals) {
            if (!a.alive) continue;
            const dx = a.x - worldX;
            const dy = a.y - worldY;
            if (dx * dx + dy * dy < radius * radius) return { type: 'animal', entity: a };
        }
        return null;
    }
}
