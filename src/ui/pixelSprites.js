// ===== Pixel Art Sprite Generator =====
// Generates all game sprites as small canvas pixel art
// Used as textures on billboard planes in the 3D world

import * as THREE from 'three';

// Shared nearest-filter texture settings for crisp pixel art
function canvasToTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
}

function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx };
}

// Draw a single pixel
function px(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
}

// Draw filled rectangle
function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

// Darken a hex color
function darken(hex, amount = 0.7) {
    const c = parseInt(hex.replace('#', ''), 16);
    const r = Math.floor(((c >> 16) & 255) * amount);
    const g = Math.floor(((c >> 8) & 255) * amount);
    const b = Math.floor((c & 255) * amount);
    return `rgb(${r},${g},${b})`;
}

// Lighten a hex color
function lighten(hex, amount = 1.3) {
    const c = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.floor(((c >> 16) & 255) * amount));
    const g = Math.min(255, Math.floor(((c >> 8) & 255) * amount));
    const b = Math.min(255, Math.floor((c & 255) * amount));
    return `rgb(${r},${g},${b})`;
}

// Skin tone options
const SKIN_TONES = ['#f5c8a0', '#e8b888', '#d4a574', '#c49060', '#ffdcb8'];
const HAIR_COLORS = ['#2a1a0a', '#4a2a10', '#1a0a00', '#6a4420', '#8a5530', '#1a1a2a'];

// ===== PERSON SPRITES =====
export function generatePersonSprite(person, frame = 0) {
    const { canvas, ctx } = createCanvas(16, 24);
    const personality = person.personality || 'NORMAL';
    const isFemale = person.gender === 'female';
    const isChild = person.age < 15;
    const hash = (person.name?.charCodeAt(0) || 0) + (person.name?.charCodeAt(1) || 0) * 7 + (person.age || 0);

    const skin = SKIN_TONES[hash % SKIN_TONES.length];
    const hair = HAIR_COLORS[hash % HAIR_COLORS.length];
    const shirtColor = person.color || '#4488cc';
    const pantsColor = ['#3a4a6a', '#4a3a2a', '#2a3a2a', '#5a4a3a', '#484868'][hash % 5];
    const shoeColor = '#3a2a1a';

    const offy = isChild ? 4 : 0;
    const legFrame = frame % 2;

    // Hair / Head
    if (isFemale) {
        rect(ctx, 4, 0 + offy, 8, 2, hair);
        rect(ctx, 3, 1 + offy, 10, 6, hair);
        rect(ctx, 5, 2 + offy, 6, 5, skin);
    } else {
        rect(ctx, 5, 0 + offy, 6, 2, hair);
        rect(ctx, 4, 1 + offy, 8, 2, hair);
        rect(ctx, 5, 2 + offy, 6, 5, skin);
    }

    // Eyes
    px(ctx, 6, 4 + offy, '#111');
    px(ctx, 9, 4 + offy, '#111');
    px(ctx, 6, 3 + offy, '#fff');
    px(ctx, 9, 3 + offy, '#fff');
    // Mouth
    px(ctx, 7, 6 + offy, '#a06050');
    px(ctx, 8, 6 + offy, '#a06050');

    // Body (shirt)
    rect(ctx, 5, 8 + offy, 6, 6, shirtColor);
    rect(ctx, 5, 8 + offy, 1, 6, darken(shirtColor, 0.8));
    rect(ctx, 10, 8 + offy, 1, 6, darken(shirtColor, 0.8));

    // Arms
    if (legFrame === 0) {
        rect(ctx, 3, 8 + offy, 2, 5, shirtColor);
        rect(ctx, 11, 8 + offy, 2, 5, shirtColor);
        rect(ctx, 3, 13 + offy, 2, 1, skin);
        rect(ctx, 11, 13 + offy, 2, 1, skin);
    } else {
        rect(ctx, 3, 9 + offy, 2, 5, shirtColor);
        rect(ctx, 11, 7 + offy, 2, 5, shirtColor);
        rect(ctx, 3, 14 + offy, 2, 1, skin);
        rect(ctx, 11, 12 + offy, 2, 1, skin);
    }

    // Pants
    rect(ctx, 5, 14 + offy, 6, 4, pantsColor);
    rect(ctx, 8, 15 + offy, 1, 3, darken(pantsColor, 0.7));

    // Legs (walking animation)
    if (legFrame === 0) {
        rect(ctx, 5, 18 + offy, 3, 2, pantsColor);
        rect(ctx, 8, 18 + offy, 3, 2, pantsColor);
    } else {
        rect(ctx, 4, 18 + offy, 3, 2, pantsColor);
        rect(ctx, 9, 18 + offy, 3, 2, pantsColor);
    }

    // Shoes
    if (legFrame === 0) {
        rect(ctx, 5, 20 + offy, 3, 1, shoeColor);
        rect(ctx, 8, 20 + offy, 3, 1, shoeColor);
    } else {
        rect(ctx, 4, 20 + offy, 3, 1, shoeColor);
        rect(ctx, 9, 20 + offy, 3, 1, shoeColor);
    }

    // Personality decorations
    if (personality === 'LEADER') {
        rect(ctx, 5, offy - 1, 6, 1, '#ffd700');
        px(ctx, 5, offy - 2, '#ffd700');
        px(ctx, 7, offy - 2, '#ffd700');
        px(ctx, 10, offy - 2, '#ffd700');
    } else if (personality === 'WARRIOR') {
        rect(ctx, 12, 4 + offy, 1, 10, '#aaa');
        px(ctx, 12, 3 + offy, '#ddd');
    } else if (personality === 'SCHOLAR') {
        rect(ctx, 4, offy - 1, 8, 1, '#222244');
        rect(ctx, 5, offy - 2, 6, 1, '#222244');
    } else if (personality === 'HEALER') {
        px(ctx, 4, 10 + offy, '#4f8');
        px(ctx, 11, 10 + offy, '#4f8');
        px(ctx, 7, 7 + offy, '#4f8');
    } else if (personality === 'CRIMINAL') {
        rect(ctx, 4, 21 + offy, 8, 1, 'rgba(255,0,0,0.5)');
    }

    return canvasToTexture(canvas);
}

