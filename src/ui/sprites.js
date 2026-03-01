// Runtime pixel art sprite generator
// Generates all game sprites programmatically - no external image files needed

export class SpriteSheet {
    constructor() {
        this.sprites = {};
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.generated = false;
    }

    generate() {
        if (this.generated) return;
        this.generatePeople();
        this.generateBuildings();
        this.generateAnimals();
        this.generateTrees();
        this.generateEffects();
        this.generated = true;
    }

    // Create a small canvas for a sprite
    createSprite(width, height, drawFn) {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        drawFn(ctx, width, height);
        return c;
    }

    // ===== PEOPLE =====
    generatePeople() {
        // Male adult
        this.sprites.maleAdult = this.createSprite(12, 16, (ctx) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(2, 14, 8, 2);
            // Body
            ctx.fillStyle = '#3366aa';
            ctx.fillRect(3, 7, 6, 6);
            // Arms
            ctx.fillStyle = '#3366aa';
            ctx.fillRect(1, 8, 2, 4);
            ctx.fillRect(9, 8, 2, 4);
            // Legs
            ctx.fillStyle = '#2a4a7a';
            ctx.fillRect(4, 13, 2, 2);
            ctx.fillRect(7, 13, 2, 2);
            // Head
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(3, 1, 6, 6);
            // Hair
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(3, 1, 6, 2);
            // Eyes
            ctx.fillStyle = '#222';
            ctx.fillRect(4, 4, 1, 1);
            ctx.fillRect(7, 4, 1, 1);
        });

