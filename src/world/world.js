import { WORLD_WIDTH, WORLD_HEIGHT, TERRAIN, TILE_SIZE } from '../core/constants.js';
import { seedNoise, fbm, SeededRandom } from '../utils/noise.js';

export class World {
    constructor() {
        this.width = WORLD_WIDTH;
        this.height = WORLD_HEIGHT;
        this.tiles = null;
        this.fertility = null; // How good for farming
        this.moisture = null;
        this.temperature = null;
        this.spawnPoint = { x: 0, y: 0 };
        this.seed = Date.now() % 100000;
    }

    generate() {
        seedNoise(this.seed);
        const rng = new SeededRandom(this.seed);

        this.tiles = new Uint8Array(this.width * this.height);
        this.fertility = new Float32Array(this.width * this.height);
        this.moisture = new Float32Array(this.width * this.height);
        this.temperature = new Float32Array(this.width * this.height);

        // Generate heightmap using fractal noise
        const heightmap = new Float32Array(this.width * this.height);
        const moistureMap = new Float32Array(this.width * this.height);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = y * this.width + x;

                // Height with island bias (lower at edges)
                const nx = x / this.width - 0.5;
                const ny = y / this.height - 0.5;
                const distFromCenter = 1 - Math.sqrt(nx * nx + ny * ny) * 1.8;
                const islandBias = Math.max(0, distFromCenter);

                const h = fbm(x * 0.008, y * 0.008, 6) * 0.6
                    + fbm(x * 0.02, y * 0.02, 4) * 0.3
                    + fbm(x * 0.05, y * 0.05, 2) * 0.1;

                heightmap[idx] = (h + 1) * 0.5 * islandBias;

                // Moisture
                const m = fbm(x * 0.01 + 100, y * 0.01 + 100, 4);
                moistureMap[idx] = (m + 1) * 0.5;
                this.moisture[idx] = moistureMap[idx];

                // Temperature (warmer at equator-ish, cooler at poles)
                const latFactor = 1 - Math.abs(y / this.height - 0.5) * 1.5;
                this.temperature[idx] = latFactor * 0.7 + fbm(x * 0.005 + 200, y * 0.005 + 200, 3) * 0.3;
            }
        }

        // Assign terrain based on height + moisture
        let bestSpawn = null;
        let bestSpawnScore = -Infinity;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = y * this.width + x;
                const h = heightmap[idx];
                const m = moistureMap[idx];

                let terrain;
                if (h < 0.12) terrain = TERRAIN.DEEP_WATER;
                else if (h < 0.18) terrain = TERRAIN.SHALLOW_WATER;
                else if (h < 0.22) terrain = TERRAIN.SAND;
                else if (h < 0.38) {
                    if (m > 0.6) terrain = TERRAIN.FOREST;
                    else terrain = TERRAIN.GRASS;
                }
                else if (h < 0.46) terrain = TERRAIN.HILL;
                else if (h < 0.55) terrain = TERRAIN.MOUNTAIN;
                else terrain = TERRAIN.SNOW_PEAK;

                this.tiles[idx] = terrain;
                this.fertility[idx] = (terrain === TERRAIN.GRASS || terrain === TERRAIN.FOREST)
                    ? m * (1 - Math.abs(h - 0.4) * 2) : 0;

                // Find good spawn point (grassland, somewhat central)
                if (terrain === TERRAIN.GRASS) {
                    const cx = Math.abs(x / this.width - 0.5);
                    const cy = Math.abs(y / this.height - 0.5);
                    const centralScore = 1 - (cx + cy);
                    const score = centralScore + this.fertility[idx] * 0.5;
                    if (score > bestSpawnScore) {
                        bestSpawnScore = score;
                        bestSpawn = { x, y };
                    }
                }
            }
        }

        this.spawnPoint = bestSpawn || { x: Math.floor(this.width / 2), y: Math.floor(this.height / 2) };

        // Place rivers
        this.generateRivers(rng, heightmap);
    }

    generateRivers(rng, heightmap) {
        const riverCount = 3 + rng.nextInt(0, 3);
        for (let r = 0; r < riverCount; r++) {
            // Start from mountain/hill
            let sx, sy;
            let attempts = 0;
            do {
                sx = rng.nextInt(20, this.width - 20);
                sy = rng.nextInt(20, this.height - 20);
                attempts++;
            } while (attempts < 100 && heightmap[sy * this.width + sx] < 0.6);

            // Flow downhill to water
            let cx = sx, cy = sy;
            for (let step = 0; step < 300; step++) {
                const idx = cy * this.width + cx;
                if (this.tiles[idx] === TERRAIN.DEEP_WATER) break;

                this.tiles[idx] = TERRAIN.SHALLOW_WATER;

                // Find lowest neighbor
                let lowestH = heightmap[idx];
                let nextX = cx, nextY = cy;
                for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    const nx = cx + dx, ny = cy + dy;
                    if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
                    const nh = heightmap[ny * this.width + nx];
                    if (nh < lowestH) {
                        lowestH = nh;
                        nextX = nx;
                        nextY = ny;
                    }
                }

                if (nextX === cx && nextY === cy) {
                    // Random walk if stuck
                    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
                    const d = dirs[rng.nextInt(0, 3)];
                    nextX = cx + d[0];
                    nextY = cy + d[1];
                }

                cx = Math.max(0, Math.min(this.width - 1, nextX));
                cy = Math.max(0, Math.min(this.height - 1, nextY));
            }
        }
    }

    getTerrain(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TERRAIN.DEEP_WATER;
        return this.tiles[y * this.width + x];
    }

    setTerrain(x, y, terrain) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        this.tiles[y * this.width + x] = terrain;
    }

    isWalkable(x, y) {
        const t = this.getTerrain(x, y);
        return t !== TERRAIN.DEEP_WATER && t !== TERRAIN.SHALLOW_WATER && t !== TERRAIN.SNOW_PEAK;
    }

    isWater(x, y) {
        const t = this.getTerrain(x, y);
        return t === TERRAIN.DEEP_WATER || t === TERRAIN.SHALLOW_WATER;
    }

    getFertility(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        return this.fertility[y * this.width + x];
    }

    getPixelWidth() { return this.width * TILE_SIZE; }
    getPixelHeight() { return this.height * TILE_SIZE; }
}