// ===== ANIMAL SPRITES =====
export function generateAnimalSprite(type, frame = 0) {
    const sprites = {
        RABBIT: () => drawRabbit(frame),
        DEER: () => drawDeer(frame),
        WOLF: () => drawWolf(frame),
        BEAR: () => drawBear(frame),
        BIRD: () => drawBird(frame),
        FISH: () => drawFish(frame),
    };
    return canvasToTexture((sprites[type] || sprites.RABBIT)());
}

function drawRabbit(frame) {
    const { canvas, ctx } = createCanvas(12, 14);
    const body = '#d2b48c';
    const dark = darken(body);
    rect(ctx, 3, 5, 6, 5, body);
    rect(ctx, 3, 5, 1, 5, dark);
    rect(ctx, 4, 2, 5, 4, body);
    rect(ctx, 4, 0, 2, 3, body);
    rect(ctx, 7, 0, 2, 3, body);
    px(ctx, 5, 0, '#ffbbbb');
    px(ctx, 7, 0, '#ffbbbb');
    px(ctx, 5, 3, '#111');
    px(ctx, 7, 3, '#111');
    px(ctx, 5, 2, '#fff');
    px(ctx, 7, 2, '#fff');
    px(ctx, 6, 4, '#ffaaaa');
    px(ctx, 9, 6, '#fff');
    px(ctx, 9, 7, '#fff');
    const lf = frame % 2;
    if (lf === 0) {
        rect(ctx, 3, 10, 2, 3, body);
        rect(ctx, 7, 10, 2, 3, body);
    } else {
        rect(ctx, 2, 10, 2, 3, body);
        rect(ctx, 8, 10, 2, 3, body);
    }
    rect(ctx, 3, 12, 2, 1, dark);
    rect(ctx, 7, 12, 2, 1, dark);
    return canvas;
}

function drawDeer(frame) {
    const { canvas, ctx } = createCanvas(16, 18);
    const body = '#8b6914';
    const dark = darken(body);
    const belly = lighten(body, 1.3);
    rect(ctx, 3, 6, 10, 5, body);
    rect(ctx, 5, 9, 6, 2, belly);
    rect(ctx, 1, 3, 5, 4, body);
    px(ctx, 1, 0, '#8B6914'); px(ctx, 0, 1, '#8B6914');
    px(ctx, 5, 0, '#8B6914'); px(ctx, 6, 1, '#8B6914');
    rect(ctx, 2, 1, 1, 2, '#8B6914');
    rect(ctx, 4, 1, 1, 2, '#8B6914');
    px(ctx, 2, 4, '#111');
    px(ctx, 4, 4, '#111');
    px(ctx, 2, 3, '#fff');
    px(ctx, 3, 6, '#333');
    rect(ctx, 13, 6, 2, 2, '#fff');
    const lf = frame % 2;
    rect(ctx, 4, 11, 2, 5 + lf, body);
    rect(ctx, 10, 11, 2, 5 - lf + 1, body);
    rect(ctx, 7, 11, 2, 5 - lf + 1, body);
    rect(ctx, 4, 16, 2, 1, '#2a1a0a');
    rect(ctx, 10, 16, 2, 1, '#2a1a0a');
    return canvas;
}

