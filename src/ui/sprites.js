// Runtime pixel art sprite generator - Enhanced diorama style
// Generates all game sprites programmatically with rich detail

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
        this.generateVehicles();
        this.generated = true;
    }

    createSprite(width, height, drawFn) {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        drawFn(ctx, width, height);
        return c;
    }

    // ===== PEOPLE (larger, more detailed) =====
    generatePeople() {
        // Male adult - 16x20
        this.sprites.maleAdult = this.createSprite(16, 20, (ctx) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(8, 18, 5, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Legs
            ctx.fillStyle = '#2a4a7a';
            ctx.fillRect(5, 15, 3, 4);
            ctx.fillRect(9, 15, 3, 4);
            // Body
            ctx.fillStyle = '#3366aa';
            ctx.fillRect(4, 9, 9, 7);
            // Arms
            ctx.fillStyle = '#3060a0';
            ctx.fillRect(2, 10, 2, 5);
            ctx.fillRect(13, 10, 2, 5);
            // Hands
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(2, 14, 2, 2);
            ctx.fillRect(13, 14, 2, 2);
            // Head
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(4, 1, 8, 8);
            // Hair
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(4, 1, 8, 3);
            ctx.fillRect(4, 1, 1, 4);
            // Eyes
            ctx.fillStyle = '#222';
            ctx.fillRect(6, 5, 1, 1);
            ctx.fillRect(10, 5, 1, 1);
            // Mouth
            ctx.fillStyle = '#cc8877';
            ctx.fillRect(7, 7, 3, 1);
            // Collar
            ctx.fillStyle = '#fff';
            ctx.fillRect(6, 9, 5, 1);
        });

        // Female adult - 16x20
        this.sprites.femaleAdult = this.createSprite(16, 20, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(8, 18, 5, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Legs
            ctx.fillStyle = '#aa3366';
            ctx.fillRect(5, 16, 2, 3);
            ctx.fillRect(9, 16, 2, 3);
            // Dress
            ctx.fillStyle = '#cc4488';
            ctx.fillRect(4, 9, 9, 5);
            ctx.fillRect(3, 12, 11, 5);
            // Dress highlight
            ctx.fillStyle = '#dd5599';
            ctx.fillRect(5, 10, 3, 3);
            // Arms
            ctx.fillStyle = '#cc4488';
            ctx.fillRect(2, 10, 2, 4);
            ctx.fillRect(13, 10, 2, 4);
            // Hands
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(2, 13, 2, 2);
            ctx.fillRect(13, 13, 2, 2);
            // Head
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(4, 1, 8, 8);
            // Hair (long)
            ctx.fillStyle = '#4a2a0a';
            ctx.fillRect(4, 0, 8, 3);
            ctx.fillRect(3, 1, 1, 7);
            ctx.fillRect(12, 1, 1, 7);
            ctx.fillRect(4, 0, 1, 5);
            // Eyes
            ctx.fillStyle = '#222';
            ctx.fillRect(6, 5, 1, 1);
            ctx.fillRect(10, 5, 1, 1);
            // Lips
            ctx.fillStyle = '#dd6677';
            ctx.fillRect(7, 7, 3, 1);
        });

        // Child - 12x16
        this.sprites.child = this.createSprite(12, 16, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(6, 14, 4, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Legs
            ctx.fillStyle = '#558833';
            ctx.fillRect(3, 11, 2, 3);
            ctx.fillRect(7, 11, 2, 3);
            // Body
            ctx.fillStyle = '#66aa44';
            ctx.fillRect(3, 7, 6, 5);
            // Arms
            ctx.fillStyle = '#66aa44';
            ctx.fillRect(1, 7, 2, 3);
            ctx.fillRect(9, 7, 2, 3);
            // Head (bigger)
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(2, 0, 8, 7);
            // Hair
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(2, 0, 8, 2);
            // Eyes (bigger/rounder)
            ctx.fillStyle = '#222';
            ctx.fillRect(4, 3, 2, 2);
            ctx.fillRect(7, 3, 2, 2);
            ctx.fillStyle = '#fff';
            ctx.fillRect(4, 3, 1, 1);
            ctx.fillRect(7, 3, 1, 1);
            // Cheeks
            ctx.fillStyle = 'rgba(255,150,150,0.3)';
            ctx.fillRect(3, 5, 2, 1);
            ctx.fillRect(8, 5, 2, 1);
        });

        // Walking frame
        this.sprites.maleWalk = this.createSprite(16, 20, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(8, 18, 5, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Walking legs (spread)
            ctx.fillStyle = '#2a4a7a';
            ctx.fillRect(3, 15, 3, 4);
            ctx.fillRect(10, 15, 3, 4);
            // Body
            ctx.fillStyle = '#3366aa';
            ctx.fillRect(4, 9, 9, 7);
            // Arms (swinging)
            ctx.fillStyle = '#3060a0';
            ctx.fillRect(1, 9, 2, 5);
            ctx.fillRect(13, 11, 2, 5);
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(1, 13, 2, 2);
            ctx.fillRect(13, 15, 2, 2);
            // Head
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(4, 1, 8, 8);
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(4, 1, 8, 3);
            ctx.fillRect(4, 1, 1, 4);
            ctx.fillStyle = '#222';
            ctx.fillRect(6, 5, 1, 1);
            ctx.fillRect(10, 5, 1, 1);
            ctx.fillStyle = '#cc8877';
            ctx.fillRect(7, 7, 3, 1);
            ctx.fillStyle = '#fff';
            ctx.fillRect(6, 9, 5, 1);
        });

        // Sleeping
        this.sprites.sleeping = this.createSprite(20, 12, (ctx) => {
            // Lying down
            ctx.fillStyle = '#3366aa';
            ctx.fillRect(5, 4, 10, 5);
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(0, 4, 5, 5);
            // Blanket
            ctx.fillStyle = '#556';
            ctx.fillRect(4, 3, 12, 1);
            ctx.fillRect(4, 9, 12, 1);
            ctx.fillStyle = '#667';
            ctx.fillRect(4, 4, 12, 5);
            ctx.globalAlpha = 0.5;
            ctx.fillRect(4, 4, 12, 5);
            ctx.globalAlpha = 1;
            // Zzz
            ctx.fillStyle = '#aaccff';
            ctx.font = '7px sans-serif';
            ctx.fillText('z', 16, 3);
            ctx.fillText('z', 17, 6);
        });
    }

    // ===== BUILDINGS (larger, with 3D shading, more detail) =====
    generateBuildings() {
        // Hut - 32x32
        this.sprites.HUT = this.createSprite(32, 32, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(4, 26, 26, 6);
            // Base walls
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(5, 16, 22, 14);
            // Wall shading (left lighter, right darker)
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(5, 16, 11, 14);
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.fillRect(16, 16, 11, 14);
            // Door
            ctx.fillStyle = '#5a4010';
            ctx.fillRect(12, 21, 6, 9);
            ctx.fillStyle = '#4a3008';
            ctx.fillRect(12, 21, 6, 1);
            // Straw roof
            ctx.fillStyle = '#aa8833';
            for (let i = 0; i < 10; i++) {
                const shade = i < 5 ? '#bb9944' : '#997722';
                ctx.fillStyle = shade;
                ctx.fillRect(4 + i, 16 - i * 1.2, 24 - i * 2, 2);
            }
            // Roof texture lines
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(8, 10, 16, 1);
            ctx.fillRect(10, 8, 12, 1);
            // Smoke hole
            ctx.fillStyle = '#887722';
            ctx.fillRect(14, 4, 4, 2);
        });

        // House - 32x36
        this.sprites.HOUSE = this.createSprite(32, 36, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(3, 31, 28, 5);
            // Walls
            ctx.fillStyle = '#d4b892';
            ctx.fillRect(3, 16, 26, 18);
            // Wall shading
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(3, 16, 13, 18);
            ctx.fillStyle = 'rgba(0,0,0,0.06)';
            ctx.fillRect(16, 16, 13, 18);
            // Roof
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.moveTo(0, 18);
            ctx.lineTo(16, 3);
            ctx.lineTo(32, 18);
            ctx.fill();
            // Roof highlight
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.moveTo(0, 18);
            ctx.lineTo(16, 3);
            ctx.lineTo(16, 18);
            ctx.fill();
            // Chimney
            ctx.fillStyle = '#8a5533';
            ctx.fillRect(22, 5, 4, 11);
            ctx.fillStyle = '#9a6644';
            ctx.fillRect(22, 5, 4, 2);
            // Windows with glow
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(7, 20, 5, 5);
            ctx.fillRect(20, 20, 5, 5);
            // Window frame
            ctx.fillStyle = '#654321';
            ctx.fillRect(9, 20, 1, 5);
            ctx.fillRect(7, 22, 5, 1);
            ctx.fillRect(22, 20, 1, 5);
            ctx.fillRect(20, 22, 5, 1);
            // Window shine
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(7, 20, 2, 2);
            ctx.fillRect(20, 20, 2, 2);
            // Door
            ctx.fillStyle = '#654321';
            ctx.fillRect(13, 25, 6, 9);
            ctx.fillStyle = '#7a5331';
            ctx.fillRect(13, 25, 6, 1);
            // Doorknob
            ctx.fillStyle = '#daa520';
            ctx.fillRect(17, 29, 1, 1);
            // Flower box
            ctx.fillStyle = '#6a4a2a';
            ctx.fillRect(6, 25, 7, 2);
            ctx.fillStyle = '#ff6688';
            ctx.fillRect(7, 24, 2, 1);
            ctx.fillStyle = '#ffaa44';
            ctx.fillRect(10, 24, 2, 1);
        });

        // Farm - 64x64
        this.sprites.FARM = this.createSprite(64, 64, (ctx) => {
            // Dirt field
            ctx.fillStyle = '#7a6a30';
            ctx.fillRect(2, 8, 60, 54);
            // Plowed rows with crop detail
            for (let row = 0; row < 7; row++) {
                const ry = 10 + row * 8;
                // Furrow
                ctx.fillStyle = '#6a5a28';
                ctx.fillRect(3, ry + 6, 58, 2);
                // Soil mound
                ctx.fillStyle = '#8a7a3a';
                ctx.fillRect(3, ry, 58, 6);
                // Crops
                ctx.fillStyle = '#44bb22';
                for (let i = 0; i < 12; i++) {
                    ctx.fillRect(5 + i * 5, ry + 1, 3, 4);
                    // Darker leaves
                    ctx.fillStyle = '#339918';
                    ctx.fillRect(5 + i * 5, ry + 1, 1, 2);
                    ctx.fillStyle = '#44bb22';
                }
            }
            // Fence (wooden posts)
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(0, 0, 64, 3);
            ctx.fillRect(0, 61, 64, 3);
            ctx.fillRect(0, 0, 3, 64);
            ctx.fillRect(61, 0, 3, 64);
            // Fence rails
            ctx.fillStyle = '#9a7a24';
            ctx.fillRect(0, 6, 64, 1);
            ctx.fillRect(0, 58, 64, 1);
            // Small barn
            ctx.fillStyle = '#8a5533';
            ctx.fillRect(48, 2, 14, 10);
            ctx.fillStyle = '#aa3333';
            ctx.fillRect(48, 0, 14, 4);
        });

        // Temple - 64x56
        this.sprites.TEMPLE = this.createSprite(64, 56, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(6, 48, 54, 8);
            // Base platform (3 tiers)
            ctx.fillStyle = '#d4c49a';
            ctx.fillRect(4, 44, 56, 8);
            ctx.fillStyle = '#c4b48a';
            ctx.fillRect(8, 40, 48, 4);
            ctx.fillStyle = '#b4a47a';
            ctx.fillRect(12, 38, 40, 3);
            // Pillars with detail
            ctx.fillStyle = '#e8dcc8';
            for (let i = 0; i < 5; i++) {
                const px = 14 + i * 9;
                ctx.fillRect(px, 20, 5, 22);
                // Capital
                ctx.fillStyle = '#d8ccb8';
                ctx.fillRect(px - 1, 19, 7, 2);
                ctx.fillRect(px - 1, 40, 7, 2);
                ctx.fillStyle = '#e8dcc8';
            }
            // Architrave
            ctx.fillStyle = '#c4b08a';
            ctx.fillRect(10, 17, 44, 3);
            // Roof (pediment)
            ctx.fillStyle = '#c4a040';
            ctx.beginPath();
            ctx.moveTo(6, 20);
            ctx.lineTo(32, 4);
            ctx.lineTo(58, 20);
            ctx.fill();
            // Roof highlight
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.beginPath();
            ctx.moveTo(6, 20);
            ctx.lineTo(32, 4);
            ctx.lineTo(32, 20);
            ctx.fill();
            // Gold orb with glow
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(32, 4, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,215,0,0.2)';
            ctx.beginPath();
            ctx.arc(32, 4, 7, 0, Math.PI * 2);
            ctx.fill();
            // Interior glow
            ctx.fillStyle = 'rgba(255,200,50,0.08)';
            ctx.fillRect(14, 22, 36, 18);
        });

        // School - 32x36
        this.sprites.SCHOOL = this.createSprite(32, 36, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(2, 31, 30, 5);
            // Building
            ctx.fillStyle = '#4682B4';
            ctx.fillRect(2, 12, 28, 22);
            // Roof/top
            ctx.fillStyle = '#3a6a9a';
            ctx.fillRect(2, 12, 28, 4);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(2, 12, 14, 22);
            // Windows (3 columns)
            ctx.fillStyle = '#87CEEB';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(5 + i * 9, 18, 5, 5);
                ctx.fillStyle = '#fff';
                ctx.fillRect(5 + i * 9, 18, 2, 2);
                ctx.fillStyle = '#87CEEB';
            }
            // Door
            ctx.fillStyle = '#2a4a6a';
            ctx.fillRect(12, 26, 8, 8);
            ctx.fillStyle = '#3a5a7a';
            ctx.fillRect(12, 26, 8, 1);
            // Bell tower
            ctx.fillStyle = '#3a6a9a';
            ctx.fillRect(12, 6, 8, 6);
            ctx.fillStyle = '#daa520';
            ctx.fillRect(14, 8, 4, 4);
            // Flag
            ctx.fillStyle = '#cc3333';
            ctx.fillRect(18, 2, 6, 4);
            ctx.fillStyle = '#666';
            ctx.fillRect(17, 2, 1, 10);
        });

        // Market - 64x56
        this.sprites.MARKET = this.createSprite(64, 56, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(4, 48, 58, 8);
            // Building base
            ctx.fillStyle = '#CD853F';
            ctx.fillRect(4, 28, 56, 24);
            // Stalls
            ctx.fillStyle = '#b47530';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(6 + i * 14, 32, 12, 18);
            }
            // Colorful awnings
            const colors = ['#cc3333', '#3366cc', '#33aa33', '#ccaa33'];
            const colorsDark = ['#aa2222', '#2255aa', '#228822', '#aa8822'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = colors[i];
                ctx.fillRect(4 + i * 14, 22, 14, 8);
                ctx.fillStyle = colorsDark[i];
                ctx.fillRect(4 + i * 14, 28, 14, 2);
                // Scalloped edge
                for (let j = 0; j < 4; j++) {
                    ctx.fillStyle = colors[i];
                    ctx.beginPath();
                    ctx.arc(7 + i * 14 + j * 4, 30, 2, 0, Math.PI);
                    ctx.fill();
                }
            }
            // Goods on display
            const goodColors = ['#ff6633', '#33cc66', '#cc9933', '#9966cc'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = goodColors[i];
                ctx.fillRect(8 + i * 14, 35, 6, 5);
                ctx.fillRect(10 + i * 14, 42, 5, 4);
            }
        });

        // Castle - 96x96
        this.sprites.CASTLE = this.createSprite(96, 96, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(8, 86, 84, 10);
            // Main wall
            ctx.fillStyle = '#808080';
            ctx.fillRect(16, 36, 64, 54);
            // Wall texture
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect(16, 36, 32, 54);
            ctx.fillStyle = 'rgba(0,0,0,0.04)';
            ctx.fillRect(48, 36, 32, 54);
            // Towers
            ctx.fillStyle = '#707070';
            ctx.fillRect(6, 20, 22, 72);
            ctx.fillRect(68, 20, 22, 72);
            // Tower shading
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(6, 20, 11, 72);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(68, 20, 11, 72);
            // Tower tops (battlements)
            ctx.fillStyle = '#606060';
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(6 + i * 5, 16, 3, 5);
                ctx.fillRect(68 + i * 5, 16, 3, 5);
            }
            // Center battlements
            ctx.fillStyle = '#707070';
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(18 + i * 8, 32, 5, 5);
            }
            // Gate arch
            ctx.fillStyle = '#4a3a2a';
            ctx.fillRect(36, 58, 24, 34);
            ctx.fillStyle = '#3a2a1a';
            ctx.beginPath();
            ctx.arc(48, 58, 12, Math.PI, 0);
            ctx.fill();
            // Portcullis lines
            ctx.fillStyle = '#5a4a3a';
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(38 + i * 5, 58, 1, 34);
            }
            // Windows (arrow slits)
            ctx.fillStyle = '#333';
            ctx.fillRect(24, 48, 3, 8);
            ctx.fillRect(70, 48, 3, 8);
            // Tower windows
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(13, 40, 5, 7);
            ctx.fillRect(75, 40, 5, 7);
            // Flags
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(14, 6, 8, 6);
            ctx.fillRect(74, 6, 8, 6);
            ctx.fillStyle = '#5a5a5a';
            ctx.fillRect(13, 4, 1, 16);
            ctx.fillRect(73, 4, 1, 16);
            // Center flag
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(46, 26, 8, 6);
            ctx.fillStyle = '#5a5a5a';
            ctx.fillRect(45, 22, 1, 14);
        });

        // Church - 32x42
        this.sprites.CHURCH = this.createSprite(32, 42, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(3, 36, 28, 6);
            // Building
            ctx.fillStyle = '#F5F5DC';
            ctx.fillRect(3, 18, 26, 22);
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(3, 18, 13, 22);
            // Steeple
            ctx.fillStyle = '#e8e0c8';
            ctx.fillRect(10, 6, 12, 14);
            // Steeple roof
            ctx.fillStyle = '#8a7a5a';
            ctx.beginPath();
            ctx.moveTo(8, 8);
            ctx.lineTo(16, 0);
            ctx.lineTo(24, 8);
            ctx.fill();
            // Cross
            ctx.fillStyle = '#daa520';
            ctx.fillRect(15, -2, 2, 6);
            ctx.fillRect(13, 0, 6, 2);
            // Rose window (circular stained glass)
            ctx.fillStyle = '#4488cc';
            ctx.beginPath();
            ctx.arc(16, 24, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#cc4444';
            ctx.beginPath();
            ctx.arc(16, 24, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#44cc44';
            ctx.fillRect(14, 22, 1, 4);
            ctx.fillRect(17, 22, 1, 4);
            // Side windows
            ctx.fillStyle = '#5599cc';
            ctx.fillRect(5, 24, 3, 6);
            ctx.fillRect(24, 24, 3, 6);
            // Door
            ctx.fillStyle = '#654321';
            ctx.fillRect(12, 32, 8, 8);
            ctx.fillStyle = '#7a5331';
            ctx.beginPath();
            ctx.arc(16, 32, 4, Math.PI, 0);
            ctx.fill();
        });

        // Granary - 32x32
        this.sprites.GRANARY = this.createSprite(32, 32, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(4, 26, 26, 6);
            // Building
            ctx.fillStyle = '#DAA520';
            ctx.fillRect(4, 12, 24, 18);
            // Roof
            ctx.fillStyle = '#c4920a';
            ctx.fillRect(2, 10, 28, 4);
            // Wall highlight
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(4, 14, 12, 16);
            // Grain sacks
            ctx.fillStyle = '#e8d8a0';
            ctx.fillRect(7, 20, 6, 5);
            ctx.fillRect(19, 20, 6, 5);
            ctx.fillStyle = '#d8c890';
            ctx.fillRect(12, 22, 8, 3);
            // Door
            ctx.fillStyle = '#b8860b';
            ctx.fillRect(12, 24, 8, 6);
            ctx.fillStyle = '#a87600';
            ctx.fillRect(12, 24, 8, 1);
        });

        // Workshop - 32x32
        this.sprites.WORKSHOP = this.createSprite(32, 32, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(3, 26, 28, 6);
            // Building
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(3, 10, 26, 20);
            // Roof
            ctx.fillStyle = '#6a5535';
            ctx.fillRect(1, 8, 30, 4);
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(3, 12, 13, 18);
            // Chimney
            ctx.fillStyle = '#555';
            ctx.fillRect(22, 2, 6, 8);
            ctx.fillStyle = '#666';
            ctx.fillRect(22, 2, 6, 2);
            // Smoke puffs
            ctx.fillStyle = 'rgba(150,150,150,0.4)';
            ctx.beginPath();
            ctx.arc(25, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            // Anvil
            ctx.fillStyle = '#444';
            ctx.fillRect(6, 20, 6, 3);
            ctx.fillRect(5, 23, 8, 1);
            // Hammer
            ctx.fillStyle = '#654321';
            ctx.fillRect(8, 17, 1, 3);
            ctx.fillStyle = '#888';
            ctx.fillRect(7, 16, 3, 2);
            // Door
            ctx.fillStyle = '#5a4025';
            ctx.fillRect(14, 20, 6, 10);
            // Forge glow
            ctx.fillStyle = 'rgba(255,100,20,0.15)';
            ctx.fillRect(4, 14, 10, 8);
        });

        // Factory - 64x56
        this.sprites.FACTORY = this.createSprite(64, 56, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(4, 48, 60, 8);
            // Main building
            ctx.fillStyle = '#778899';
            ctx.fillRect(4, 24, 56, 28);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(4, 24, 28, 28);
            // Saw-tooth roof
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = '#667788';
                ctx.beginPath();
                ctx.moveTo(4 + i * 20, 24);
                ctx.lineTo(14 + i * 20, 18);
                ctx.lineTo(24 + i * 20, 24);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.beginPath();
                ctx.moveTo(4 + i * 20, 24);
                ctx.lineTo(14 + i * 20, 18);
                ctx.lineTo(14 + i * 20, 24);
                ctx.fill();
            }
            // Smokestacks (3)
            ctx.fillStyle = '#555';
            ctx.fillRect(8, 4, 8, 20);
            ctx.fillRect(26, 8, 7, 16);
            ctx.fillRect(48, 6, 8, 18);
            // Smokestack rings
            ctx.fillStyle = '#666';
            ctx.fillRect(7, 4, 10, 2);
            ctx.fillRect(25, 8, 9, 2);
            ctx.fillRect(47, 6, 10, 2);
            // Smoke clouds
            ctx.fillStyle = 'rgba(120,120,120,0.35)';
            ctx.beginPath(); ctx.arc(12, 2, 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(52, 3, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(30, 5, 4, 0, Math.PI * 2); ctx.fill();
            // Windows (industrial)
            ctx.fillStyle = '#aab8cc';
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(8 + i * 11, 30, 7, 6);
                // Window panes
                ctx.fillStyle = '#99a8bb';
                ctx.fillRect(11 + i * 11, 30, 1, 6);
                ctx.fillStyle = '#aab8cc';
            }
            // Large door
            ctx.fillStyle = '#556677';
            ctx.fillRect(22, 40, 16, 12);
            ctx.fillStyle = '#667788';
            ctx.fillRect(22, 40, 16, 2);
        });

        // Hospital - 64x56
        this.sprites.HOSPITAL = this.createSprite(64, 56, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(4, 48, 58, 8);
            // Building
            ctx.fillStyle = '#f4f4f4';
            ctx.fillRect(4, 14, 56, 38);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(4, 14, 28, 38);
            // Top floor accent
            ctx.fillStyle = '#e8e8e8';
            ctx.fillRect(4, 14, 56, 4);
            // Red cross (large, centered)
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(26, 18, 12, 3);
            ctx.fillRect(29, 15, 6, 9);
            // Windows (2 rows, 4 columns)
            ctx.fillStyle = '#87CEEB';
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 5; col++) {
                    ctx.fillRect(7 + col * 11, 28 + row * 10, 7, 6);
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(7 + col * 11, 28 + row * 10, 3, 3);
                    ctx.fillStyle = '#87CEEB';
                }
            }
            // Entrance
            ctx.fillStyle = '#ccc';
            ctx.fillRect(22, 44, 16, 8);
            ctx.fillStyle = '#ddd';
            ctx.fillRect(22, 44, 16, 2);
            // Ambulance bay
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(28, 46, 4, 1);
            ctx.fillRect(29, 45, 2, 3);
        });

        // Skyscraper - 64x96
        this.sprites.SKYSCRAPER = this.createSprite(64, 96, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(10, 88, 48, 8);
            // Building body
            ctx.fillStyle = '#a0b4cc';
            ctx.fillRect(12, 10, 40, 82);
            // Facade shading
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(12, 10, 20, 82);
            ctx.fillStyle = 'rgba(0,0,0,0.04)';
            ctx.fillRect(32, 10, 20, 82);
            // Glass panels (many rows)
            for (let row = 0; row < 12; row++) {
                for (let col = 0; col < 4; col++) {
                    ctx.fillStyle = '#88aacc';
                    ctx.fillRect(15 + col * 10, 14 + row * 7, 7, 5);
                    // Reflection
                    ctx.fillStyle = 'rgba(200,230,255,0.2)';
                    ctx.fillRect(15 + col * 10, 14 + row * 7, 3, 2);
                }
            }
            // Top section
            ctx.fillStyle = '#90a4bc';
            ctx.fillRect(18, 6, 28, 6);
            ctx.fillRect(24, 2, 16, 6);
            // Antenna
            ctx.fillStyle = '#777';
            ctx.fillRect(31, 0, 2, 4);
            // Antenna light
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(31, 0, 2, 1);
            // Entrance
            ctx.fillStyle = '#667788';
            ctx.fillRect(22, 82, 18, 10);
            // Entrance canopy
            ctx.fillStyle = '#778899';
            ctx.fillRect(20, 80, 22, 3);
            // Entrance light
            ctx.fillStyle = 'rgba(255,230,150,0.2)';
            ctx.fillRect(22, 82, 18, 10);
        });
    }

    // ===== ANIMALS (larger, more detailed) =====
    generateAnimals() {
        this.sprites.RABBIT = this.createSprite(12, 12, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.beginPath();
            ctx.ellipse(6, 10, 4, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#D2B48C';
            ctx.fillRect(3, 5, 6, 5);
            // Ears
            ctx.fillStyle = '#c4a47c';
            ctx.fillRect(3, 0, 2, 5);
            ctx.fillRect(7, 0, 2, 5);
            ctx.fillStyle = '#e0bba0';
            ctx.fillRect(4, 1, 1, 3);
            ctx.fillRect(8, 1, 1, 3);
            // Tail
            ctx.fillStyle = '#fff';
            ctx.fillRect(9, 6, 3, 3);
            // Eye
            ctx.fillStyle = '#111';
            ctx.fillRect(2, 6, 1, 1);
            // Nose
            ctx.fillStyle = '#cc9988';
            ctx.fillRect(1, 7, 1, 1);
        });

        this.sprites.DEER = this.createSprite(16, 14, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.beginPath();
            ctx.ellipse(8, 13, 5, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Body
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(3, 4, 10, 6);
            // Head
            ctx.fillStyle = '#9a7924';
            ctx.fillRect(0, 2, 4, 5);
            // Belly
            ctx.fillStyle = '#aa8a3a';
            ctx.fillRect(5, 8, 6, 2);
            // Legs
            ctx.fillStyle = '#7a5a10';
            ctx.fillRect(4, 10, 2, 3);
            ctx.fillRect(7, 10, 2, 3);
            ctx.fillRect(10, 10, 2, 3);
            // Antlers
            ctx.fillStyle = '#654321';
            ctx.fillRect(0, 0, 1, 2);
            ctx.fillRect(2, 0, 1, 2);
            ctx.fillRect(-1, 0, 1, 1);
            ctx.fillRect(3, 0, 1, 1);
            // Eye
            ctx.fillStyle = '#111';
            ctx.fillRect(1, 4, 1, 1);
            // Tail
            ctx.fillStyle = '#aa8934';
            ctx.fillRect(13, 4, 2, 2);
        });

        this.sprites.WOLF = this.createSprite(16, 14, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.beginPath();
            ctx.ellipse(8, 13, 5, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#696969';
            ctx.fillRect(3, 4, 10, 6);
            ctx.fillRect(0, 3, 4, 5);
            // Darker back
            ctx.fillStyle = '#555';
            ctx.fillRect(5, 4, 6, 2);
            // Legs
            ctx.fillStyle = '#555';
            ctx.fillRect(4, 10, 2, 3);
            ctx.fillRect(7, 10, 2, 3);
            ctx.fillRect(10, 10, 2, 3);
            // Ears
            ctx.fillStyle = '#5a5a5a';
            ctx.fillRect(0, 0, 2, 3);
            ctx.fillRect(2, 1, 1, 2);
            // Eye
            ctx.fillStyle = '#ff3';
            ctx.fillRect(1, 4, 1, 1);
            // Snout
            ctx.fillStyle = '#777';
            ctx.fillRect(-1, 5, 2, 2);
            // Tail
            ctx.fillStyle = '#696969';
            ctx.fillRect(13, 3, 3, 2);
            ctx.fillRect(14, 2, 2, 1);
        });

        this.sprites.BEAR = this.createSprite(18, 16, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.beginPath();
            ctx.ellipse(9, 15, 6, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Body (bulky)
            ctx.fillStyle = '#5C4033';
            ctx.fillRect(3, 4, 12, 8);
            // Head
            ctx.fillRect(0, 2, 5, 7);
            // Snout
            ctx.fillStyle = '#7a5a43';
            ctx.fillRect(-1, 5, 2, 3);
            // Belly
            ctx.fillStyle = '#6a5043';
            ctx.fillRect(6, 8, 6, 4);
            // Legs
            ctx.fillStyle = '#4a3028';
            ctx.fillRect(4, 12, 3, 3);
            ctx.fillRect(8, 12, 3, 3);
            ctx.fillRect(12, 12, 3, 3);
            // Ears
            ctx.fillStyle = '#5C4033';
            ctx.fillRect(0, 0, 2, 2);
            ctx.fillRect(3, 0, 2, 2);
            // Eye
            ctx.fillStyle = '#111';
            ctx.fillRect(1, 4, 1, 1);
            // Nose
            ctx.fillStyle = '#222';
            ctx.fillRect(-1, 5, 1, 1);
        });

        this.sprites.BIRD = this.createSprite(10, 8, (ctx) => {
            ctx.fillStyle = '#4169E1';
            ctx.fillRect(3, 3, 5, 3);
            // Wings
            ctx.fillRect(0, 1, 3, 3);
            ctx.fillRect(8, 1, 2, 3);
            // Wing detail
            ctx.fillStyle = '#5579ff';
            ctx.fillRect(1, 2, 2, 1);
            ctx.fillRect(8, 2, 1, 1);
            // Head
            ctx.fillStyle = '#3355cc';
            ctx.fillRect(4, 0, 3, 3);
            // Beak
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(3, 2, 1, 1);
            // Eye
            ctx.fillStyle = '#111';
            ctx.fillRect(4, 1, 1, 1);
            // Tail
            ctx.fillStyle = '#3355bb';
            ctx.fillRect(8, 4, 2, 2);
        });

        this.sprites.FISH = this.createSprite(10, 6, (ctx) => {
            ctx.fillStyle = '#00CED1';
            ctx.fillRect(3, 1, 5, 4);
            // Tail
            ctx.fillStyle = '#00aab0';
            ctx.fillRect(8, 0, 2, 2);
            ctx.fillRect(8, 4, 2, 2);
            // Head
            ctx.fillStyle = '#00dde2';
            ctx.fillRect(1, 2, 2, 2);
            // Eye
            ctx.fillStyle = '#111';
            ctx.fillRect(1, 2, 1, 1);
            // Fin
            ctx.fillStyle = '#00b8bd';
            ctx.fillRect(5, 0, 2, 1);
        });
    }

    // ===== TREES (richer, with depth) =====
    generateTrees() {
        // Deciduous tree - 24x28
        this.sprites.tree = this.createSprite(24, 28, (ctx) => {
            // Trunk
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(9, 18, 6, 10);
            // Trunk highlight
            ctx.fillStyle = '#6a4a2a';
            ctx.fillRect(9, 18, 3, 10);
            // Crown layers (sphere-like)
            ctx.fillStyle = '#2d7b2e';
            ctx.fillRect(2, 6, 20, 14);
            ctx.fillRect(4, 4, 16, 4);
            ctx.fillRect(6, 2, 12, 4);
            // Crown highlights
            ctx.fillStyle = '#3aaa3a';
            ctx.fillRect(4, 5, 5, 4);
            ctx.fillRect(14, 7, 4, 3);
            ctx.fillRect(8, 3, 3, 2);
            // Darker underside
            ctx.fillStyle = '#1a6a1a';
            ctx.fillRect(3, 14, 18, 4);
            // Light spots
            ctx.fillStyle = '#4abb4a';
            ctx.fillRect(7, 8, 2, 2);
            ctx.fillRect(15, 5, 2, 2);
        });

        // Pine tree - 20x30
        this.sprites.pine = this.createSprite(20, 30, (ctx) => {
            // Trunk
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(8, 22, 4, 8);
            // Layers (triangle shape, wider at bottom)
            const layers = [
                { y: 18, w: 14 },
                { y: 13, w: 11 },
                { y: 8, w: 8 },
                { y: 4, w: 5 },
                { y: 1, w: 3 },
            ];
            for (const { y, w } of layers) {
                ctx.fillStyle = '#1a6b1a';
                ctx.fillRect(10 - w / 2, y, w, 6);
                // Highlight left side
                ctx.fillStyle = '#2a8b2a';
                ctx.fillRect(10 - w / 2, y, Math.floor(w / 2), 3);
            }
            // Snow on tips (if winter, handled by key)
        });

        // Fall tree - 24x28
        this.sprites.treeFall = this.createSprite(24, 28, (ctx) => {
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(9, 18, 6, 10);
            ctx.fillStyle = '#6a4a2a';
            ctx.fillRect(9, 18, 3, 10);
            // Orange/red crown
            ctx.fillStyle = '#cc7722';
            ctx.fillRect(2, 6, 20, 14);
            ctx.fillRect(4, 4, 16, 4);
            ctx.fillRect(6, 2, 12, 4);
            // Red patches
            ctx.fillStyle = '#dd4411';
            ctx.fillRect(3, 7, 4, 4);
            ctx.fillRect(14, 5, 5, 3);
            ctx.fillRect(8, 10, 3, 3);
            // Yellow patches
            ctx.fillStyle = '#ddaa22';
            ctx.fillRect(7, 4, 3, 3);
            ctx.fillRect(16, 10, 3, 3);
            // Darker underside
            ctx.fillStyle = '#aa5511';
            ctx.fillRect(3, 14, 18, 4);
            // Falling leaves
            ctx.fillStyle = '#cc6622';
            ctx.fillRect(1, 20, 2, 2);
            ctx.fillRect(20, 16, 2, 2);
        });

        // Winter tree - 24x28
        this.sprites.treeWinter = this.createSprite(24, 28, (ctx) => {
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(9, 14, 6, 14);
            // Branches
            ctx.fillStyle = '#4a2a10';
            ctx.fillRect(4, 8, 4, 2);
            ctx.fillRect(16, 8, 4, 2);
            ctx.fillRect(5, 4, 3, 2);
            ctx.fillRect(15, 4, 3, 2);
            ctx.fillRect(3, 12, 3, 1);
            ctx.fillRect(18, 11, 3, 1);
            ctx.fillRect(7, 2, 2, 1);
            ctx.fillRect(14, 2, 2, 1);
            // Snow on branches
            ctx.fillStyle = '#eef';
            ctx.fillRect(4, 7, 4, 1);
            ctx.fillRect(16, 7, 4, 1);
            ctx.fillRect(5, 3, 3, 1);
            ctx.fillRect(15, 3, 3, 1);
            ctx.fillRect(3, 11, 3, 1);
            ctx.fillRect(18, 10, 3, 1);
            // Snow on trunk
            ctx.fillStyle = 'rgba(230,230,250,0.3)';
            ctx.fillRect(9, 14, 2, 3);
        });

        // Bush - 14x12
        this.sprites.bush = this.createSprite(14, 12, (ctx) => {
            ctx.fillStyle = '#3a7a2a';
            ctx.fillRect(2, 3, 10, 8);
            ctx.fillRect(4, 1, 6, 4);
            ctx.fillStyle = '#4a9a3a';
            ctx.fillRect(3, 4, 4, 3);
            ctx.fillRect(8, 5, 3, 2);
            ctx.fillStyle = '#2a6a1a';
            ctx.fillRect(2, 8, 10, 3);
        });
    }

    // ===== EFFECTS (enhanced) =====
    generateEffects() {
        this.sprites.raindrop = this.createSprite(2, 10, (ctx) => {
            ctx.fillStyle = 'rgba(100,160,255,0.6)';
            ctx.fillRect(0, 0, 1, 10);
            ctx.fillRect(1, 1, 1, 8);
        });

        this.sprites.snowflake = this.createSprite(6, 6, (ctx) => {
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(2, 0, 2, 6);
            ctx.fillRect(0, 2, 6, 2);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillRect(1, 1, 1, 1);
            ctx.fillRect(4, 1, 1, 1);
            ctx.fillRect(1, 4, 1, 1);
            ctx.fillRect(4, 4, 1, 1);
        });

        // Lightning bolt (larger)
        this.sprites.lightning = this.createSprite(16, 40, (ctx) => {
            ctx.fillStyle = '#ffff44';
            ctx.fillRect(8, 0, 4, 8);
            ctx.fillRect(5, 8, 4, 6);
            ctx.fillRect(8, 14, 4, 8);
            ctx.fillRect(4, 22, 4, 5);
            ctx.fillRect(6, 27, 4, 8);
            ctx.fillRect(5, 35, 3, 5);
            // Glow
            ctx.fillStyle = 'rgba(255,255,100,0.3)';
            ctx.fillRect(3, 0, 10, 40);
        });

        // Sparkle (larger, 4-point star)
        this.sprites.sparkle = this.createSprite(12, 12, (ctx) => {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(5, 0, 2, 12);
            ctx.fillRect(0, 5, 12, 2);
            // Diagonal
            ctx.fillRect(2, 2, 2, 2);
            ctx.fillRect(8, 2, 2, 2);
            ctx.fillRect(2, 8, 2, 2);
            ctx.fillRect(8, 8, 2, 2);
            // Center
            ctx.fillStyle = '#fff';
            ctx.fillRect(5, 5, 2, 2);
            // Outer glow
            ctx.fillStyle = 'rgba(255,215,0,0.2)';
            ctx.fillRect(3, 3, 6, 6);
        });

        // Skull (larger)
        this.sprites.skull = this.createSprite(12, 12, (ctx) => {
            ctx.fillStyle = '#bbb';
            ctx.fillRect(2, 0, 8, 7);
            ctx.fillRect(3, 7, 6, 3);
            // Eye sockets
            ctx.fillStyle = '#333';
            ctx.fillRect(3, 3, 3, 3);
            ctx.fillRect(7, 3, 3, 3);
            // Nose
            ctx.fillRect(5, 5, 2, 2);
            // Teeth
            ctx.fillStyle = '#ddd';
            ctx.fillRect(4, 7, 1, 2);
            ctx.fillRect(6, 7, 1, 2);
            ctx.fillRect(8, 7, 1, 2);
            // Dark edge
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(7, 0, 3, 7);
        });

        // Fire (larger, more animated-looking)
        this.sprites.fire = this.createSprite(12, 14, (ctx) => {
            ctx.fillStyle = '#ff4400';
            ctx.fillRect(3, 6, 6, 8);
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(1, 8, 10, 6);
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(4, 3, 4, 6);
            ctx.fillStyle = '#ffff44';
            ctx.fillRect(5, 4, 2, 3);
            // Tips
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(2, 4, 2, 3);
            ctx.fillRect(8, 5, 2, 2);
            // Glow
            ctx.fillStyle = 'rgba(255,100,0,0.15)';
            ctx.fillRect(0, 2, 12, 12);
        });
    }

    // ===== VEHICLES =====
    generateVehicles() {
        // Cart (medieval+)
        this.sprites.cart = this.createSprite(20, 14, (ctx) => {
            // Cart body (wooden)
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(3, 3, 14, 6);
            // Cart sides
            ctx.fillStyle = '#7a5a10';
            ctx.fillRect(3, 3, 14, 1);
            ctx.fillRect(3, 8, 14, 1);
            // Wheels
            ctx.fillStyle = '#5a4010';
            ctx.beginPath();
            ctx.arc(6, 11, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(14, 11, 3, 0, Math.PI * 2);
            ctx.fill();
            // Wheel centers
            ctx.fillStyle = '#8a6a20';
            ctx.fillRect(5, 10, 2, 2);
            ctx.fillRect(13, 10, 2, 2);
            // Handle
            ctx.fillStyle = '#654321';
            ctx.fillRect(0, 5, 3, 2);
            // Goods
            ctx.fillStyle = '#cc9933';
            ctx.fillRect(5, 1, 4, 3);
            ctx.fillStyle = '#aa7733';
            ctx.fillRect(10, 2, 3, 2);
        });

        // Car (modern era)
        this.sprites.car = this.createSprite(22, 12, (ctx) => {
            // Car body
            ctx.fillStyle = '#cc3333';
            ctx.fillRect(2, 3, 18, 5);
            // Roof
            ctx.fillStyle = '#bb2222';
            ctx.fillRect(6, 0, 10, 4);
            // Windshield
            ctx.fillStyle = '#aaccee';
            ctx.fillRect(7, 1, 4, 2);
            // Rear window
            ctx.fillStyle = '#99bbdd';
            ctx.fillRect(12, 1, 3, 2);
            // Wheels
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(6, 10, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(16, 10, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Wheel caps
            ctx.fillStyle = '#888';
            ctx.fillRect(5, 9, 2, 2);
            ctx.fillRect(15, 9, 2, 2);
            // Headlights
            ctx.fillStyle = '#ffee88';
            ctx.fillRect(0, 4, 2, 2);
            // Taillights
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(20, 4, 2, 2);
            // Body highlight
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(2, 3, 18, 2);
        });
    }

    get(name) {
        return this.sprites[name] || null;
    }
}
