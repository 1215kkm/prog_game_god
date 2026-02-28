// Simplex-like noise for terrain generation
// Adapted permutation table approach

const PERM = new Uint8Array(512);
const GRAD3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];

export function seedNoise(seed) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates shuffle with seed
    let s = seed;
    for (let i = 255; i > 0; i--) {
        s = (s * 16807 + 0) % 2147483647;
        const j = s % (i + 1);
        [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

function dot3(g, x, y) {
    return g[0] * x + g[1] * y;
}

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
    return a + t * (b - a);
}

export function noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const aa = PERM[PERM[X] + Y] % 12;
    const ab = PERM[PERM[X] + Y + 1] % 12;
    const ba = PERM[PERM[X + 1] + Y] % 12;
    const bb = PERM[PERM[X + 1] + Y + 1] % 12;

    const x1 = lerp(dot3(GRAD3[aa], xf, yf), dot3(GRAD3[ba], xf - 1, yf), u);
    const x2 = lerp(dot3(GRAD3[ab], xf, yf - 1), dot3(GRAD3[bb], xf - 1, yf - 1), u);

    return lerp(x1, x2, v);
}

// Fractal Brownian Motion for more natural terrain
export function fbm(x, y, octaves = 6, lacunarity = 2, gain = 0.5) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxVal = 0;

    for (let i = 0; i < octaves; i++) {
        total += noise2D(x * frequency, y * frequency) * amplitude;
        maxVal += amplitude;
        frequency *= lacunarity;
        amplitude *= gain;
    }

    return total / maxVal; // Normalize to roughly -1..1
}

// Random utility with seed
export class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 16807 + 0) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    pick(arr) {
        return arr[Math.floor(this.next() * arr.length)];
    }
}