function drawWolf(frame) {
    const { canvas, ctx } = createCanvas(16, 14);
    const body = '#696969';
    const dark = darken(body);
    rect(ctx, 3, 4, 10, 4, body);
    rect(ctx, 3, 4, 1, 4, dark);
    rect(ctx, 0, 2, 5, 4, body);
    rect(ctx, 0, 4, 2, 2, darken(body, 0.9));
    px(ctx, 0, 4, '#222');
    px(ctx, 1, 1, dark); px(ctx, 4, 1, dark);
    px(ctx, 2, 3, '#ff0');
    px(ctx, 3, 3, '#ff0');
    rect(ctx, 13, 3, 2, 2, body);
    px(ctx, 14, 2, dark);
    rect(ctx, 4, 8, 2, 4 + (frame % 2), body);
    rect(ctx, 10, 8, 2, 4 - (frame % 2) + 1, body);
    rect(ctx, 7, 8, 2, 4, body);
    rect(ctx, 4, 12, 2, 1, '#2a1a0a');
    rect(ctx, 10, 12, 2, 1, '#2a1a0a');
    return canvas;
}

function drawBear(frame) {
    const { canvas, ctx } = createCanvas(16, 16);
    const body = '#5c4033';
    const dark = darken(body);
    const snout = lighten(body, 1.4);
    rect(ctx, 2, 4, 12, 6, body);
    rect(ctx, 2, 4, 2, 6, dark);
    rect(ctx, 0, 1, 6, 5, body);
    px(ctx, 0, 0, body); px(ctx, 5, 0, body);
    rect(ctx, 1, 4, 3, 2, snout);
    px(ctx, 2, 4, '#111');
    px(ctx, 1, 2, '#111');
    px(ctx, 4, 2, '#111');
    px(ctx, 1, 1, '#fff');
    rect(ctx, 3, 10, 3, 4 + (frame % 2), body);
    rect(ctx, 10, 10, 3, 4 - (frame % 2) + 1, body);
    rect(ctx, 3, 14, 3, 1, dark);
    rect(ctx, 10, 14, 3, 1, dark);
    return canvas;
}

function drawBird(frame) {
    const { canvas, ctx } = createCanvas(12, 10);
    const body = '#4169e1';
    const wing = darken(body, 0.8);
    rect(ctx, 4, 3, 5, 4, body);
    rect(ctx, 3, 1, 4, 3, body);
    px(ctx, 4, 2, '#111');
    px(ctx, 4, 1, '#fff');
    px(ctx, 2, 3, '#ffaa00');
    px(ctx, 1, 3, '#ffaa00');
    if (frame % 2 === 0) {
        rect(ctx, 1, 3, 3, 1, wing);
        rect(ctx, 8, 3, 3, 1, wing);
    } else {
        rect(ctx, 1, 1, 3, 1, wing);
        rect(ctx, 8, 1, 3, 1, wing);
    }
    rect(ctx, 9, 4, 2, 2, wing);
    return canvas;
}

function drawFish(frame) {
    const { canvas, ctx } = createCanvas(14, 8);
    const body = '#00ced1';
    const dark = darken(body);
    const belly = lighten(body, 1.3);
    rect(ctx, 2, 1, 8, 5, body);
    rect(ctx, 3, 3, 6, 2, belly);
    rect(ctx, 1, 2, 2, 3, body);
    px(ctx, 2, 2, '#111');
    px(ctx, 2, 1, '#fff');
    rect(ctx, 10, 0, 2, 2, dark);
    rect(ctx, 10, 5, 2, 2, dark);
    rect(ctx, 11, 2, 2, 3, dark);
    px(ctx, 5, 0, dark);
    px(ctx, 6, 0, dark);
    px(ctx, 1, 3, '#ff8888');
    return canvas;
}

// ===== DINOSAUR SPRITES =====
export function generateDinoSprite(type, config, frame = 0) {
    const sprites = {
        TREX: () => drawTRex(config, frame),
        BRONTO: () => drawBronto(config, frame),
        RAPTOR: () => drawRaptor(config, frame),
        TRICERATOPS: () => drawTriceratops(config, frame),
        PTERANODON: () => drawPteranodon(config, frame),
        STEGO: () => drawStego(config, frame),
    };
    return canvasToTexture((sprites[type] || sprites.TREX)());
}

