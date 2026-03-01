// Quick smoke test: verify all modules parse and core logic works
// Run with: node --experimental-vm-modules test_game.mjs

// We can't test DOM-dependent code here, but we can verify:
// 1. All modules parse without syntax errors
// 2. Core game logic (noise, pathfinding, constants) works
// 3. World generation works

import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, TERRAIN, TERRAIN_COLORS, ERAS, BUILDING_TYPE, ANIMAL_TYPE, NPC_STATE, TICKS_PER_DAY } from './src/core/constants.js';
import { seedNoise, fbm, noise2D, SeededRandom } from './src/utils/noise.js';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
    if (condition) {
        passed++;
        console.log(`  ✓ ${msg}`);
    } else {
        failed++;
        console.error(`  ✗ FAIL: ${msg}`);
    }
}

console.log('\n=== 신의 손길 - Smoke Test ===\n');

// Test 1: Constants
console.log('1. Constants');
assert(TILE_SIZE === 24, 'TILE_SIZE is 24');
assert(WORLD_WIDTH === 200, 'WORLD_WIDTH is 200');
assert(WORLD_HEIGHT === 200, 'WORLD_HEIGHT is 200');
assert(Object.keys(TERRAIN).length === 10, '10 terrain types');
assert(Object.keys(TERRAIN_COLORS).length === 10, '10 terrain colors');
assert(ERAS.length === 9, '9 eras defined');
assert(Object.keys(BUILDING_TYPE).length === 13, '13 building types');
assert(Object.keys(ANIMAL_TYPE).length === 6, '6 animal types');
assert(Object.keys(NPC_STATE).length === 9, '9 NPC states');
assert(TICKS_PER_DAY === 120, 'TICKS_PER_DAY is 120');

// Test 2: Noise
console.log('\n2. Noise Generation');
seedNoise(42);
const n1 = noise2D(0.5, 0.5);
assert(typeof n1 === 'number' && !isNaN(n1), `noise2D returns a number: ${n1.toFixed(4)}`);
assert(n1 >= -1 && n1 <= 1, `noise2D in range [-1,1]: ${n1.toFixed(4)}`);

const f1 = fbm(0.5, 0.5, 6);
assert(typeof f1 === 'number' && !isNaN(f1), `fbm returns a number: ${f1.toFixed(4)}`);
assert(f1 >= -1 && f1 <= 1, `fbm in range [-1,1]: ${f1.toFixed(4)}`);

// Test 3: SeededRandom
console.log('\n3. SeededRandom');
const rng = new SeededRandom(12345);
const r1 = rng.next();
assert(r1 >= 0 && r1 <= 1, `Random value in [0,1]: ${r1.toFixed(4)}`);
const ri = rng.nextInt(1, 10);
assert(ri >= 1 && ri <= 10, `Random int in [1,10]: ${ri}`);
const pick = rng.pick(['a', 'b', 'c']);
assert(['a', 'b', 'c'].includes(pick), `Random pick from array: ${pick}`);

// Test 4: World generation (imported without DOM)
console.log('\n4. World Generation');
// We can test the World class directly since it doesn't need DOM
const { World } = await import('./src/world/world.js');
const world = new World();
world.generate();

assert(world.tiles !== null, 'Tiles array created');
assert(world.tiles.length === WORLD_WIDTH * WORLD_HEIGHT, `Tiles array correct size: ${world.tiles.length}`);
assert(world.spawnPoint.x > 0 && world.spawnPoint.y > 0, `Spawn point found: (${world.spawnPoint.x}, ${world.spawnPoint.y})`);

// Check terrain distribution
const terrainCounts = {};
for (let i = 0; i < world.tiles.length; i++) {
    const t = world.tiles[i];
    terrainCounts[t] = (terrainCounts[t] || 0) + 1;
}
assert(terrainCounts[TERRAIN.DEEP_WATER] > 0, `Has deep water: ${terrainCounts[TERRAIN.DEEP_WATER]}`);
assert(terrainCounts[TERRAIN.GRASS] > 0, `Has grass: ${terrainCounts[TERRAIN.GRASS]}`);
assert(terrainCounts[TERRAIN.MOUNTAIN] > 0, `Has mountains: ${terrainCounts[TERRAIN.MOUNTAIN]}`);
assert(terrainCounts[TERRAIN.SHALLOW_WATER] > 0, `Has shallow water (rivers): ${terrainCounts[TERRAIN.SHALLOW_WATER]}`);

const walkable = world.isWalkable(world.spawnPoint.x, world.spawnPoint.y);
assert(walkable === true, 'Spawn point is walkable');
assert(world.isWater(world.spawnPoint.x, world.spawnPoint.y) === false, 'Spawn point is not water');
assert(world.getPixelWidth() === WORLD_WIDTH * TILE_SIZE, `Pixel width correct: ${world.getPixelWidth()}`);

// Test 5: Pathfinding
console.log('\n5. Pathfinding');
const { Pathfinder } = await import('./src/utils/pathfinding.js');
const pf = new Pathfinder(world);
const sp = world.spawnPoint;
const path = pf.findPath(sp.x, sp.y, sp.x + 5, sp.y + 5);
assert(path !== null, `Path found from spawn: ${path ? path.length + ' steps' : 'null'}`);
if (path) {
    assert(path.length > 0, `Path has steps: ${path.length}`);
}

// Test 6: Era progression logic
console.log('\n6. Era Progression');
assert(ERAS[0].name === '원시 시대', `First era: ${ERAS[0].name}`);
assert(ERAS[8].name === '미래', `Last era: ${ERAS[8].name}`);

// Summary
console.log('\n' + '='.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(40));

if (failed > 0) {
    process.exit(1);
} else {
    console.log('\n✅ All tests passed! Game core logic is working.\n');
}
