import { TERRAIN } from '../core/constants.js';

// A* pathfinding for NPC movement
export class Pathfinder {
    constructor(world) {
        this.world = world;
    }

    findPath(startX, startY, endX, endY, maxSteps = 200) {
        const sx = Math.floor(startX);
        const sy = Math.floor(startY);
        const ex = Math.floor(endX);
        const ey = Math.floor(endY);

        if (!this.world.isWalkable(ex, ey)) return null;
        if (sx === ex && sy === ey) return [];

        const open = new MinHeap();
        const closed = new Set();
        const gScore = new Map();
        const cameFrom = new Map();

        const startKey = `${sx},${sy}`;
        gScore.set(startKey, 0);
        open.push({ x: sx, y: sy, f: this.heuristic(sx, sy, ex, ey) });

        let steps = 0;

        while (open.size > 0 && steps < maxSteps) {
            steps++;
            const current = open.pop();
            const ck = `${current.x},${current.y}`;

            if (current.x === ex && current.y === ey) {
                return this.reconstructPath(cameFrom, current);
            }

            closed.add(ck);

            for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
                const nx = current.x + dx;
                const ny = current.y + dy;
                const nk = `${nx},${ny}`;

                if (closed.has(nk)) continue;
                if (!this.world.isWalkable(nx, ny)) continue;

                const moveCost = (dx !== 0 && dy !== 0) ? 1.414 : 1;
                const terrainCost = this.getTerrainCost(nx, ny);
                const tentG = gScore.get(ck) + moveCost * terrainCost;

                if (!gScore.has(nk) || tentG < gScore.get(nk)) {
                    gScore.set(nk, tentG);
                    cameFrom.set(nk, current);
                    const f = tentG + this.heuristic(nx, ny, ex, ey);
                    open.push({ x: nx, y: ny, f });
                }
            }
        }

        return null; // No path found
    }

    heuristic(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    getTerrainCost(x, y) {
        const terrain = this.world.getTerrain(x, y);
        switch (terrain) {
            case TERRAIN.ROAD: return 0.5;
            case TERRAIN.GRASS: return 1;
            case TERRAIN.SAND: return 1.3;
            case TERRAIN.FOREST: return 1.5;
            case TERRAIN.FARMLAND: return 0.8;
            case TERRAIN.HILL: return 2;
            case TERRAIN.MOUNTAIN: return 4;
            default: return 1;
        }
    }

    reconstructPath(cameFrom, current) {
        const path = [{ x: current.x, y: current.y }];
        let key = `${current.x},${current.y}`;
        while (cameFrom.has(key)) {
            const prev = cameFrom.get(key);
            path.unshift({ x: prev.x, y: prev.y });
            key = `${prev.x},${prev.y}`;
        }
        return path;
    }
}

class MinHeap {
    constructor() {
        this.data = [];
    }
    get size() { return this.data.length; }
    push(item) {
        this.data.push(item);
        this._bubbleUp(this.data.length - 1);
    }
    pop() {
        const top = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = last;
            this._sinkDown(0);
        }
        return top;
    }
    _bubbleUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.data[i].f < this.data[parent].f) {
                [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
                i = parent;
            } else break;
        }
    }
    _sinkDown(i) {
        const n = this.data.length;
        while (true) {
            let smallest = i;
            const l = 2 * i + 1;
            const r = 2 * i + 2;
            if (l < n && this.data[l].f < this.data[smallest].f) smallest = l;
            if (r < n && this.data[r].f < this.data[smallest].f) smallest = r;
            if (smallest !== i) {
                [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
                i = smallest;
            } else break;
        }
    }
}