function drawTRex(config, frame) {
    const { canvas, ctx } = createCanvas(32, 32);
    const c = config.color || '#556b2f';
    const dark = darken(c);
    const belly = lighten(c, 1.3);
    rect(ctx, 8, 10, 14, 10, c);
    rect(ctx, 10, 14, 10, 5, belly);
    rect(ctx, 2, 4, 10, 8, c);
    rect(ctx, 2, 8, 9, 3, belly);
    for (let i = 0; i < 4; i++) px(ctx, 3 + i * 2, 11, '#fff');
    rect(ctx, 4, 5, 2, 2, '#ff2200');
    px(ctx, 4, 5, '#110000');
    rect(ctx, 7, 12, 2, 3, c);
    rect(ctx, 22, 11, 6, 4, c);
    rect(ctx, 27, 13, 4, 2, c);
    const lf = frame % 2;
    rect(ctx, 10, 20, 4, 8 + lf, c);
    rect(ctx, 18, 20, 4, 8 - lf + 1, c);
    rect(ctx, 9, 28, 6, 2, dark);
    rect(ctx, 17, 28, 6, 2, dark);
    return canvas;
}

function drawBronto(config, frame) {
    const { canvas, ctx } = createCanvas(48, 40);
    const c = config.color || '#708090';
    const dark = darken(c);
    const belly = lighten(c, 1.2);
    rect(ctx, 14, 16, 20, 12, c);
    rect(ctx, 16, 20, 16, 6, belly);
    rect(ctx, 6, 6, 6, 14, c);
    rect(ctx, 4, 4, 4, 6, c);
    rect(ctx, 2, 2, 5, 4, c);
    px(ctx, 3, 3, '#111');
    px(ctx, 3, 2, '#fff');
    rect(ctx, 34, 17, 8, 4, c);
    rect(ctx, 41, 19, 6, 2, c);
    rect(ctx, 16, 28, 4, 10, c);
    rect(ctx, 22, 28, 4, 10 + (frame % 2), c);
    rect(ctx, 28, 28, 4, 10, c);
    rect(ctx, 15, 37, 6, 2, dark);
    rect(ctx, 21, 37, 6, 2, dark);
    rect(ctx, 27, 37, 6, 2, dark);
    return canvas;
}

function drawRaptor(config, frame) {
    const { canvas, ctx } = createCanvas(20, 20);
    const c = config.color || '#6b8e23';
    const dark = darken(c);
    rect(ctx, 5, 6, 10, 5, c);
    rect(ctx, 1, 3, 6, 4, c);
    px(ctx, 2, 4, '#ffcc00');
    px(ctx, 1, 6, '#ddd');
    rect(ctx, 5, 8, 1, 3, c);
    px(ctx, 5, 11, '#ddc');
    rect(ctx, 15, 7, 4, 2, c);
    rect(ctx, 7, 11, 2, 6 + (frame % 2), c);
    rect(ctx, 12, 11, 2, 6 - (frame % 2) + 1, c);
    rect(ctx, 6, 17, 4, 1, dark);
    rect(ctx, 11, 17, 4, 1, dark);
    return canvas;
}

function drawTriceratops(config, frame) {
    const { canvas, ctx } = createCanvas(28, 24);
    const c = config.color || '#8b7355';
    const dark = darken(c);
    const frill = lighten(c, 0.9);
    rect(ctx, 8, 8, 14, 8, c);
    rect(ctx, 1, 2, 8, 8, frill);
    rect(ctx, 2, 3, 6, 6, c);
    rect(ctx, 3, 6, 7, 5, c);
    rect(ctx, 2, 1, 1, 4, '#f0e0c0');
    rect(ctx, 6, 1, 1, 4, '#f0e0c0');
    px(ctx, 4, 4, '#f0e0c0');
    px(ctx, 5, 7, '#111');
    px(ctx, 5, 6, '#fff');
    rect(ctx, 22, 9, 4, 3, c);
    rect(ctx, 10, 16, 3, 6, c);
    rect(ctx, 15, 16, 3, 6 + (frame % 2), c);
    rect(ctx, 19, 16, 3, 6, c);
    rect(ctx, 10, 21, 3, 1, dark);
    rect(ctx, 15, 21, 3, 1, dark);
    return canvas;
}

function drawPteranodon(config, frame) {
    const { canvas, ctx } = createCanvas(28, 16);
    const c = config.color || '#4682b4';
    const wing = darken(c, 0.85);
    rect(ctx, 11, 6, 6, 4, c);
    rect(ctx, 8, 4, 4, 3, c);
    rect(ctx, 10, 2, 4, 3, c);
    px(ctx, 8, 5, '#111');
    rect(ctx, 6, 6, 3, 1, '#ddcc80');
    if (frame % 2 === 0) {
        rect(ctx, 0, 5, 11, 2, wing);
        rect(ctx, 17, 5, 11, 2, wing);
    } else {
        rect(ctx, 0, 8, 11, 2, wing);
        rect(ctx, 17, 8, 11, 2, wing);
    }
    rect(ctx, 17, 7, 3, 2, c);
    return canvas;
}