        // Female adult
        this.sprites.femaleAdult = this.createSprite(12, 16, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(2, 14, 8, 2);
            // Dress/body
            ctx.fillStyle = '#cc4488';
            ctx.fillRect(3, 7, 6, 5);
            ctx.fillRect(2, 10, 8, 3);
            // Arms
            ctx.fillStyle = '#cc4488';
            ctx.fillRect(1, 8, 2, 3);
            ctx.fillRect(9, 8, 2, 3);
            // Legs
            ctx.fillStyle = '#aa3366';
            ctx.fillRect(4, 13, 2, 2);
            ctx.fillRect(7, 13, 2, 2);
            // Head
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(3, 1, 6, 6);
            // Hair (longer)
            ctx.fillStyle = '#4a2a0a';
            ctx.fillRect(3, 0, 6, 3);
            ctx.fillRect(2, 1, 1, 5);
            ctx.fillRect(9, 1, 1, 5);
            // Eyes
            ctx.fillStyle = '#222';
            ctx.fillRect(4, 4, 1, 1);
            ctx.fillRect(7, 4, 1, 1);
        });

        // Child
        this.sprites.child = this.createSprite(10, 12, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(2, 10, 6, 2);
            // Body
            ctx.fillStyle = '#66aa44';
            ctx.fillRect(3, 6, 4, 3);
            // Arms
            ctx.fillStyle = '#66aa44';
            ctx.fillRect(1, 6, 2, 2);
            ctx.fillRect(7, 6, 2, 2);
            // Legs
            ctx.fillStyle = '#558833';
            ctx.fillRect(3, 9, 2, 2);
            ctx.fillRect(5, 9, 2, 2);
            // Head (bigger for child proportions)
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(2, 0, 6, 6);
            // Hair
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(2, 0, 6, 2);
            // Eyes
            ctx.fillStyle = '#222';
            ctx.fillRect(3, 3, 1, 1);
            ctx.fillRect(6, 3, 1, 1);
        });

        // Walking frames (simple offsets for animation)
        this.sprites.maleWalk = this.createSprite(12, 16, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(2, 14, 8, 2);
            ctx.fillStyle = '#3366aa';
            ctx.fillRect(3, 7, 6, 6);
            ctx.fillStyle = '#3366aa';
            ctx.fillRect(1, 7, 2, 4);
            ctx.fillRect(9, 9, 2, 4);
            // Walking legs
            ctx.fillStyle = '#2a4a7a';
            ctx.fillRect(3, 13, 2, 2);
            ctx.fillRect(8, 13, 2, 2);
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(3, 1, 6, 6);
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(3, 1, 6, 2);
            ctx.fillStyle = '#222';
            ctx.fillRect(4, 4, 1, 1);
            ctx.fillRect(7, 4, 1, 1);
        });

        // Sleeping person
        this.sprites.sleeping = this.createSprite(16, 10, (ctx) => {
            // Lying down
            ctx.fillStyle = '#3366aa';
            ctx.fillRect(4, 3, 8, 4);
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(0, 3, 4, 4);
            ctx.fillStyle = '#666';
            ctx.fillRect(3, 2, 10, 1); // blanket top
            ctx.fillRect(3, 7, 10, 1); // blanket bottom
            // Zzz
            ctx.fillStyle = '#aaf';
            ctx.fillRect(13, 0, 2, 1);
            ctx.fillRect(14, 1, 1, 1);
        });
    }

    // ===== BUILDINGS =====
    generateBuildings() {
        // Hut
        this.sprites.HUT = this.createSprite(24, 24, (ctx) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(4, 20, 20, 4);
            // Base
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(4, 12, 16, 10);
            // Door
            ctx.fillStyle = '#5a4010';
            ctx.fillRect(9, 16, 4, 6);
            // Straw roof
            ctx.fillStyle = '#aa8833';
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(4 + i, 12 - i, 16 - i * 2, 2);
            }
            ctx.fillStyle = '#997722';
            ctx.fillRect(10, 4, 4, 2);
        });

        // House
        this.sprites.HOUSE = this.createSprite(24, 28, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(3, 24, 20, 4);
            // Walls
            ctx.fillStyle = '#c4a882';
            ctx.fillRect(3, 12, 18, 14);
            // Roof
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.moveTo(0, 14);
            ctx.lineTo(12, 2);
            ctx.lineTo(24, 14);
            ctx.fill();
            // Window
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(6, 16, 4, 4);
            ctx.fillRect(14, 16, 4, 4);
            // Window frames
            ctx.fillStyle = '#654321';
            ctx.fillRect(7, 18, 2, 0.5);
            ctx.fillRect(15, 18, 2, 0.5);
            // Door
            ctx.fillStyle = '#654321';
            ctx.fillRect(10, 19, 4, 7);
            ctx.fillStyle = '#daa520';
            ctx.fillRect(12, 22, 1, 1);
        });

        // Farm
        this.sprites.FARM = this.createSprite(48, 48, (ctx) => {
            // Dirt rows
            for (let row = 0; row < 6; row++) {
                ctx.fillStyle = row % 2 === 0 ? '#8a7a40' : '#6a8a30';
                ctx.fillRect(2, 6 + row * 7, 44, 6);
                // Crop dots
                if (row % 2 === 1) {
                    ctx.fillStyle = '#33aa22';
                    for (let i = 0; i < 8; i++) {
                        ctx.fillRect(4 + i * 5, 8 + row * 7, 3, 3);
                    }
                }
            }
            // Fence
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(0, 0, 48, 2);
            ctx.fillRect(0, 46, 48, 2);
            ctx.fillRect(0, 0, 2, 48);
            ctx.fillRect(46, 0, 2, 48);
        });

        // Temple
        this.sprites.TEMPLE = this.createSprite(48, 48, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(6, 42, 40, 6);
            // Base platform
            ctx.fillStyle = '#d4c49a';
            ctx.fillRect(4, 36, 40, 8);
            ctx.fillRect(8, 32, 32, 4);
            // Pillars
            ctx.fillStyle = '#e8dcc8';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(10 + i * 10, 16, 4, 20);
            }
            // Roof
            ctx.fillStyle = '#c4a040';
            ctx.beginPath();
            ctx.moveTo(4, 18);
            ctx.lineTo(24, 4);
            ctx.lineTo(44, 18);
            ctx.fill();
            // Gold orb
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(24, 4, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // School
        this.sprites.SCHOOL = this.createSprite(24, 28, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(2, 24, 22, 4);
            ctx.fillStyle = '#4682B4';
            ctx.fillRect(2, 10, 20, 16);
            ctx.fillStyle = '#3a6a9a';
            ctx.fillRect(2, 10, 20, 3);
            // Windows
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(4, 15, 3, 3);
            ctx.fillRect(10, 15, 3, 3);
            ctx.fillRect(16, 15, 3, 3);
            // Door
            ctx.fillStyle = '#2a4a6a';
            ctx.fillRect(9, 20, 5, 6);
            // Bell
            ctx.fillStyle = '#daa520';
            ctx.fillRect(11, 7, 2, 3);
        });

        // Market
        this.sprites.MARKET = this.createSprite(48, 48, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(4, 42, 42, 6);
            // Stalls
            ctx.fillStyle = '#CD853F';
            ctx.fillRect(4, 24, 40, 20);
            // Awnings (colorful)
            const colors = ['#cc3333', '#3366cc', '#33aa33', '#ccaa33'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = colors[i];
                ctx.fillRect(4 + i * 10, 18, 10, 6);
            }
            // Goods
            ctx.fillStyle = '#ff6633';
            ctx.fillRect(8, 28, 4, 4);
            ctx.fillStyle = '#33cc66';
            ctx.fillRect(18, 28, 4, 4);
            ctx.fillStyle = '#cc9933';
            ctx.fillRect(28, 28, 4, 4);
            ctx.fillStyle = '#9966cc';
            ctx.fillRect(38, 28, 4, 4);
        });

        // Castle
        this.sprites.CASTLE = this.createSprite(72, 72, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(8, 64, 60, 8);
            // Main wall
            ctx.fillStyle = '#808080';
            ctx.fillRect(12, 28, 48, 40);
            // Towers
            ctx.fillStyle = '#707070';
            ctx.fillRect(6, 16, 16, 52);
            ctx.fillRect(50, 16, 16, 52);
            // Tower tops (battlements)
            ctx.fillStyle = '#606060';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(6 + i * 5, 12, 3, 4);
                ctx.fillRect(50 + i * 5, 12, 3, 4);
            }
            // Center battlement
            for (let i = 0; i < 6; i++) {
                ctx.fillRect(14 + i * 8, 24, 4, 4);
            }
            // Gate
            ctx.fillStyle = '#4a3a2a';
            ctx.fillRect(28, 46, 16, 22);
            ctx.fillStyle = '#3a2a1a';
            ctx.beginPath();
            ctx.arc(36, 46, 8, Math.PI, 0);
            ctx.fill();
            // Windows
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(18, 36, 4, 6);
            ctx.fillRect(50, 36, 4, 6);
            // Flag
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(34, 4, 8, 6);
            ctx.fillStyle = '#5a5a5a';
            ctx.fillRect(33, 4, 1, 20);
        });

        // Church
        this.sprites.CHURCH = this.createSprite(24, 32, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(3, 28, 20, 4);
            ctx.fillStyle = '#F5F5DC';
            ctx.fillRect(3, 14, 18, 18);
            // Steeple
            ctx.fillStyle = '#e8e0c8';
            ctx.fillRect(8, 4, 8, 10);
            // Cross
            ctx.fillStyle = '#daa520';
            ctx.fillRect(11, 0, 2, 6);
            ctx.fillRect(9, 2, 6, 2);
            // Window (stained glass)
            ctx.fillStyle = '#4488cc';
            ctx.fillRect(9, 18, 6, 6);
            ctx.fillStyle = '#cc4444';
            ctx.fillRect(10, 19, 2, 2);
            ctx.fillStyle = '#44cc44';
            ctx.fillRect(12, 19, 2, 2);
            // Door
            ctx.fillStyle = '#654321';
            ctx.fillRect(9, 26, 6, 6);
        });

        // Granary
        this.sprites.GRANARY = this.createSprite(24, 24, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(4, 20, 18, 4);
            ctx.fillStyle = '#DAA520';
            ctx.fillRect(4, 10, 16, 12);
            ctx.fillStyle = '#c4920a';
            ctx.fillRect(4, 10, 16, 3);
            // Grain symbol
            ctx.fillStyle = '#fff8dc';
            ctx.fillRect(9, 14, 6, 4);
            // Door
            ctx.fillStyle = '#b8860b';
            ctx.fillRect(9, 18, 5, 4);
        });

        // Workshop
        this.sprites.WORKSHOP = this.createSprite(24, 24, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(3, 20, 20, 4);
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(3, 8, 18, 14);
            ctx.fillStyle = '#6a5535';
            ctx.fillRect(3, 8, 18, 3);
            // Chimney
            ctx.fillStyle = '#666';
            ctx.fillRect(16, 2, 4, 8);
            // Smoke
            ctx.fillStyle = 'rgba(150,150,150,0.5)';
            ctx.fillRect(17, 0, 2, 2);
            // Anvil/tools
            ctx.fillStyle = '#444';
            ctx.fillRect(6, 16, 4, 2);
            // Door
            ctx.fillStyle = '#5a4025';
            ctx.fillRect(10, 15, 4, 7);
        });

        // Factory
        this.sprites.FACTORY = this.createSprite(48, 48, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(4, 42, 44, 6);
            ctx.fillStyle = '#778899';
            ctx.fillRect(4, 20, 40, 24);
            // Smokestacks
            ctx.fillStyle = '#666';
            ctx.fillRect(8, 4, 6, 16);
            ctx.fillRect(20, 8, 6, 12);
            ctx.fillRect(36, 6, 6, 14);
            // Smoke
            ctx.fillStyle = 'rgba(120,120,120,0.4)';
            ctx.beginPath();
            ctx.arc(11, 2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(39, 3, 5, 0, Math.PI * 2);
            ctx.fill();
            // Windows
            ctx.fillStyle = '#aab8cc';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(8 + i * 10, 26, 5, 5);
            }
            // Door
            ctx.fillStyle = '#556677';
            ctx.fillRect(18, 34, 10, 10);
        });

        // Hospital
        this.sprites.HOSPITAL = this.createSprite(48, 48, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(4, 42, 42, 6);
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(4, 12, 40, 32);
            ctx.fillStyle = '#e0e0e0';
            ctx.fillRect(4, 12, 40, 4);
            // Red cross
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(20, 16, 8, 2);
            ctx.fillRect(22, 14, 4, 6);
            // Windows
            ctx.fillStyle = '#87CEEB';
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 4; col++) {
                    ctx.fillRect(8 + col * 10, 24 + row * 8, 5, 4);
                }
            }
            // Door
            ctx.fillStyle = '#aaa';
            ctx.fillRect(18, 36, 10, 8);
        });

        // Skyscraper
        this.sprites.SKYSCRAPER = this.createSprite(48, 72, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(8, 66, 36, 6);
            // Building body
            ctx.fillStyle = '#a0b4cc';
            ctx.fillRect(10, 8, 28, 60);
            // Glass panels
            ctx.fillStyle = '#88aacc';
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 3; col++) {
                    ctx.fillRect(14 + col * 9, 12 + row * 7, 6, 5);
                }
            }
            // Top
            ctx.fillStyle = '#90a4bc';
            ctx.fillRect(16, 4, 16, 4);
            ctx.fillRect(20, 0, 8, 4);
            // Antenna
            ctx.fillStyle = '#888';
            ctx.fillRect(23, 0, 2, 4);
            // Door
            ctx.fillStyle = '#667788';
            ctx.fillRect(18, 60, 12, 8);
        });
    }

    // ===== ANIMALS =====
    generateAnimals() {
        this.sprites.RABBIT = this.createSprite(8, 8, (ctx) => {
            ctx.fillStyle = '#D2B48C';
            ctx.fillRect(2, 3, 4, 3);
            // Ears
            ctx.fillRect(2, 0, 1, 3);
            ctx.fillRect(5, 0, 1, 3);
            // Tail
            ctx.fillStyle = '#fff';
            ctx.fillRect(6, 4, 2, 2);
            ctx.fillStyle = '#111';
            ctx.fillRect(1, 4, 1, 1);
        });

        this.sprites.DEER = this.createSprite(12, 10, (ctx) => {
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(2, 3, 8, 4);
            // Head
            ctx.fillRect(0, 2, 3, 3);
            // Legs
            ctx.fillStyle = '#7a5a10';
            ctx.fillRect(3, 7, 1, 3);
            ctx.fillRect(5, 7, 1, 3);
            ctx.fillRect(7, 7, 1, 3);
            ctx.fillRect(9, 7, 1, 3);
            // Antlers
            ctx.fillStyle = '#654321';
            ctx.fillRect(0, 0, 1, 2);
            ctx.fillRect(2, 0, 1, 2);
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 3, 1, 1);
        });

        this.sprites.WOLF = this.createSprite(12, 10, (ctx) => {
            ctx.fillStyle = '#696969';
            ctx.fillRect(2, 3, 8, 4);
            ctx.fillRect(0, 2, 3, 4);
            // Legs
            ctx.fillStyle = '#555';
            ctx.fillRect(3, 7, 1, 3);
            ctx.fillRect(5, 7, 1, 3);
            ctx.fillRect(7, 7, 1, 3);
            ctx.fillRect(9, 7, 1, 3);
            // Ears
            ctx.fillRect(0, 0, 2, 2);
            // Eye
            ctx.fillStyle = '#ff3';
            ctx.fillRect(0, 3, 1, 1);
            // Tail
            ctx.fillRect(10, 2, 2, 1);
        });

        this.sprites.BEAR = this.createSprite(14, 12, (ctx) => {
            ctx.fillStyle = '#5C4033';
            ctx.fillRect(2, 3, 10, 6);
            ctx.fillRect(0, 2, 4, 5);
            ctx.fillStyle = '#4a3028';
            ctx.fillRect(3, 9, 2, 3);
            ctx.fillRect(6, 9, 2, 3);
            ctx.fillRect(9, 9, 2, 3);
            // Ears
            ctx.fillStyle = '#5C4033';
            ctx.fillRect(0, 0, 2, 2);
            ctx.fillRect(2, 0, 2, 2);
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 3, 1, 1);
        });

        this.sprites.BIRD = this.createSprite(8, 6, (ctx) => {
            ctx.fillStyle = '#4169E1';
            ctx.fillRect(2, 2, 4, 2);
            // Wings
            ctx.fillRect(0, 1, 2, 2);
            ctx.fillRect(6, 1, 2, 2);
            // Head
            ctx.fillStyle = '#3355cc';
            ctx.fillRect(3, 0, 2, 2);
            // Beak
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(2, 1, 1, 1);
        });

        this.sprites.FISH = this.createSprite(8, 4, (ctx) => {
            ctx.fillStyle = '#00CED1';
            ctx.fillRect(2, 1, 4, 2);
            // Tail
            ctx.fillRect(6, 0, 2, 1);
            ctx.fillRect(6, 3, 2, 1);
            ctx.fillStyle = '#111';
            ctx.fillRect(1, 1, 1, 1);
        });
    }

    // ===== TREES =====
    generateTrees() {
        // Deciduous tree
        this.sprites.tree = this.createSprite(16, 20, (ctx) => {
            // Trunk
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(6, 12, 4, 8);
            // Crown
            ctx.fillStyle = '#2d8b2e';
            ctx.fillRect(2, 4, 12, 8);
            ctx.fillRect(4, 2, 8, 4);
            // Highlights
            ctx.fillStyle = '#3aaa3a';
            ctx.fillRect(4, 4, 3, 3);
            ctx.fillRect(9, 6, 2, 2);
        });

        // Pine tree
        this.sprites.pine = this.createSprite(16, 22, (ctx) => {
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(7, 16, 3, 6);
            ctx.fillStyle = '#1a6b1a';
            // Layers
            ctx.fillRect(4, 12, 9, 4);
            ctx.fillRect(5, 8, 7, 4);
            ctx.fillRect(6, 4, 5, 4);
            ctx.fillRect(7, 1, 3, 3);
        });

        // Fall tree
        this.sprites.treeFall = this.createSprite(16, 20, (ctx) => {
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(6, 12, 4, 8);
            ctx.fillStyle = '#cc7722';
            ctx.fillRect(2, 4, 12, 8);
            ctx.fillRect(4, 2, 8, 4);
            ctx.fillStyle = '#dd4411';
            ctx.fillRect(3, 5, 3, 3);
            ctx.fillRect(9, 4, 3, 2);
        });

        // Winter tree (bare)
        this.sprites.treeWinter = this.createSprite(16, 20, (ctx) => {
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(6, 10, 4, 10);
            // Branches
            ctx.fillRect(3, 6, 3, 1);
            ctx.fillRect(10, 6, 3, 1);
            ctx.fillRect(4, 3, 2, 1);
            ctx.fillRect(10, 3, 2, 1);
            ctx.fillRect(5, 9, 1, 1);
            ctx.fillRect(10, 8, 1, 1);
            // Snow on branches
            ctx.fillStyle = '#eef';
            ctx.fillRect(3, 5, 3, 1);
            ctx.fillRect(10, 5, 3, 1);
        });

        // Bush
        this.sprites.bush = this.createSprite(10, 8, (ctx) => {
            ctx.fillStyle = '#3a7a2a';
            ctx.fillRect(1, 2, 8, 6);
            ctx.fillRect(3, 0, 4, 3);
            ctx.fillStyle = '#4a9a3a';
            ctx.fillRect(2, 3, 3, 2);
        });
    }

    // ===== EFFECTS =====
    generateEffects() {
        // Raindrop
        this.sprites.raindrop = this.createSprite(2, 8, (ctx) => {
            ctx.fillStyle = 'rgba(100,160,255,0.6)';
            ctx.fillRect(0, 0, 1, 8);
            ctx.fillRect(1, 1, 1, 6);
        });

        // Snowflake
        this.sprites.snowflake = this.createSprite(4, 4, (ctx) => {
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(1, 0, 2, 4);
            ctx.fillRect(0, 1, 4, 2);
        });

        // Lightning bolt
        this.sprites.lightning = this.createSprite(12, 32, (ctx) => {
            ctx.fillStyle = '#ffff44';
            ctx.fillRect(6, 0, 3, 6);
            ctx.fillRect(4, 6, 3, 4);
            ctx.fillRect(6, 10, 3, 6);
            ctx.fillRect(3, 16, 3, 4);
            ctx.fillRect(5, 20, 3, 6);
            ctx.fillRect(4, 26, 2, 6);
        });

        // Sparkle (for bless/miracle)
        this.sprites.sparkle = this.createSprite(8, 8, (ctx) => {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(3, 0, 2, 8);
            ctx.fillRect(0, 3, 8, 2);
            ctx.fillStyle = '#fff';
            ctx.fillRect(3, 3, 2, 2);
        });

        // Skull (for plague)
        this.sprites.skull = this.createSprite(8, 8, (ctx) => {
            ctx.fillStyle = '#aaa';
            ctx.fillRect(1, 0, 6, 5);
            ctx.fillRect(2, 5, 4, 2);
            // Eyes
            ctx.fillStyle = '#333';
            ctx.fillRect(2, 2, 2, 2);
            ctx.fillRect(5, 2, 2, 2);
            // Teeth
            ctx.fillStyle = '#ccc';
            ctx.fillRect(3, 5, 1, 1);
            ctx.fillRect(5, 5, 1, 1);
        });

        // Fire
        this.sprites.fire = this.createSprite(8, 10, (ctx) => {
            ctx.fillStyle = '#ff4400';
            ctx.fillRect(2, 4, 4, 6);
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(1, 6, 6, 4);
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(3, 2, 2, 4);
            ctx.fillStyle = '#ffff44';
            ctx.fillRect(3, 3, 2, 2);
        });
    }

    get(name) {
        return this.sprites[name] || null;
    }
}
