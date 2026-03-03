// Three.js 3D Diorama Renderer - HD-2D Pixel Art Edition
// 3D terrain + 2D pixel art billboard sprites (Octopath Traveler style)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { TERRAIN, TERRAIN_HEIGHTS, TERRAIN_RGB, BUILDING_TYPE, ANIMAL_TYPE,
         NPC_STATE, PERSONALITY, GIANT_CONFIG, DINOSAUR_TYPE, VEHICLE_TYPE,
         WORLD_WIDTH, WORLD_HEIGHT, SEASON_TINTS } from '../core/constants.js';
import { generatePersonSprite, generateAnimalSprite, generateDinoSprite,
         generateGiantSprite, generateVehicleSprite, generateBuildingSprite,
         generateTreeSprite } from './pixelSprites.js';

// ===== Color Grading Shader =====
const ColorGradingShader = {
    uniforms: {
        tDiffuse: { value: null },
        saturation: { value: 1.2 },
        contrast: { value: 1.1 },
        brightness: { value: 0.02 },
        vignetteAmount: { value: 0.3 },
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float saturation;
        uniform float contrast;
        uniform float brightness;
        uniform float vignetteAmount;
        varying vec2 vUv;
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            color.rgb += brightness;
            color.rgb = (color.rgb - 0.5) * contrast + 0.5;
            float grey = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            color.rgb = mix(vec3(grey), color.rgb, saturation);
            color.r *= 1.03; color.g *= 1.01;
            vec2 uv = vUv * 2.0 - 1.0;
            float vig = 1.0 - dot(uv, uv) * vignetteAmount;
            color.rgb *= vig;
            gl_FragColor = color;
        }
    `
};

// ===== Sprite world-size definitions =====
const ANIMAL_SPRITE_SIZES = {
    RABBIT: { h: 0.4, cw: 12, ch: 14 },
    DEER:   { h: 0.7, cw: 16, ch: 18 },
    WOLF:   { h: 0.55, cw: 16, ch: 14 },
    BEAR:   { h: 0.65, cw: 16, ch: 16 },
    BIRD:   { h: 0.35, cw: 12, ch: 10 },
    FISH:   { h: 0.3, cw: 14, ch: 8 },
};

const DINO_SPRITE_SIZES = {
    TREX:        { h: 2.0, cw: 32, ch: 32 },
    BRONTO:      { h: 3.5, cw: 48, ch: 40 },
    RAPTOR:      { h: 0.9, cw: 20, ch: 20 },
    TRICERATOPS: { h: 1.6, cw: 28, ch: 24 },
    PTERANODON:  { h: 1.0, cw: 28, ch: 16 },
    STEGO:       { h: 1.4, cw: 28, ch: 22 },
};

const VEHICLE_SPRITE_SIZES = {
    CART:       { h: 0.6, cw: 24, ch: 16 },
    CARRIAGE:   { h: 0.6, cw: 24, ch: 16 },
    HORSE:      { h: 0.6, cw: 16, ch: 16 },
    TRAIN:      { h: 0.7, cw: 40, ch: 16 },
    CAR:        { h: 0.5, cw: 20, ch: 14 },
    BUS:        { h: 0.65, cw: 28, ch: 16 },
    FLYING_CAR: { h: 0.5, cw: 20, ch: 14 },
};

const BUILDING_SPRITE_SIZES = {
    HUT:        { h: 1.2, cw: 24, ch: 24 },
    HOUSE:      { h: 1.4, cw: 24, ch: 24 },
    FARM:       { h: 1.0, cw: 32, ch: 20 },
    GRANARY:    { h: 1.3, cw: 24, ch: 24 },
    TEMPLE:     { h: 2.0, cw: 32, ch: 28 },
    MARKET:     { h: 1.5, cw: 32, ch: 24 },
    SCHOOL:     { h: 1.4, cw: 24, ch: 24 },
    CASTLE:     { h: 2.5, cw: 40, ch: 32 },
    WORKSHOP:   { h: 1.3, cw: 24, ch: 24 },
    CHURCH:     { h: 1.8, cw: 24, ch: 28 },
    FACTORY:    { h: 1.5, cw: 32, ch: 24 },
    HOSPITAL:   { h: 1.5, cw: 28, ch: 24 },
    SKYSCRAPER: { h: 3.5, cw: 20, ch: 40 },
};

export class Renderer3D {
    constructor(game) {
        this.game = game;
        this.scene = null;
        this.threeRenderer = null;

        // Groups
        this.terrainGroup = new THREE.Group();
        this.waterGroup = new THREE.Group();
        this.buildingGroup = new THREE.Group();
        this.entityGroup = new THREE.Group();
        this.treeGroup = new THREE.Group();
        this.effectGroup = new THREE.Group();
        this.vehicleGroup = new THREE.Group();

        // Entity sprite maps
        this.personMeshes = new Map();
        this.animalMeshes = new Map();
        this.buildingMeshes = new Map();
        this.giantMeshes = new Map();
        this.dinoMeshes = new Map();
        this.vehicleMeshes = new Map();
        this.treeMeshes = [];

        // Lighting
        this.sunLight = null;
        this.ambientLight = null;
        this.hemiLight = null;

        // Water
        this.waterMesh = null;
        this.waterTime = 0;

        // Terrain
        this.terrainMesh = null;
        this.terrainTexture = null;
        this.lastSeason = -1;

        // Weather particles
        this.rainSystem = null;
        this.snowSystem = null;

        // Effects
        this.particles = [];
        this.shockwaves = [];
        this.screenFlashAlpha = 0;

        // Ghost preview for placement
        this.ghostMesh = null;

        // Frame counter
        this.frame = 0;

        // Raycaster for click detection
        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2();

        // Post-processing
        this.composer = null;
        this.bloomPass = null;
        this.colorGradingPass = null;

        // Environmental details
        this.grassInstances = null;
        this.dustParticles = null;
        this.fireflySystem = null;
    }

    init() {
        // WebGL Renderer
        this.threeRenderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.threeRenderer.setSize(window.innerWidth, window.innerHeight);
        this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.threeRenderer.shadowMap.enabled = true;
        this.threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.threeRenderer.toneMappingExposure = 1.3;

        // Insert WebGL canvas into DOM
        const container = document.getElementById('game-container');
        const oldCanvas = document.getElementById('game-canvas');
        if (oldCanvas) oldCanvas.style.display = 'none';
        this.threeRenderer.domElement.id = 'game-canvas-3d';
        this.threeRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;z-index:0;';
        container.insertBefore(this.threeRenderer.domElement, container.firstChild);
        this.game.canvas3d = this.threeRenderer.domElement;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.FogExp2(0xc8dce8, 0.0035);

        // Add all groups
        this.scene.add(this.terrainGroup);
        this.scene.add(this.waterGroup);
        this.scene.add(this.buildingGroup);
        this.scene.add(this.entityGroup);
        this.scene.add(this.treeGroup);
        this.scene.add(this.vehicleGroup);
        this.scene.add(this.effectGroup);

        this.setupLighting();
        this.buildTerrain();
        this.buildWater();
        this.buildInitialTrees();
        this.buildWeatherSystems();
        this.buildGrassField();
        this.buildDustParticles();
        this.buildFireflies();

        // Post-processing pipeline
        this.setupPostProcessing();

        // Safety render so user sees terrain immediately
        const cam = this.game.camera3d;
        if (cam && cam.threeCamera) {
            if (this.composer) {
                this.composer.render();
            } else {
                this.threeRenderer.render(this.scene, cam.threeCamera);
            }
        }

        window.addEventListener('resize', () => this.onResize());
    }

    setupPostProcessing() {
        const cam = this.game.camera3d;
        if (!cam || !cam.threeCamera) return;

        const w = window.innerWidth;
        const h = window.innerHeight;

        this.composer = new EffectComposer(this.threeRenderer);
        this.composer.addPass(new RenderPass(this.scene, cam.threeCamera));

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(w, h), 0.35, 0.6, 0.85);
        this.composer.addPass(this.bloomPass);

        this.colorGradingPass = new ShaderPass(ColorGradingShader);
        this.composer.addPass(this.colorGradingPass);
    }

    // ==================== LIGHTING ====================
    setupLighting() {
        this.ambientLight = new THREE.AmbientLight(0x606070, 0.5);
        this.scene.add(this.ambientLight);

        this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x556B2F, 0.6);
        this.scene.add(this.hemiLight);

        this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.8);
        this.sunLight.position.set(80, 120, 60);
        this.sunLight.castShadow = true;
        const s = this.sunLight.shadow;
        s.mapSize.width = 2048;
        s.mapSize.height = 2048;
        s.camera.near = 1;
        s.camera.far = 400;
        s.camera.left = -80;
        s.camera.right = 80;
        s.camera.top = 80;
        s.camera.bottom = -80;
        s.bias = -0.0005;
        s.normalBias = 0.02;
        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target);
    }

    updateLighting() {
        const t = this.game.timeOfDay;
        const cam = this.game.camera3d;
        if (!cam) return;

        const sunAngle = (t - 0.25) * Math.PI * 2;
        const sunHeight = Math.sin(sunAngle);
        const sunHorizontal = Math.cos(sunAngle);

        const cx = cam.targetX;
        const cz = cam.targetZ;

        this.sunLight.position.set(
            cx + sunHorizontal * 80,
            Math.max(5, sunHeight * 120),
            cz + 60
        );
        this.sunLight.target.position.set(cx, 0, cz);

        if (sunHeight > 0.1) {
            const warmth = Math.max(0, 1 - sunHeight);
            this.sunLight.color.setHSL(0.1 * warmth, 0.3, 0.95);
            this.sunLight.intensity = 1.5 + sunHeight * 0.5;
            this.ambientLight.intensity = 0.4 + sunHeight * 0.3;
            this.scene.background.setHSL(0.56, 0.6, 0.5 + sunHeight * 0.3);
            this.scene.fog.color.copy(this.scene.background);
        } else if (sunHeight > -0.2) {
            const factor = (sunHeight + 0.2) / 0.3;
            this.sunLight.color.setHSL(0.07, 0.8, 0.7);
            this.sunLight.intensity = 0.8 + factor * 0.7;
            this.ambientLight.intensity = 0.3 + factor * 0.2;
            const bgH = 0.07 + factor * 0.5;
            this.scene.background.setHSL(bgH, 0.5, 0.3 + factor * 0.3);
            this.scene.fog.color.copy(this.scene.background);
        } else {
            this.sunLight.color.setHSL(0.6, 0.3, 0.4);
            this.sunLight.intensity = 0.15;
            this.ambientLight.intensity = 0.15;
            this.ambientLight.color.setHSL(0.65, 0.4, 0.3);
            this.scene.background.setHSL(0.65, 0.4, 0.08);
            this.scene.fog.color.copy(this.scene.background);
        }

        this.hemiLight.intensity = Math.max(0.1, 0.3 + sunHeight * 0.4);
    }

    // ==================== TERRAIN ====================
    buildTerrain() {
        const w = WORLD_WIDTH;
        const h = WORLD_HEIGHT;
        const world = this.game.world;

        const geo = new THREE.PlaneGeometry(w, h, w, h);
        geo.rotateX(-Math.PI / 2);

        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const lx = pos.getX(i);
            const lz = pos.getZ(i);
            const wx = Math.round(lx + w / 2);
            const wz = Math.round(lz + h / 2);
            const tx = Math.max(0, Math.min(w - 1, wx));
            const tz = Math.max(0, Math.min(h - 1, wz));
            const terrain = world.getTerrain(tx, tz);
            const height = TERRAIN_HEIGHTS[terrain] ?? 0;
            pos.setY(i, height);
        }
        geo.computeVertexNormals();

        this.terrainTexture = this.createTerrainTexture();

        const mat = new THREE.MeshStandardMaterial({
            map: this.terrainTexture,
            roughness: 0.85,
            metalness: 0.0,
            flatShading: false,
        });

        this.terrainMesh = new THREE.Mesh(geo, mat);
        this.terrainMesh.position.set(w / 2, 0, h / 2);
        this.terrainMesh.receiveShadow = true;
        this.terrainGroup.add(this.terrainMesh);
    }

    createTerrainTexture() {
        const w = WORLD_WIDTH;
        const h = WORLD_HEIGHT;
        const world = this.game.world;
        const data = new Uint8Array(w * h * 4);
        const season = this.game.season;
        const tint = SEASON_TINTS[season] || SEASON_TINTS[0];

        for (let z = 0; z < h; z++) {
            for (let x = 0; x < w; x++) {
                const terrain = world.getTerrain(x, z);
                let rgb = TERRAIN_RGB[terrain] || [128, 128, 128];
                if (terrain === TERRAIN.GRASS && tint.grass) {
                    rgb = [
                        Math.min(255, rgb[0] * tint.grass[0]),
                        Math.min(255, rgb[1] * tint.grass[1]),
                        Math.min(255, rgb[2] * tint.grass[2])
                    ];
                } else if (terrain === TERRAIN.FOREST && tint.forest) {
                    rgb = [
                        Math.min(255, rgb[0] * tint.forest[0]),
                        Math.min(255, rgb[1] * tint.forest[1]),
                        Math.min(255, rgb[2] * tint.forest[2])
                    ];
                }
                const noise = (Math.random() - 0.5) * 10;
                const idx = (z * w + x) * 4;
                data[idx] = Math.max(0, Math.min(255, rgb[0] + noise));
                data[idx + 1] = Math.max(0, Math.min(255, rgb[1] + noise));
                data[idx + 2] = Math.max(0, Math.min(255, rgb[2] + noise));
                data[idx + 3] = 255;
            }
        }

        const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
        return tex;
    }

    updateTerrainTexture() {
        if (this.game.season !== this.lastSeason) {
            this.lastSeason = this.game.season;
            const newTex = this.createTerrainTexture();
            this.terrainMesh.material.map = newTex;
            this.terrainMesh.material.needsUpdate = true;
            if (this.terrainTexture) this.terrainTexture.dispose();
            this.terrainTexture = newTex;
        }
    }

    getTerrainHeight(gameX, gameY) {
        const world = this.game.world;
        const x = Math.max(0, Math.min(WORLD_WIDTH - 1, Math.floor(gameX)));
        const z = Math.max(0, Math.min(WORLD_HEIGHT - 1, Math.floor(gameY)));
        const terrain = world.getTerrain(x, z);
        return TERRAIN_HEIGHTS[terrain] ?? 0;
    }

    // ==================== WATER ====================
    buildWater() {
        const geo = new THREE.PlaneGeometry(WORLD_WIDTH + 20, WORLD_HEIGHT + 20, 40, 40);
        geo.rotateX(-Math.PI / 2);

        const mat = new THREE.MeshStandardMaterial({
            color: 0x2288bb,
            transparent: true,
            opacity: 0.7,
            roughness: 0.1,
            metalness: 0.3,
            side: THREE.DoubleSide,
        });

        this.waterMesh = new THREE.Mesh(geo, mat);
        this.waterMesh.position.set(WORLD_WIDTH / 2, -0.3, WORLD_HEIGHT / 2);
        this.waterMesh.receiveShadow = true;
        this.waterGroup.add(this.waterMesh);
    }

    updateWater() {
        if (!this.waterMesh) return;
        this.waterTime += 0.01;
        const pos = this.waterMesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const y = Math.sin(x * 0.3 + this.waterTime) * 0.08 +
                      Math.cos(z * 0.2 + this.waterTime * 0.7) * 0.06;
            pos.setY(i, y);
        }
        pos.needsUpdate = true;
    }

    // ==================== BILLBOARD SPRITE HELPERS ====================
    _createBillboard(texture, worldHeight, canvasW, canvasH) {
        const aspect = canvasW / canvasH;
        const worldWidth = worldHeight * aspect;
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.05,
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(worldWidth, worldHeight, 1);
        sprite.center.set(0.5, 0); // anchor at bottom center
        return sprite;
    }

    _disposeSprite(sprite) {
        if (sprite.material) {
            if (sprite.material.map) sprite.material.map.dispose();
            sprite.material.dispose();
        }
        // Also dispose extra cached frames
        if (sprite.userData.frames) {
            for (const tex of sprite.userData.frames) {
                if (tex && tex !== sprite.material?.map) tex.dispose();
            }
        }
    }

    // ==================== TREES (billboard) ====================
    buildInitialTrees() {
        const trees = this.game.entityManager.trees;
        for (const tree of trees) {
            this.addTreeMesh(tree);
        }
    }

    addTreeMesh(tree) {
        try {
            const texture = generateTreeSprite(tree);
            const size = tree.size || 4;
            const h = size * 0.45;
            const sprite = this._createBillboard(texture, h, 16, 24);
            const terrainH = this.getTerrainHeight(tree.x, tree.y);
            sprite.position.set(tree.x, terrainH, tree.y);
            this.treeGroup.add(sprite);
            this.treeMeshes.push({ data: tree, mesh: sprite });
        } catch (err) {
            console.warn('Failed to create tree sprite:', err);
        }
    }

    // ==================== BUILDINGS (billboard) ====================
    createBuildingMesh(building) {
        const type = building.type;
        const config = BUILDING_TYPE[type];
        if (!config) return null;

        const texture = generateBuildingSprite({
            buildingType: type,
            config: config
        });
        if (!texture) return null;

        const sizeInfo = BUILDING_SPRITE_SIZES[type] || { h: 1.0, cw: 24, ch: 24 };
        const sprite = this._createBillboard(texture, sizeInfo.h, sizeInfo.cw, sizeInfo.ch);

        const size = config.size || 1;
        const terrainH = this.getTerrainHeight(building.x, building.y);
        sprite.position.set(building.x + size * 0.5, terrainH, building.y + size * 0.5);

        return sprite;
    }

    // ==================== PEOPLE (billboard) ====================
    createPersonMesh(person) {
        const tex0 = generatePersonSprite(person, 0);
        const tex1 = generatePersonSprite(person, 1);
        const isChild = person.age < 15;
        const h = isChild ? 0.55 : 0.8;

        const sprite = this._createBillboard(tex0, h, 16, 24);
        sprite.userData.frames = [tex0, tex1];
        sprite.userData.animFrame = 0;
        sprite.userData.animTimer = 0;
        return sprite;
    }

    // ==================== ANIMALS (billboard) ====================
    createAnimalMesh(animal) {
        const type = animal.type;
        if (!ANIMAL_TYPE[type]) return null;

        const tex0 = generateAnimalSprite(type, 0);
        const tex1 = generateAnimalSprite(type, 1);
        const sizeInfo = ANIMAL_SPRITE_SIZES[type] || { h: 0.4, cw: 12, ch: 14 };

        const sprite = this._createBillboard(tex0, sizeInfo.h, sizeInfo.cw, sizeInfo.ch);
        sprite.userData.frames = [tex0, tex1];
        sprite.userData.animFrame = 0;
        sprite.userData.animTimer = 0;

        // Birds fly, fish swim
        if (type === 'BIRD') {
            sprite.userData.flyH = 1.5 + Math.random() * 2;
        } else if (type === 'FISH') {
            sprite.userData.swimDepth = -0.5;
        }

        return sprite;
    }

    // ==================== DINOSAURS (billboard) ====================
    createDinoMesh(dino) {
        const config = DINOSAUR_TYPE[dino.type];
        if (!config) return null;

        const tex0 = generateDinoSprite(dino.type, config, 0);
        const tex1 = generateDinoSprite(dino.type, config, 1);
        const sizeInfo = DINO_SPRITE_SIZES[dino.type] || { h: 1.5, cw: 28, ch: 24 };

        const sprite = this._createBillboard(tex0, sizeInfo.h, sizeInfo.cw, sizeInfo.ch);
        sprite.userData.frames = [tex0, tex1];
        sprite.userData.animFrame = 0;
        sprite.userData.animTimer = 0;

        if (dino.type === 'PTERANODON') {
            sprite.userData.flyH = sizeInfo.h * 1.5;
        }

        return sprite;
    }

    // ==================== GIANTS (billboard) ====================
    createGiantMesh(giant) {
        const tex0 = generateGiantSprite(giant, 0);
        const tex1 = generateGiantSprite(giant, 1);
        const giantSize = giant.giantSize || GIANT_CONFIG.baseSize;
        const h = giantSize * 0.7;

        const sprite = this._createBillboard(tex0, h, 24, 36);
        sprite.userData.frames = [tex0, tex1];
        sprite.userData.animFrame = 0;
        sprite.userData.animTimer = 0;
        return sprite;
    }

    // ==================== VEHICLES (billboard) ====================
    createVehicleMesh(vehicle) {
        const config = VEHICLE_TYPE[vehicle.type];
        if (!config) return null;

        const texture = generateVehicleSprite(vehicle.type, config);
        const sizeInfo = VEHICLE_SPRITE_SIZES[vehicle.type] || { h: 0.5, cw: 20, ch: 14 };

        const sprite = this._createBillboard(texture, sizeInfo.h, sizeInfo.cw, sizeInfo.ch);
        // Vehicles don't animate frames
        sprite.userData.frames = null;
        return sprite;
    }

    // ==================== WEATHER ====================
    buildWeatherSystems() {
        // Rain particles
        const rainCount = 3000;
        const rainGeo = new THREE.BufferGeometry();
        const rainPositions = new Float32Array(rainCount * 3);
        for (let i = 0; i < rainCount; i++) {
            rainPositions[i * 3] = Math.random() * WORLD_WIDTH;
            rainPositions[i * 3 + 1] = Math.random() * 15;
            rainPositions[i * 3 + 2] = Math.random() * WORLD_HEIGHT;
        }
        rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
        const rainMat = new THREE.PointsMaterial({
            color: 0xaabbcc, size: 0.15, transparent: true, opacity: 0.6 });
        this.rainSystem = new THREE.Points(rainGeo, rainMat);
        this.rainSystem.visible = false;
        this.effectGroup.add(this.rainSystem);

        // Snow particles
        const snowCount = 2000;
        const snowGeo = new THREE.BufferGeometry();
        const snowPositions = new Float32Array(snowCount * 3);
        for (let i = 0; i < snowCount; i++) {
            snowPositions[i * 3] = Math.random() * WORLD_WIDTH;
            snowPositions[i * 3 + 1] = Math.random() * 12;
            snowPositions[i * 3 + 2] = Math.random() * WORLD_HEIGHT;
        }
        snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
        const snowMat = new THREE.PointsMaterial({
            color: 0xffffff, size: 0.2, transparent: true, opacity: 0.8 });
        this.snowSystem = new THREE.Points(snowGeo, snowMat);
        this.snowSystem.visible = false;
        this.effectGroup.add(this.snowSystem);
    }

    updateWeather() {
        const weather = this.game.weather.current;
        const cam = this.game.camera3d;
        if (!cam) return;

        const cx = cam.targetX;
        const cz = cam.targetZ;

        const showRain = weather === 'rain' || weather === 'storm';
        this.rainSystem.visible = showRain;
        if (showRain) {
            const pos = this.rainSystem.geometry.attributes.position;
            const speed = weather === 'storm' ? 0.5 : 0.3;
            for (let i = 0; i < pos.count; i++) {
                let y = pos.getY(i) - speed;
                if (y < 0) {
                    y = 12 + Math.random() * 3;
                    pos.setX(i, cx - 30 + Math.random() * 60);
                    pos.setZ(i, cz - 30 + Math.random() * 60);
                }
                pos.setY(i, y);
            }
            pos.needsUpdate = true;
        }

        const showSnow = weather === 'snow';
        this.snowSystem.visible = showSnow;
        if (showSnow) {
            const pos = this.snowSystem.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                let y = pos.getY(i) - 0.03;
                let x = pos.getX(i) + Math.sin(this.frame * 0.01 + i) * 0.02;
                if (y < 0) {
                    y = 10 + Math.random() * 2;
                    x = cx - 25 + Math.random() * 50;
                    pos.setZ(i, cz - 25 + Math.random() * 50);
                }
                pos.setX(i, x);
                pos.setY(i, y);
            }
            pos.needsUpdate = true;
        }

        if (weather === 'storm') {
            this.ambientLight.intensity = Math.max(0.1, this.ambientLight.intensity - 0.01);
            this.sunLight.intensity = Math.max(0.2, this.sunLight.intensity - 0.02);
            if (Math.random() < 0.005) {
                this.screenFlashAlpha = 1.0;
            }
        }
    }

    // ==================== EFFECTS ====================
    addParticleEffect(worldX, worldZ, type, color) {
        const count = type === 'large' ? 30 : 15;
        const group = new THREE.Group();
        const h = this.getTerrainHeight(worldX, worldZ);
        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color || 0xffdd44),
            transparent: true, opacity: 0.9
        });

        const particles = [];
        for (let i = 0; i < count; i++) {
            const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 4, 3);
            const mesh = new THREE.Mesh(geo, mat.clone());
            mesh.position.set(
                (Math.random() - 0.5) * 2,
                Math.random() * 0.5,
                (Math.random() - 0.5) * 2
            );
            group.add(mesh);
            particles.push({
                mesh,
                vx: (Math.random() - 0.5) * 0.1,
                vy: 0.05 + Math.random() * 0.1,
                vz: (Math.random() - 0.5) * 0.1,
                life: 60 + Math.random() * 60
            });
        }

        group.position.set(worldX, h, worldZ);
        this.effectGroup.add(group);
        this.particles.push({ group, particles, age: 0 });
    }

    addShockwave(worldX, worldZ, maxRadius, color) {
        const h = this.getTerrainHeight(worldX, worldZ) + 0.1;
        const geo = new THREE.RingGeometry(0.1, 0.3, 32);
        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color || 0xffffff),
            transparent: true, opacity: 0.8, side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(worldX, h, worldZ);
        this.effectGroup.add(ring);
        this.shockwaves.push({ mesh: ring, radius: 0.3, maxRadius, age: 0 });
    }

    updateEffects() {
        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pe = this.particles[i];
            pe.age++;
            let allDead = true;
            for (const p of pe.particles) {
                p.life--;
                if (p.life > 0) {
                    allDead = false;
                    p.mesh.position.x += p.vx;
                    p.mesh.position.y += p.vy;
                    p.mesh.position.z += p.vz;
                    p.vy -= 0.002;
                    p.mesh.material.opacity = Math.min(1, p.life / 30);
                } else {
                    p.mesh.visible = false;
                }
            }
            if (allDead || pe.age > 180) {
                this.effectGroup.remove(pe.group);
                pe.group.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                this.particles.splice(i, 1);
            }
        }

        // Shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.age++;
            sw.radius += 0.15;
            const scale = sw.radius / 0.3;
            sw.mesh.scale.set(scale, scale, 1);
            sw.mesh.material.opacity = Math.max(0, 0.8 * (1 - sw.radius / sw.maxRadius));
            if (sw.radius >= sw.maxRadius) {
                this.effectGroup.remove(sw.mesh);
                sw.mesh.geometry.dispose();
                sw.mesh.material.dispose();
                this.shockwaves.splice(i, 1);
            }
        }

        // Screen flash decay
        if (this.screenFlashAlpha > 0) {
            this.screenFlashAlpha *= 0.9;
            if (this.screenFlashAlpha < 0.01) this.screenFlashAlpha = 0;
        }
    }

    // ==================== ENVIRONMENTAL DETAIL ====================
    buildGrassField() {
        const bladeGeo = new THREE.PlaneGeometry(0.15, 0.5);
        bladeGeo.translate(0, 0.25, 0);
        const grassMat = new THREE.MeshLambertMaterial({
            color: 0x4a9e3f,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.3,
        });

        const world = this.game.world;
        const positions = [];
        const step = 3;
        for (let z = 0; z < WORLD_HEIGHT; z += step) {
            for (let x = 0; x < WORLD_WIDTH; x += step) {
                const terrain = world.getTerrain(x, z);
                if (terrain === TERRAIN.GRASS || terrain === TERRAIN.FOREST) {
                    const count = terrain === TERRAIN.FOREST ? 2 : 3;
                    for (let i = 0; i < count; i++) {
                        positions.push([
                            x + Math.random() * step,
                            z + Math.random() * step,
                        ]);
                    }
                }
            }
        }

        const maxCount = Math.min(positions.length, 15000);
        const mesh = new THREE.InstancedMesh(bladeGeo, grassMat, maxCount);
        const dummy = new THREE.Object3D();

        for (let i = 0; i < maxCount; i++) {
            const [gx, gz] = positions[i];
            const h = this.getTerrainHeight(gx, gz);
            dummy.position.set(gx, h, gz);
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.rotation.x = (Math.random() - 0.5) * 0.2;
            const s = 0.6 + Math.random() * 0.8;
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            const gc = new THREE.Color().setHSL(
                0.25 + Math.random() * 0.08,
                0.5 + Math.random() * 0.3,
                0.35 + Math.random() * 0.15
            );
            mesh.setColorAt(i, gc);
        }

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.receiveShadow = true;
        this.grassInstances = mesh;
        this.terrainGroup.add(mesh);
    }

    buildDustParticles() {
        const count = 400;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = Math.random() * WORLD_WIDTH;
            pos[i * 3 + 1] = 1 + Math.random() * 8;
            pos[i * 3 + 2] = Math.random() * WORLD_HEIGHT;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xffe8c0, size: 0.12,
            transparent: true, opacity: 0.4, sizeAttenuation: true,
        });
        this.dustParticles = new THREE.Points(geo, mat);
        this.effectGroup.add(this.dustParticles);
    }

    updateDustParticles() {
        if (!this.dustParticles) return;
        const cam = this.game.camera3d;
        if (!cam) return;
        const pos = this.dustParticles.geometry.attributes.position;
        const cx = cam.targetX;
        const cz = cam.targetZ;
        for (let i = 0; i < pos.count; i++) {
            const px = pos.getX(i);
            let py = pos.getY(i);
            const pz = pos.getZ(i);
            py += Math.sin(this.frame * 0.01 + i) * 0.003;
            pos.setX(i, px + Math.sin(this.frame * 0.005 + i * 0.7) * 0.005);
            pos.setY(i, py);
            pos.setZ(i, pz + Math.cos(this.frame * 0.005 + i * 0.3) * 0.005);
            const dx = px - cx;
            const dz = pz - cz;
            if (dx * dx + dz * dz > 2500) {
                pos.setX(i, cx + (Math.random() - 0.5) * 40);
                pos.setZ(i, cz + (Math.random() - 0.5) * 40);
                pos.setY(i, 1 + Math.random() * 8);
            }
        }
        pos.needsUpdate = true;
        const sunH = Math.sin((this.game.timeOfDay - 0.25) * Math.PI * 2);
        this.dustParticles.material.opacity = Math.max(0.05, sunH * 0.5);
    }

    buildFireflies() {
        const count = 150;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = Math.random() * WORLD_WIDTH;
            pos[i * 3 + 1] = 0.5 + Math.random() * 3;
            pos[i * 3 + 2] = Math.random() * WORLD_HEIGHT;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xaaff44, size: 0.2,
            transparent: true, opacity: 0, sizeAttenuation: true,
        });
        this.fireflySystem = new THREE.Points(geo, mat);
        this.effectGroup.add(this.fireflySystem);
    }

    updateFireflies() {
        if (!this.fireflySystem) return;
        const t = this.game.timeOfDay;
        const isNight = t < 0.22 || t > 0.78;
        if (!isNight) {
            this.fireflySystem.material.opacity = 0;
            return;
        }
        const cam = this.game.camera3d;
        if (!cam) return;
        const pos = this.fireflySystem.geometry.attributes.position;
        const cx = cam.targetX;
        const cz = cam.targetZ;
        for (let i = 0; i < pos.count; i++) {
            const px = pos.getX(i);
            let py = pos.getY(i);
            const pz = pos.getZ(i);
            pos.setX(i, px + Math.sin(this.frame * 0.02 + i * 1.3) * 0.02);
            pos.setY(i, py + Math.sin(this.frame * 0.015 + i * 0.7) * 0.008);
            pos.setZ(i, pz + Math.cos(this.frame * 0.018 + i * 0.9) * 0.02);
            const dx = px - cx;
            const dz = pz - cz;
            if (dx * dx + dz * dz > 1600) {
                pos.setX(i, cx + (Math.random() - 0.5) * 30);
                pos.setZ(i, cz + (Math.random() - 0.5) * 30);
                pos.setY(i, 0.5 + Math.random() * 3);
            }
        }
        pos.needsUpdate = true;
        const pulse = 0.3 + Math.sin(this.frame * 0.06) * 0.15;
        this.fireflySystem.material.opacity = pulse;
        this.fireflySystem.material.size = 0.15 + Math.sin(this.frame * 0.08) * 0.08;
    }

    // ==================== ENTITY SYNC ====================
    syncEntities() {
        const em = this.game.entityManager;

        this.syncPeople(em.people);
        this.syncBuildings(em.buildings);
        this.syncAnimals(em.animals);
        if (em.giants) this.syncGiants(em.giants);
        if (em.dinosaurs) this.syncDinosaurs(em.dinosaurs);
        if (em.vehicles) this.syncVehicles(em.vehicles);

        // New trees
        while (this.treeMeshes.length < em.trees.length) {
            const idx = this.treeMeshes.length;
            this.addTreeMesh(em.trees[idx]);
        }
    }

    // Shared animation helper: swap texture frame for walking sprites
    _animateSprite(sprite, isMoving) {
        if (!sprite.userData.frames) return;
        const interval = isMoving ? 12 : 40;
        sprite.userData.animTimer = (sprite.userData.animTimer || 0) + 1;
        if (sprite.userData.animTimer >= interval) {
            sprite.userData.animTimer = 0;
            sprite.userData.animFrame = 1 - (sprite.userData.animFrame || 0);
            const newTex = sprite.userData.frames[sprite.userData.animFrame];
            sprite.material.map = newTex;
            sprite.material.needsUpdate = true;
        }
    }

    syncPeople(people) {
        // Remove dead
        for (const [person, sprite] of this.personMeshes) {
            if (!person.alive || !people.includes(person)) {
                this.entityGroup.remove(sprite);
                this._disposeSprite(sprite);
                this.personMeshes.delete(person);
            }
        }
        // Add new / update positions
        for (const person of people) {
            if (!person.alive) continue;
            let sprite = this.personMeshes.get(person);
            if (!sprite) {
                try {
                    sprite = this.createPersonMesh(person);
                } catch (err) {
                    console.warn('Failed to create person sprite:', err);
                    continue;
                }
                this.entityGroup.add(sprite);
                this.personMeshes.set(person, sprite);
            }
            const h = this.getTerrainHeight(person.x, person.y);
            sprite.position.set(person.x, Math.max(0, h), person.y);

            // Animation
            const isWalking = person.state === NPC_STATE.WALKING || person.state === NPC_STATE.FLEEING;
            const isWorking = person.state === NPC_STATE.WORKING || person.state === NPC_STATE.BUILDING;
            this._animateSprite(sprite, isWalking || isWorking);

            // Walking bob
            if (isWalking) {
                const speed = person.state === NPC_STATE.FLEEING ? 0.25 : 0.15;
                const t = this.frame * speed + person.x * 7;
                sprite.position.y += Math.abs(Math.sin(t * 2)) * 0.03;
            }

            // Sleeping: tilt sprite
            if (person.state === NPC_STATE.SLEEPING) {
                sprite.material.rotation = Math.PI / 2;
                sprite.position.y += 0.15;
            } else {
                sprite.material.rotation = 0;
            }
        }
    }

    syncBuildings(buildings) {
        for (const [building, sprite] of this.buildingMeshes) {
            if (building.health <= 0 || !buildings.includes(building)) {
                this.buildingGroup.remove(sprite);
                this._disposeSprite(sprite);
                this.buildingMeshes.delete(building);
            }
        }
        for (const building of buildings) {
            if (this.buildingMeshes.has(building)) continue;
            let sprite;
            try {
                sprite = this.createBuildingMesh(building);
            } catch (err) {
                console.warn('Failed to create building sprite:', err);
                continue;
            }
            if (sprite) {
                this.buildingGroup.add(sprite);
                this.buildingMeshes.set(building, sprite);
            }
        }
    }

    syncAnimals(animals) {
        for (const [animal, sprite] of this.animalMeshes) {
            if (!animal.alive || !animals.includes(animal)) {
                this.entityGroup.remove(sprite);
                this._disposeSprite(sprite);
                this.animalMeshes.delete(animal);
            }
        }
        for (const animal of animals) {
            if (!animal.alive) continue;
            let sprite = this.animalMeshes.get(animal);
            if (!sprite) {
                try {
                    sprite = this.createAnimalMesh(animal);
                } catch (err) {
                    console.warn('Failed to create animal sprite:', err);
                    continue;
                }
                if (!sprite) continue;
                this.entityGroup.add(sprite);
                this.animalMeshes.set(animal, sprite);
            }

            const h = this.getTerrainHeight(animal.x, animal.y);
            let baseY = Math.max(0, h);

            // Bird: fly above terrain
            if (sprite.userData.flyH) {
                baseY += sprite.userData.flyH;
                // Gentle hover bob
                baseY += Math.sin(this.frame * 0.05 + animal.x) * 0.15;
            }
            // Fish: swim below water
            if (sprite.userData.swimDepth) {
                baseY = sprite.userData.swimDepth;
            }

            sprite.position.set(animal.x, baseY, animal.y);

            // Animation
            let isMoving = false;
            if (animal.prevX !== undefined) {
                const dx = animal.x - animal.prevX;
                const dz = animal.y - (animal.prevY || animal.y);
                if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                    isMoving = true;
                }
            }
            this._animateSprite(sprite, isMoving);

            // Rabbit hop
            if (animal.type === 'RABBIT' && isMoving) {
                const t = this.frame * 0.18 + animal.x * 5;
                sprite.position.y += Math.abs(Math.sin(t * 1.5)) * 0.06;
            }
        }
    }

    syncGiants(giants) {
        for (const [giant, sprite] of this.giantMeshes) {
            if (!giant.alive || !giants.includes(giant)) {
                this.entityGroup.remove(sprite);
                this._disposeSprite(sprite);
                this.giantMeshes.delete(giant);
            }
        }
        for (const giant of giants) {
            if (!giant.alive) continue;
            let sprite = this.giantMeshes.get(giant);
            if (!sprite) {
                try {
                    sprite = this.createGiantMesh(giant);
                } catch (err) {
                    console.warn('Failed to create giant sprite:', err);
                    continue;
                }
                this.entityGroup.add(sprite);
                this.giantMeshes.set(giant, sprite);
            }
            const h = this.getTerrainHeight(giant.x, giant.y);
            sprite.position.set(giant.x, Math.max(0, h), giant.y);

            // Detect movement
            let isMoving = false;
            if (giant.prevX !== undefined) {
                const dx = giant.x - giant.prevX;
                const dz = giant.y - (giant.prevY || giant.y);
                if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                    isMoving = true;
                }
            }
            this._animateSprite(sprite, isMoving);

            // Heavy ground shake bob
            if (isMoving) {
                const t = this.frame * 0.08 + giant.x;
                sprite.position.y += Math.abs(Math.sin(t * 2)) * 0.05;
            }
        }
    }

    syncDinosaurs(dinos) {
        for (const [dino, sprite] of this.dinoMeshes) {
            if (!dino.alive || !dinos.includes(dino)) {
                this.entityGroup.remove(sprite);
                this._disposeSprite(sprite);
                this.dinoMeshes.delete(dino);
            }
        }
        for (const dino of dinos) {
            if (!dino.alive) continue;
            let sprite = this.dinoMeshes.get(dino);
            if (!sprite) {
                try {
                    sprite = this.createDinoMesh(dino);
                } catch (err) {
                    console.warn('Failed to create dino sprite:', err);
                    continue;
                }
                if (!sprite) continue;
                this.entityGroup.add(sprite);
                this.dinoMeshes.set(dino, sprite);
            }

            const h = this.getTerrainHeight(dino.x, dino.y);
            let baseY = Math.max(0, h);

            // Pteranodon flies
            if (sprite.userData.flyH) {
                baseY += sprite.userData.flyH;
                baseY += Math.sin(this.frame * 0.05 + dino.x) * 0.15;
            }

            sprite.position.set(dino.x, baseY, dino.y);

            let isMoving = false;
            if (dino.prevX !== undefined) {
                const dx = dino.x - dino.prevX;
                const dz = dino.y - (dino.prevY || dino.y);
                if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                    isMoving = true;
                }
            }
            this._animateSprite(sprite, isMoving);

            // Ground shake for large dinos
            if (isMoving && !sprite.userData.flyH) {
                const t = this.frame * 0.12 + dino.x * 3;
                sprite.position.y += Math.abs(Math.sin(t * 2)) * 0.04;
            }
        }
    }

    syncVehicles(vehicles) {
        for (const [vehicle, sprite] of this.vehicleMeshes) {
            if (!vehicle.alive || !vehicles.includes(vehicle)) {
                this.vehicleGroup.remove(sprite);
                this._disposeSprite(sprite);
                this.vehicleMeshes.delete(vehicle);
            }
        }
        for (const vehicle of vehicles) {
            if (!vehicle.alive) continue;
            let sprite = this.vehicleMeshes.get(vehicle);
            if (!sprite) {
                try {
                    sprite = this.createVehicleMesh(vehicle);
                } catch (err) {
                    console.warn('Failed to create vehicle sprite:', err);
                    continue;
                }
                if (!sprite) continue;
                this.vehicleGroup.add(sprite);
                this.vehicleMeshes.set(vehicle, sprite);
            }
            const h = this.getTerrainHeight(vehicle.x, vehicle.y);
            const flyHeight = vehicle.type === 'FLYING_CAR' ? 1.5 : 0;
            sprite.position.set(vehicle.x, Math.max(0, h) + flyHeight, vehicle.y);
        }
    }

    // ==================== GHOST PREVIEW ====================
    showGhostPreview(type, size, worldX, worldZ) {
        this.removeGhostPreview();
        const mat = new THREE.MeshBasicMaterial({
            color: 0x44ff44, transparent: true, opacity: 0.4, wireframe: true
        });
        let geo;
        if (type === 'person' || type === 'giant') {
            const s = type === 'giant' ? size * 0.3 : 0.85;
            geo = new THREE.CapsuleGeometry(s * 0.3, s * 0.5, 4, 8);
        } else if (type === 'tree') {
            geo = new THREE.ConeGeometry(size * 0.2, size * 0.5, 7);
        } else {
            geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        }
        this.ghostMesh = new THREE.Mesh(geo, mat);
        const h = this.getTerrainHeight(worldX, worldZ);
        this.ghostMesh.position.set(worldX, h + 0.3, worldZ);
        this.effectGroup.add(this.ghostMesh);
    }

    updateGhostPosition(worldX, worldZ) {
        if (this.ghostMesh) {
            const h = this.getTerrainHeight(worldX, worldZ);
            this.ghostMesh.position.set(worldX, h + 0.3, worldZ);
        }
    }

    removeGhostPreview() {
        if (this.ghostMesh) {
            this.effectGroup.remove(this.ghostMesh);
            this.ghostMesh.geometry.dispose();
            this.ghostMesh.material.dispose();
            this.ghostMesh = null;
        }
    }

    // ==================== MAIN RENDER ====================
    render() {
        if (!this.threeRenderer || !this.game.camera3d) return;

        this.frame++;

        // Update terrain texture on season change
        this.updateTerrainTexture();

        // Sync sprites with game state
        this.syncEntities();

        // Update systems
        this.updateLighting();
        this.updateWater();
        this.updateWeather();
        this.updateEffects();
        this.updateDustParticles();
        this.updateFireflies();

        // Camera
        const cam = this.game.camera3d;
        if (cam.threeCamera) {
            this.sunLight.shadow.camera.updateProjectionMatrix();

            // Update bloom strength based on time of day
            if (this.bloomPass) {
                const t = this.game.timeOfDay;
                const sunH = Math.sin((t - 0.25) * Math.PI * 2);
                if (sunH < -0.1) {
                    this.bloomPass.strength = 0.6;
                } else if (sunH < 0.1) {
                    this.bloomPass.strength = 0.5;
                } else {
                    this.bloomPass.strength = 0.25;
                }
            }

            // Render with post-processing
            if (this.composer) {
                this.composer.render();
            } else {
                this.threeRenderer.render(this.scene, cam.threeCamera);
            }
        }

        // Screen flash overlay
        const canvas3d = this.threeRenderer.domElement;
        if (this.screenFlashAlpha > 0.01) {
            canvas3d.style.filter = `brightness(${1 + this.screenFlashAlpha * 2})`;
        } else {
            canvas3d.style.filter = '';
        }
    }

    // ==================== RAYCASTING ====================
    raycastAtScreen(screenX, screenY) {
        if (!this.game.camera3d) return null;
        const canvas = this.threeRenderer.domElement;
        this.mouseVec.x = (screenX / canvas.clientWidth) * 2 - 1;
        this.mouseVec.y = -(screenY / canvas.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouseVec, this.game.camera3d.threeCamera);

        if (this.terrainMesh) {
            const hits = this.raycaster.intersectObject(this.terrainMesh);
            if (hits.length > 0) {
                const p = hits[0].point;
                return { x: p.x, z: p.z, y: p.y };
            }
        }
        return null;
    }

    // ==================== UTILITY ====================
    disposeMesh(mesh) {
        if (mesh.isSprite) {
            this._disposeSprite(mesh);
        } else {
            mesh.traverse(child => {
                if (child.geometry && !child.isSprite) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }
    }

    onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.threeRenderer.setSize(w, h);
        if (this.composer) {
            this.composer.setSize(w, h);
        }
        if (this.game.camera3d) {
            this.game.camera3d.onResize(w, h);
        }
    }

    dispose() {
        this.scene.traverse(child => {
            if (child.geometry && !child.isSprite) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            }
        });
        if (this.composer) {
            this.composer.dispose();
        }
        this.threeRenderer.dispose();
    }
}