function drawStego(config, frame) {
    const { canvas, ctx } = createCanvas(28, 22);
    const c = config.color || '#8b6914';
    const dark = darken(c);
    const plate = darken(c, 0.7);
    rect(ctx, 6, 8, 16, 6, c);
    rect(ctx, 1, 8, 6, 4, c);
    px(ctx, 2, 9, '#111');
    px(ctx, 2, 8, '#fff');
    for (let i = 0; i < 5; i++) {
        const h = i === 2 ? 4 : 3;
        rect(ctx, 8 + i * 3, 8 - h, 2, h, plate);
    }
    px(ctx, 22, 8, '#ddc080');
    px(ctx, 23, 7, '#ddc080');
    px(ctx, 24, 9, '#ddc080');
    px(ctx, 25, 8, '#ddc080');
    rect(ctx, 22, 9, 4, 3, c);
    rect(ctx, 8, 14, 3, 6, c);
    rect(ctx, 13, 14, 3, 6 + (frame % 2), c);
    rect(ctx, 18, 14, 3, 6, c);
    rect(ctx, 8, 19, 3, 1, dark);
    rect(ctx, 13, 19, 3, 1, dark);
    return canvas;
}

// ===== GIANT SPRITE =====
export function generateGiantSprite(giant, frame = 0) {
    const { canvas, ctx } = createCanvas(24, 36);
    const body = '#886644';
    const skin = '#c4a882';
    const dark = darken(body);
    const cloth = '#6a4a2a';

    rect(ctx, 7, 1, 10, 8, skin);
    rect(ctx, 9, 4, 2, 2, '#ff4400');
    rect(ctx, 14, 4, 2, 2, '#ff4400');
    px(ctx, 9, 4, '#330000');
    px(ctx, 14, 4, '#330000');
    rect(ctx, 10, 7, 4, 1, '#331111');
    rect(ctx, 5, 9, 14, 12, body);
    rect(ctx, 5, 9, 2, 12, dark);
    rect(ctx, 5, 18, 14, 3, cloth);
    const lf = frame % 2;
    rect(ctx, 1, 9, 4, 10 + lf, body);
    rect(ctx, 19, 9, 4, 10 - lf + 1, body);
    rect(ctx, 1, 19 + lf, 4, 2, skin);
    rect(ctx, 19, 19 - lf + 1, 4, 2, skin);
    rect(ctx, 20, 14, 2, 8, '#5a4020');
    rect(ctx, 19, 12, 4, 3, '#5a4020');
    rect(ctx, 7, 21, 4, 10, body);
    rect(ctx, 13, 21, 4, 10, body);
    rect(ctx, 6, 31, 6, 2, dark);
    rect(ctx, 12, 31, 6, 2, dark);
    return canvasToTexture(canvas);
}

// ===== VEHICLE SPRITES =====
export function generateVehicleSprite(type, config) {
    const sprites = {
        CART: () => drawCart(config),
        CARRIAGE: () => drawCart(config),
        HORSE: () => drawHorse(config),
        TRAIN: () => drawTrain(config),
        CAR: () => drawCar(config),
        BUS: () => drawBus(config),
        FLYING_CAR: () => drawFlyingCar(config),
    };
    return canvasToTexture((sprites[type] || sprites.CART)());
}

function drawCart(config) {
    const { canvas, ctx } = createCanvas(24, 16);
    const wood = '#8B6914';
    const dark = darken(wood);
    rect(ctx, 4, 3, 16, 6, wood);
    rect(ctx, 4, 3, 16, 1, dark);
    rect(ctx, 4, 3, 1, 6, dark);
    rect(ctx, 19, 3, 1, 6, dark);
    rect(ctx, 4, 10, 4, 4, '#3a2a1a');
    rect(ctx, 5, 11, 2, 2, '#888');
    rect(ctx, 16, 10, 4, 4, '#3a2a1a');
    rect(ctx, 17, 11, 2, 2, '#888');
    rect(ctx, 0, 6, 5, 1, dark);
    return canvas;
}

function drawHorse(config) {
    const { canvas, ctx } = createCanvas(16, 16);
    const c = config.color || '#8B4513';
    const dark = darken(c);
    rect(ctx, 4, 4, 8, 5, c);
    rect(ctx, 1, 2, 4, 4, c);
    px(ctx, 2, 3, '#111');
    px(ctx, 1, 1, c); px(ctx, 3, 1, c);
    rect(ctx, 4, 2, 1, 5, dark);
    rect(ctx, 12, 3, 1, 4, dark);
    px(ctx, 13, 5, dark);
    rect(ctx, 5, 9, 2, 5, c);
    rect(ctx, 9, 9, 2, 5, c);
    rect(ctx, 5, 13, 2, 1, '#2a1a0a');
    rect(ctx, 9, 13, 2, 1, '#2a1a0a');
    return canvas;
}

function drawTrain(config) {
    const { canvas, ctx } = createCanvas(40, 16);
    rect(ctx, 0, 2, 14, 8, '#333');
    rect(ctx, 1, 0, 3, 4, '#444');
    rect(ctx, 3, 4, 8, 4, '#c44');
    rect(ctx, 5, 3, 3, 3, '#88bbdd');
    rect(ctx, 16, 3, 10, 7, '#8B4513');
    rect(ctx, 17, 4, 3, 3, '#88bbdd');
    rect(ctx, 21, 4, 3, 3, '#88bbdd');
    rect(ctx, 28, 3, 10, 7, '#6B3510');
    rect(ctx, 29, 4, 3, 3, '#88bbdd');
    rect(ctx, 33, 4, 3, 3, '#88bbdd');
    for (let i = 0; i < 6; i++) {
        rect(ctx, 2 + i * 7, 10, 3, 3, '#222');
        px(ctx, 3 + i * 7, 11, '#888');
    }
    rect(ctx, 0, 0, 2, 1, '#ccc');
    return canvas;
}

function drawCar(config) {
    const { canvas, ctx } = createCanvas(20, 14);
    const c = config.color || '#4466aa';
    const dark = darken(c);
    rect(ctx, 2, 4, 16, 5, c);
    rect(ctx, 2, 4, 16, 1, dark);
    rect(ctx, 5, 1, 10, 4, '#88bbdd');
    rect(ctx, 5, 1, 10, 1, darken('#88bbdd'));
    px(ctx, 2, 6, '#ffffaa');
    px(ctx, 17, 6, '#ff2200');
    rect(ctx, 3, 9, 4, 3, '#333');
    px(ctx, 4, 10, '#888');
    rect(ctx, 13, 9, 4, 3, '#333');
    px(ctx, 14, 10, '#888');
    return canvas;
}

function drawBus(config) {
    const { canvas, ctx } = createCanvas(28, 16);
    const c = config.color || '#cc6644';
    const dark = darken(c);
    rect(ctx, 2, 2, 24, 8, c);
    rect(ctx, 2, 2, 24, 1, dark);
    for (let i = 0; i < 5; i++) {
        rect(ctx, 4 + i * 5, 3, 3, 3, '#88bbdd');
    }
    rect(ctx, 4, 10, 4, 4, '#333');
    px(ctx, 5, 11, '#888');
    rect(ctx, 20, 10, 4, 4, '#333');
    px(ctx, 21, 11, '#888');
    return canvas;
}

function drawFlyingCar(config) {
    const { canvas, ctx } = createCanvas(20, 14);
    const c = config.color || '#88ccff';
    rect(ctx, 3, 4, 14, 4, c);
    rect(ctx, 5, 3, 8, 2, '#88bbdd');
    rect(ctx, 1, 8, 3, 2, '#00ccff');
    rect(ctx, 16, 8, 3, 2, '#00ccff');
    px(ctx, 17, 5, '#ff2200');
    px(ctx, 17, 7, '#ff2200');
    return canvas;
}

// ===== BUILDING SPRITES =====
export function generateBuildingSprite(building) {
    const type = building.buildingType;
    const config = building.config;
    if (!config) return null;
    const sprites = {
        HUT: () => drawHut(config),
        HOUSE: () => drawHouse(config),
        FARM: () => drawFarm(config),
        GRANARY: () => drawGranary(config),
        TEMPLE: () => drawTemple(config),
        MARKET: () => drawMarket(config),
        SCHOOL: () => drawSchool(config),
        CASTLE: () => drawCastle(config),
        WORKSHOP: () => drawWorkshop(config),
        CHURCH: () => drawChurch(config),
        FACTORY: () => drawFactory(config),
        HOSPITAL: () => drawHospital(config),
        SKYSCRAPER: () => drawSkyscraper(config),
    };
    return canvasToTexture((sprites[type] || sprites.HUT)());
}

function drawHut(config) {
    const { canvas, ctx } = createCanvas(24, 24);
    rect(ctx, 5, 10, 14, 10, '#8B6914');
    rect(ctx, 5, 10, 14, 2, darken('#8B6914'));
    rect(ctx, 10, 14, 4, 6, '#5a4020');
    rect(ctx, 3, 6, 18, 2, '#6a4a2a');
    rect(ctx, 5, 4, 14, 2, '#7a5a3a');
    rect(ctx, 7, 2, 10, 2, '#8a6a4a');
    rect(ctx, 9, 0, 6, 2, '#8a6a4a');
    return canvas;
}

function drawHouse(config) {
    const { canvas, ctx } = createCanvas(24, 24);
    rect(ctx, 4, 10, 16, 12, '#A0522D');
    rect(ctx, 4, 10, 16, 2, darken('#A0522D'));
    rect(ctx, 6, 12, 3, 3, '#88bbdd');
    rect(ctx, 15, 12, 3, 3, '#88bbdd');
    rect(ctx, 10, 16, 4, 6, '#5a3020');
    px(ctx, 13, 19, '#daa520');
    rect(ctx, 2, 6, 20, 2, '#8B0000');
    rect(ctx, 4, 4, 16, 2, '#a01010');
    rect(ctx, 6, 2, 12, 2, '#b02020');
    rect(ctx, 8, 0, 8, 2, '#b02020');
    return canvas;
}

function drawFarm(config) {
    const { canvas, ctx } = createCanvas(32, 20);
    rect(ctx, 0, 8, 32, 12, '#82bc34');
    for (let i = 0; i < 6; i++) {
        rect(ctx, 2 + i * 5, 10, 3, 8, '#6a9a2a');
    }
    rect(ctx, 0, 7, 32, 1, '#8B6914');
    for (let i = 0; i < 8; i++) rect(ctx, i * 4, 5, 1, 3, '#8B6914');
    return canvas;
}

function drawGranary(config) {
    const { canvas, ctx } = createCanvas(24, 24);
    rect(ctx, 4, 8, 16, 14, '#DAA520');
    rect(ctx, 4, 8, 16, 2, darken('#DAA520'));
    rect(ctx, 2, 4, 20, 4, darken('#DAA520'));
    rect(ctx, 4, 2, 16, 2, darken('#DAA520', 0.8));
    rect(ctx, 9, 14, 6, 8, '#8a6a20');
    return canvas;
}

function drawTemple(config) {
    const { canvas, ctx } = createCanvas(32, 28);
    rect(ctx, 2, 18, 28, 8, '#f0e6d0');
    for (let i = 0; i < 4; i++) {
        rect(ctx, 4 + i * 8, 8, 3, 12, '#f0e6d0');
    }
    rect(ctx, 0, 4, 32, 4, '#FFD700');
    rect(ctx, 4, 2, 24, 2, '#e8c820');
    rect(ctx, 8, 0, 16, 2, '#d4b010');
    return canvas;
}

function drawMarket(config) {
    const { canvas, ctx } = createCanvas(32, 24);
    rect(ctx, 2, 12, 28, 10, '#CD853F');
    rect(ctx, 0, 6, 32, 6, '#cc8844');
    rect(ctx, 0, 6, 32, 1, '#aa6622');
    rect(ctx, 6, 14, 4, 4, '#ff6644');
    rect(ctx, 14, 14, 4, 4, '#44cc44');
    rect(ctx, 22, 14, 4, 4, '#ddaa44');
    return canvas;
}

function drawSchool(config) {
    const { canvas, ctx } = createCanvas(24, 24);
    rect(ctx, 4, 8, 16, 14, '#4682B4');
    rect(ctx, 4, 8, 16, 2, darken('#4682B4'));
    for (let i = 0; i < 3; i++) rect(ctx, 6 + i * 5, 11, 3, 3, '#88bbdd');
    rect(ctx, 10, 16, 4, 6, '#2a4a6a');
    rect(ctx, 2, 4, 20, 4, '#2a4a6a');
    rect(ctx, 6, 2, 12, 2, '#2a4a6a');
    px(ctx, 12, 1, '#daa520');
    return canvas;
}

function drawCastle(config) {
    const { canvas, ctx } = createCanvas(40, 32);
    rect(ctx, 6, 12, 28, 18, '#696969');
    rect(ctx, 2, 4, 8, 26, '#808080');
    rect(ctx, 30, 4, 8, 26, '#808080');
    for (let i = 0; i < 3; i++) {
        rect(ctx, 3 + i * 3, 2, 2, 3, '#808080');
        rect(ctx, 31 + i * 3, 2, 2, 3, '#808080');
    }
    rect(ctx, 15, 18, 10, 12, '#444');
    rect(ctx, 15, 18, 10, 2, '#555');
    rect(ctx, 10, 14, 3, 3, '#333');
    rect(ctx, 27, 14, 3, 3, '#333');
    rect(ctx, 19, 2, 1, 10, '#555');
    rect(ctx, 20, 2, 4, 3, '#ff0000');
    return canvas;
}

function drawWorkshop(config) {
    const { canvas, ctx } = createCanvas(24, 24);
    rect(ctx, 4, 10, 16, 12, '#8B7355');
    rect(ctx, 4, 10, 16, 2, darken('#8B7355'));
    rect(ctx, 2, 6, 20, 4, '#7a6344');
    rect(ctx, 6, 4, 12, 2, '#7a6344');
    rect(ctx, 8, 16, 6, 4, '#444');
    rect(ctx, 18, 2, 3, 8, '#555');
    px(ctx, 19, 1, '#ccc');
    return canvas;
}

function drawChurch(config) {
    const { canvas, ctx } = createCanvas(24, 28);
    rect(ctx, 4, 12, 16, 14, '#F5F5DC');
    rect(ctx, 4, 12, 16, 2, darken('#F5F5DC'));
    rect(ctx, 7, 14, 3, 4, '#88bbdd');
    rect(ctx, 14, 14, 3, 4, '#88bbdd');
    rect(ctx, 10, 20, 4, 6, '#5a3a1a');
    rect(ctx, 8, 4, 8, 8, '#F5F5DC');
    rect(ctx, 10, 0, 4, 4, '#F5F5DC');
    rect(ctx, 11, 0, 2, 1, '#ff0000');
    px(ctx, 11, 1, '#ff0000');
    px(ctx, 12, 1, '#ff0000');
    return canvas;
}

function drawFactory(config) {
    const { canvas, ctx } = createCanvas(32, 24);
    rect(ctx, 2, 8, 28, 14, '#778899');
    rect(ctx, 2, 8, 28, 2, darken('#778899'));
    for (let i = 0; i < 4; i++) rect(ctx, 5 + i * 7, 12, 4, 3, '#aabbcc');
    rect(ctx, 24, 0, 3, 10, '#444');
    rect(ctx, 28, 2, 3, 8, '#444');
    rect(ctx, 24, 0, 2, 1, '#ccc');
    px(ctx, 28, 1, '#ccc');
    rect(ctx, 13, 16, 6, 6, '#556677');
    return canvas;
}

function drawHospital(config) {
    const { canvas, ctx } = createCanvas(28, 24);
    rect(ctx, 4, 6, 20, 16, '#fff');
    rect(ctx, 4, 6, 20, 2, '#ddd');
    rect(ctx, 12, 8, 4, 10, '#ff0000');
    rect(ctx, 9, 11, 10, 4, '#ff0000');
    rect(ctx, 12, 18, 4, 4, '#ddd');
    rect(ctx, 6, 10, 3, 3, '#88bbdd');
    rect(ctx, 19, 10, 3, 3, '#88bbdd');
    return canvas;
}

function drawSkyscraper(config) {
    const { canvas, ctx } = createCanvas(20, 40);
    rect(ctx, 2, 4, 16, 34, '#88aacc');
    rect(ctx, 2, 4, 16, 2, darken('#88aacc'));
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 3; x++) {
            rect(ctx, 4 + x * 5, 8 + y * 4, 3, 2, '#aaddff');
        }
    }
    rect(ctx, 9, 0, 2, 4, '#ccc');
    rect(ctx, 7, 34, 6, 4, '#556677');
    return canvas;
}

// ===== TREE SPRITE =====
export function generateTreeSprite(tree) {
    const { canvas, ctx } = createCanvas(16, 24);
    const foliageColor = tree.color || '#2a8030';
    const dark = darken(foliageColor);
    const light = lighten(foliageColor);

    rect(ctx, 6, 14, 4, 8, '#6B4226');
    rect(ctx, 6, 14, 1, 8, darken('#6B4226'));

    rect(ctx, 1, 8, 14, 6, foliageColor);
    rect(ctx, 2, 4, 12, 6, light);
    rect(ctx, 3, 1, 10, 5, foliageColor);
    rect(ctx, 5, 0, 6, 3, dark);

    px(ctx, 5, 3, light);
    px(ctx, 9, 5, light);
    px(ctx, 4, 9, light);
    px(ctx, 7, 7, dark);
    px(ctx, 11, 10, dark);
    px(ctx, 3, 6, dark);

    return canvasToTexture(canvas);
}
