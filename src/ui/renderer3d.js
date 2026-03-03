// Three.js 3D Diorama Renderer
import * as THREE from 'three';
import { TERRAIN, TERRAIN_HEIGHTS, TERRAIN_RGB, BUILDING_TYPE, ANIMAL_TYPE,
         NPC_STATE, PERSONALITY, GIANT_CONFIG, DINOSAUR_TYPE, VEHICLE_TYPE,
         WORLD_WIDTH, WORLD_HEIGHT, SEASON_TINTS } from '../core/constants.js';

// ===== HELPER: parse hex color =====
function hexToRGB(hex) {
    const c = parseInt(hex.replace('#', ''), 16);
    return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}

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

        // Entity mesh maps
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
        this.nightLights = [];

        // Water
        this.waterMesh = null;
        this.waterTime = 0;

        // Terrain
        this.terrainMesh = null;
        this.terrainTexture = null;
        this.terrainNeedsUpdate = false;
        this.lastSeason = -1;

        // Weather particles
        this.rainSystem = null;
        this.snowSystem = null;

        // Effects
        this.particles = [];
        this.shockwaves = [];
        this.screenFlashAlpha = 0;
        this.glowMeshes = [];

        // Ghost preview for placement
        this.ghostMesh = null;

        // Frame counter
        this.frame = 0;

        // Geometry/material caches
        this._geoCache = {};
        this._matCache = {};

        // Raycaster for click detection
        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2();

        // Performance: skip frames for entity sync at high speed
        this._lastEntitySync = 0;
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

        window.addEventListener('resize', () => this.onResize());
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

        // Sun position based on time of day (0=midnight, 0.5=noon)
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

        // Daylight colors
        if (sunHeight > 0.1) {
            // Daytime
            const warmth = Math.max(0, 1 - sunHeight);
            this.sunLight.color.setHSL(0.1 * warmth, 0.3, 0.95);
            this.sunLight.intensity = 1.5 + sunHeight * 0.5;
            this.ambientLight.intensity = 0.4 + sunHeight * 0.3;
            this.scene.background.setHSL(0.56, 0.6, 0.5 + sunHeight * 0.3);
            this.scene.fog.color.copy(this.scene.background);
        } else if (sunHeight > -0.2) {
            // Sunrise/sunset
            const factor = (sunHeight + 0.2) / 0.3;
            this.sunLight.color.setHSL(0.07, 0.8, 0.7);
            this.sunLight.intensity = 0.8 + factor * 0.7;
            this.ambientLight.intensity = 0.3 + factor * 0.2;
            const bgH = 0.07 + factor * 0.5;
            this.scene.background.setHSL(bgH, 0.5, 0.3 + factor * 0.3);
            this.scene.fog.color.copy(this.scene.background);
        } else {
            // Night
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

        // Geometry
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

        // Texture from terrain data
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
                // Apply season tint to grass/forest
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
                // Add slight noise for visual variety
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

    // ==================== TREES ====================
    buildInitialTrees() {
        const trees = this.game.entityManager.trees;
        for (const tree of trees) {
            this.addTreeMesh(tree);
        }
    }

    addTreeMesh(tree) {
        const size = tree.size || 4;
        const group = new THREE.Group();

        // Trunk
        const trunkH = size * 0.4;
        const trunkR = size * 0.05;
        const trunkGeo = this._getCachedGeo('trunk', () =>
            new THREE.CylinderGeometry(0.08, 0.12, 1, 6));
        const trunkMat = new THREE.MeshStandardMaterial({
            color: 0x6B4226, roughness: 0.9, metalness: 0
        });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.scale.set(trunkR / 0.08, trunkH, trunkR / 0.08);
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        group.add(trunk);

        // Foliage (layered cones for low-poly look)
        const foliageColor = new THREE.Color(tree.color || '#2a8030');
        const foliageMat = new THREE.MeshStandardMaterial({
            color: foliageColor, roughness: 0.8, metalness: 0
        });

        const layers = Math.max(2, Math.floor(size / 2));
        for (let l = 0; l < layers; l++) {
            const layerR = size * 0.2 * (1 - l * 0.15);
            const layerH = size * 0.25;
            const coneGeo = new THREE.ConeGeometry(layerR, layerH, 7);
            const cone = new THREE.Mesh(coneGeo, foliageMat);
            cone.position.y = trunkH + l * layerH * 0.6;
            cone.castShadow = true;
            group.add(cone);
        }

        const h = this.getTerrainHeight(tree.x, tree.y);
        group.position.set(tree.x, h, tree.y);

        // Slight random rotation
        group.rotation.y = Math.random() * Math.PI * 2;

        this.treeGroup.add(group);
        this.treeMeshes.push({ data: tree, mesh: group });
    }

    // ==================== BUILDINGS ====================
    createBuildingMesh(building) {
        const type = building.type;
        const config = BUILDING_TYPE[type];
        if (!config) return null;

        const group = new THREE.Group();
        const baseColor = new THREE.Color(config.color);
        const size = config.size || 1;

        const baseMat = new THREE.MeshStandardMaterial({
            color: baseColor, roughness: 0.7, metalness: 0.05
        });
        const roofMat = new THREE.MeshStandardMaterial({
            color: baseColor.clone().multiplyScalar(0.7), roughness: 0.6, metalness: 0.05
        });

        switch (type) {
            case 'HUT': {
                const base = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.4, 0.45, 0.5, 8), baseMat);
                base.position.y = 0.25;
                base.castShadow = true;
                group.add(base);
                const roof = new THREE.Mesh(
                    new THREE.ConeGeometry(0.55, 0.4, 8), roofMat);
                roof.position.y = 0.7;
                roof.castShadow = true;
                group.add(roof);
                break;
            }
            case 'HOUSE': {
                const base = new THREE.Mesh(
                    new THREE.BoxGeometry(0.8, 0.6, 0.7), baseMat);
                base.position.y = 0.3;
                base.castShadow = true;
                group.add(base);
                const roof = new THREE.Mesh(
                    new THREE.ConeGeometry(0.65, 0.45, 4), roofMat);
                roof.position.y = 0.82;
                roof.rotation.y = Math.PI / 4;
                roof.castShadow = true;
                group.add(roof);
                break;
            }
            case 'FARM': {
                const base = new THREE.Mesh(
                    new THREE.BoxGeometry(1.6, 0.25, 1.6), baseMat);
                base.position.y = 0.125;
                group.add(base);
                // Fence posts
                const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9 });
                for (let i = -0.7; i <= 0.7; i += 0.35) {
                    for (const z of [-0.8, 0.8]) {
                        const post = new THREE.Mesh(
                            new THREE.BoxGeometry(0.04, 0.3, 0.04), fenceMat);
                        post.position.set(i, 0.15, z);
                        group.add(post);
                    }
                    for (const x of [-0.8, 0.8]) {
                        const post = new THREE.Mesh(
                            new THREE.BoxGeometry(0.04, 0.3, 0.04), fenceMat);
                        post.position.set(x, 0.15, i);
                        group.add(post);
                    }
                }
                break;
            }
            case 'GRANARY': {
                const base = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.35, 0.4, 0.8, 12), baseMat);
                base.position.y = 0.4;
                base.castShadow = true;
                group.add(base);
                const cap = new THREE.Mesh(
                    new THREE.ConeGeometry(0.4, 0.3, 12), roofMat);
                cap.position.y = 0.95;
                group.add(cap);
                break;
            }
            case 'TEMPLE': {
                const plat = new THREE.Mesh(
                    new THREE.BoxGeometry(1.4, 0.15, 1.4), baseMat);
                plat.position.y = 0.075;
                group.add(plat);
                const body = new THREE.Mesh(
                    new THREE.BoxGeometry(1.0, 0.7, 1.0), baseMat);
                body.position.y = 0.5;
                body.castShadow = true;
                group.add(body);
                const pyramid = new THREE.Mesh(
                    new THREE.ConeGeometry(0.8, 0.5, 4), roofMat);
                pyramid.position.y = 1.1;
                pyramid.rotation.y = Math.PI / 4;
                pyramid.castShadow = true;
                group.add(pyramid);
                // Pillars
                const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf0e6d0, roughness: 0.5 });
                for (const dx of [-0.5, 0.5]) {
                    for (const dz of [-0.5, 0.5]) {
                        const pillar = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), pillarMat);
                        pillar.position.set(dx, 0.5, dz);
                        pillar.castShadow = true;
                        group.add(pillar);
                    }
                }
                break;
            }
            case 'MARKET': {
                const base = new THREE.Mesh(
                    new THREE.BoxGeometry(1.4, 0.15, 1.4), baseMat);
                base.position.y = 0.075;
                group.add(base);
                // Canopy
                const canopyMat = new THREE.MeshStandardMaterial({
                    color: 0xcc8844, roughness: 0.7, side: THREE.DoubleSide });
                const canopy = new THREE.Mesh(
                    new THREE.BoxGeometry(1.5, 0.05, 1.5), canopyMat);
                canopy.position.y = 0.6;
                canopy.castShadow = true;
                group.add(canopy);
                // Posts
                for (const dx of [-0.6, 0.6]) {
                    for (const dz of [-0.6, 0.6]) {
                        const post = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), baseMat);
                        post.position.set(dx, 0.3, dz);
                        group.add(post);
                    }
                }
                break;
            }
            case 'SCHOOL': {
                const body = new THREE.Mesh(
                    new THREE.BoxGeometry(0.8, 0.55, 0.7), baseMat);
                body.position.y = 0.275;
                body.castShadow = true;
                group.add(body);
                const roofMesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.9, 0.08, 0.8), roofMat);
                roofMesh.position.y = 0.59;
                group.add(roofMesh);
                break;
            }
            case 'CASTLE': {
                // Main keep
                const keep = new THREE.Mesh(
                    new THREE.BoxGeometry(1.8, 1.2, 1.8), baseMat);
                keep.position.y = 0.6;
                keep.castShadow = true;
                group.add(keep);
                // Towers
                const towerMat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.6 });
                for (const dx of [-0.85, 0.85]) {
                    for (const dz of [-0.85, 0.85]) {
                        const tower = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.2, 0.22, 1.6, 8), towerMat);
                        tower.position.set(dx, 0.8, dz);
                        tower.castShadow = true;
                        group.add(tower);
                        const cap = new THREE.Mesh(
                            new THREE.ConeGeometry(0.25, 0.3, 8), roofMat);
                        cap.position.set(dx, 1.75, dz);
                        group.add(cap);
                    }
                }
                break;
            }
            case 'WORKSHOP': {
                const body = new THREE.Mesh(
                    new THREE.BoxGeometry(0.7, 0.5, 0.6), baseMat);
                body.position.y = 0.25;
                body.castShadow = true;
                group.add(body);
                // Chimney
                const chimney = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.06, 0.08, 0.4, 8),
                    new THREE.MeshStandardMaterial({ color: 0x555555 }));
                chimney.position.set(0.2, 0.7, 0);
                group.add(chimney);
                const roof = new THREE.Mesh(
                    new THREE.ConeGeometry(0.5, 0.35, 4), roofMat);
                roof.position.y = 0.67;
                roof.rotation.y = Math.PI / 4;
                roof.castShadow = true;
                group.add(roof);
                break;
            }
            case 'CHURCH': {
                const body = new THREE.Mesh(
                    new THREE.BoxGeometry(0.7, 0.7, 0.8), baseMat);
                body.position.y = 0.35;
                body.castShadow = true;
                group.add(body);
                // Steeple
                const steeple = new THREE.Mesh(
                    new THREE.ConeGeometry(0.15, 0.8, 4), roofMat);
                steeple.position.set(0, 1.1, -0.2);
                steeple.castShadow = true;
                group.add(steeple);
                const roof = new THREE.Mesh(
                    new THREE.ConeGeometry(0.5, 0.35, 4), roofMat);
                roof.position.y = 0.87;
                roof.rotation.y = Math.PI / 4;
                group.add(roof);
                break;
            }
            case 'FACTORY': {
                const body = new THREE.Mesh(
                    new THREE.BoxGeometry(1.4, 0.8, 1.2), baseMat);
                body.position.y = 0.4;
                body.castShadow = true;
                group.add(body);
                // Smokestacks
                const stackMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5 });
                for (const dx of [-0.3, 0.3]) {
                    const stack = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8), stackMat);
                    stack.position.set(dx, 1.1, 0);
                    stack.castShadow = true;
                    group.add(stack);
                }
                break;
            }
            case 'HOSPITAL': {
                const body = new THREE.Mesh(
                    new THREE.BoxGeometry(1.4, 0.8, 1.2), baseMat);
                body.position.y = 0.4;
                body.castShadow = true;
                group.add(body);
                // Red cross
                const crossMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 });
                const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.08), crossMat);
                h1.position.set(0, 0.82, 0.61);
                group.add(h1);
                const v1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.3), crossMat);
                v1.position.set(0, 0.82, 0.61);
                v1.rotation.x = Math.PI / 2;
                group.add(v1);
                break;
            }
            case 'SKYSCRAPER': {
                const glassMat = new THREE.MeshStandardMaterial({
                    color: 0x88aacc, roughness: 0.1, metalness: 0.6 });
                const body = new THREE.Mesh(
                    new THREE.BoxGeometry(1.2, 3.5, 1.2), glassMat);
                body.position.y = 1.75;
                body.castShadow = true;
                group.add(body);
                // Antenna
                const antenna = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4),
                    new THREE.MeshStandardMaterial({ color: 0xcccccc }));
                antenna.position.y = 3.75;
                group.add(antenna);
                break;
            }
            default: {
                // Generic building
                const body = new THREE.Mesh(
                    new THREE.BoxGeometry(size * 0.6, 0.5, size * 0.6), baseMat);
                body.position.y = 0.25;
                body.castShadow = true;
                group.add(body);
            }
        }

        const h = this.getTerrainHeight(building.x, building.y);
        group.position.set(building.x + size * 0.5, h, building.y + size * 0.5);
        return group;
    }

    // ==================== PEOPLE ====================
    createPersonMesh(person) {
        const group = new THREE.Group();
        const personality = person.personality || 'NORMAL';
        const pConfig = PERSONALITY[personality] || PERSONALITY.NORMAL;
        const isChild = person.age < 15;
        const s = isChild ? 0.7 : 1.0;

        // Deterministic hash for varied appearance
        const h = (person.name?.charCodeAt(0) || 0) + (person.name?.charCodeAt(1) || 0) * 7 + (person.age || 0);

        // ---- Materials ----
        const shirtColor = new THREE.Color(pConfig.color);
        const shirtMat = new THREE.MeshLambertMaterial({ color: shirtColor });

        const pantsOpts = [0x3a4a6a, 0x4a3a2a, 0x2a3a2a, 0x5a4a3a, 0x3a3a4a, 0x524236, 0x3e4e3e, 0x484868];
        const pantsMat = new THREE.MeshLambertMaterial({ color: pantsOpts[h % pantsOpts.length] });

        const skinOpts = [0xf5c8a0, 0xe8b888, 0xd4a574, 0xc49060, 0xffdcb8, 0xe0c090];
        const skinMat = new THREE.MeshLambertMaterial({ color: skinOpts[h % skinOpts.length] });

        const shoeMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });

        // ---- HEAD (big, boxy = chibi style) ----
        const hs = 0.15 * s; // head size
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(hs, hs * 1.05, hs * 0.95), skinMat);
        head.position.y = 0.56 * s;
        head.castShadow = true;
        group.add(head);

        // Eyes (black dots with white highlights)
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        for (const dx of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018 * s, 5, 4), eyeMat);
            eye.position.set(dx * 0.035 * s, 0.565 * s, -hs * 0.48);
            group.add(eye);
            // White highlight dot
            const wh = new THREE.Mesh(new THREE.SphereGeometry(0.007 * s, 3, 2), whiteMat);
            wh.position.set(dx * 0.035 * s + 0.006 * s, 0.572 * s, -hs * 0.5);
            group.add(wh);
        }

        // Mouth (tiny dark line)
        const mouthMat = new THREE.MeshBasicMaterial({ color: 0x663333 });
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.035 * s, 0.005 * s, 0.005 * s), mouthMat);
        mouth.position.set(0, 0.535 * s, -hs * 0.48);
        group.add(mouth);

        // Hair (varied by gender and hash)
        const hairOpts = [0x2a1a0a, 0x4a2a10, 0x1a0a00, 0x6a4420, 0x3a2010, 0x8a5530, 0x1a1a2a, 0xaa7744];
        const hairMat = new THREE.MeshLambertMaterial({ color: hairOpts[h % hairOpts.length] });

        if (person.gender === 'female') {
            // Female: fuller hair block
            const hair = new THREE.Mesh(
                new THREE.BoxGeometry(hs * 1.12, hs * 0.7, hs * 1.1), hairMat);
            hair.position.set(0, 0.6 * s, 0.01 * s);
            group.add(hair);
            // Style variation
            if (h % 3 === 0) {
                // Ponytail
                const pony = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 0.12 * s, 0.04 * s), hairMat);
                pony.position.set(0, 0.5 * s, hs * 0.5);
                group.add(pony);
            } else if (h % 3 === 1) {
                // Side hair
                for (const dx of [-1, 1]) {
                    const side = new THREE.Mesh(new THREE.BoxGeometry(0.02 * s, 0.08 * s, 0.03 * s), hairMat);
                    side.position.set(dx * hs * 0.55, 0.52 * s, 0);
                    group.add(side);
                }
            }
        } else {
            // Male: shorter box hair
            const hair = new THREE.Mesh(
                new THREE.BoxGeometry(hs * 1.06, hs * 0.4, hs * 1.06), hairMat);
            hair.position.y = 0.63 * s;
            group.add(hair);
            // Style: sometimes spiky
            if (h % 3 === 0) {
                const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02 * s, 0.06 * s, 4), hairMat);
                spike.position.set(0, 0.68 * s, 0);
                group.add(spike);
            }
        }

        // ---- BODY (box torso with shirt color) ----
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.2 * s, 0.17 * s, 0.12 * s), shirtMat);
        body.position.y = 0.37 * s;
        body.castShadow = true;
        group.add(body);

        // ---- ARMS (animated pivots, box shapes) ----
        const aw = 0.055 * s; // arm width
        const ah = 0.15 * s;  // arm height

        const leftArmPivot = new THREE.Group();
        leftArmPivot.position.set(-0.125 * s, 0.42 * s, 0);
        const laBox = new THREE.Mesh(new THREE.BoxGeometry(aw, ah, aw), shirtMat);
        laBox.position.y = -ah * 0.5;
        laBox.castShadow = true;
        leftArmPivot.add(laBox);
        const lHand = new THREE.Mesh(new THREE.BoxGeometry(aw * 0.85, aw * 0.85, aw * 0.85), skinMat);
        lHand.position.y = -ah - aw * 0.25;
        leftArmPivot.add(lHand);
        group.add(leftArmPivot);

        const rightArmPivot = new THREE.Group();
        rightArmPivot.position.set(0.125 * s, 0.42 * s, 0);
        const raBox = new THREE.Mesh(new THREE.BoxGeometry(aw, ah, aw), shirtMat);
        raBox.position.y = -ah * 0.5;
        raBox.castShadow = true;
        rightArmPivot.add(raBox);
        const rHand = new THREE.Mesh(new THREE.BoxGeometry(aw * 0.85, aw * 0.85, aw * 0.85), skinMat);
        rHand.position.y = -ah - aw * 0.25;
        rightArmPivot.add(rHand);
        group.add(rightArmPivot);

        // ---- LEGS (animated pivots, box shapes with shoes) ----
        const lw = 0.06 * s;  // leg width
        const lh = 0.15 * s;  // leg height

        const leftLegPivot = new THREE.Group();
        leftLegPivot.position.set(-0.05 * s, 0.26 * s, 0);
        const llBox = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, lw), pantsMat);
        llBox.position.y = -lh * 0.5;
        llBox.castShadow = true;
        leftLegPivot.add(llBox);
        const lShoe = new THREE.Mesh(new THREE.BoxGeometry(lw * 1.15, lw * 0.6, lw * 1.5), shoeMat);
        lShoe.position.set(0, -lh - lw * 0.1, -lw * 0.15);
        leftLegPivot.add(lShoe);
        group.add(leftLegPivot);

        const rightLegPivot = new THREE.Group();
        rightLegPivot.position.set(0.05 * s, 0.26 * s, 0);
        const rlBox = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, lw), pantsMat);
        rlBox.position.y = -lh * 0.5;
        rlBox.castShadow = true;
        rightLegPivot.add(rlBox);
        const rShoe = new THREE.Mesh(new THREE.BoxGeometry(lw * 1.15, lw * 0.6, lw * 1.5), shoeMat);
        rShoe.position.set(0, -lh - lw * 0.1, -lw * 0.15);
        rightLegPivot.add(rShoe);
        group.add(rightLegPivot);

        // Store limb references for animation
        group.userData.limbs = {
            leftArm: leftArmPivot, rightArm: rightArmPivot,
            leftLeg: leftLegPivot, rightLeg: rightLegPivot,
            head, scale: s
        };

        // ---- Personality decorations ----
        if (personality === 'CRIMINAL') {
            const aura = new THREE.Mesh(
                new THREE.RingGeometry(0.22, 0.3, 12),
                new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
            aura.rotation.x = -Math.PI / 2;
            aura.position.y = 0.02;
            group.add(aura);
        }
        if (personality === 'LEADER') {
            // Golden crown
            const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.6 });
            const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(hs * 0.5, hs * 0.55, 0.04 * s, 6), crownMat);
            crownBase.position.y = 0.65 * s;
            group.add(crownBase);
            for (let i = 0; i < 5; i++) {
                const pt = new THREE.Mesh(new THREE.ConeGeometry(0.012 * s, 0.04 * s, 4), crownMat);
                const a = (i / 5) * Math.PI * 2;
                pt.position.set(Math.sin(a) * hs * 0.42, 0.69 * s, Math.cos(a) * hs * 0.42);
                group.add(pt);
            }
        }
        if (personality === 'SCHOLAR') {
            const hatMat = new THREE.MeshLambertMaterial({ color: 0x222244 });
            const hat = new THREE.Mesh(new THREE.BoxGeometry(hs * 1.3, 0.06 * s, hs * 1.3), hatMat);
            hat.position.y = 0.67 * s;
            group.add(hat);
            const top = new THREE.Mesh(new THREE.BoxGeometry(hs * 0.9, 0.06 * s, hs * 0.9), hatMat);
            top.position.y = 0.72 * s;
            group.add(top);
            // Tassel
            const tassel = new THREE.Mesh(new THREE.BoxGeometry(0.01 * s, 0.06 * s, 0.01 * s),
                new THREE.MeshLambertMaterial({ color: 0xffcc00 }));
            tassel.position.set(hs * 0.6, 0.67 * s, 0);
            group.add(tassel);
        }
        if (personality === 'WARRIOR') {
            // Sword on back
            const swordMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7, roughness: 0.3 });
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.015 * s, 0.22 * s, 0.005 * s), swordMat);
            blade.position.set(0.06 * s, 0.45 * s, 0.07 * s);
            blade.rotation.z = 0.15;
            group.add(blade);
            const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 0.015 * s, 0.015 * s),
                new THREE.MeshLambertMaterial({ color: 0x5a3a1a }));
            hilt.position.set(0.055 * s, 0.33 * s, 0.07 * s);
            group.add(hilt);
        }
        if (personality === 'HEALER') {
            // Soft green glow + staff
            const glow = new THREE.Mesh(
                new THREE.SphereGeometry(0.28 * s, 8, 6),
                new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.15 }));
            glow.position.y = 0.35 * s;
            group.add(glow);
            // Staff
            const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.01 * s, 0.01 * s, 0.45 * s, 4),
                new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
            staff.position.set(-0.15 * s, 0.35 * s, 0.04 * s);
            group.add(staff);
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.025 * s, 6, 4),
                new THREE.MeshBasicMaterial({ color: 0x66ffaa, emissive: 0x22aa44 }));
            orb.position.set(-0.15 * s, 0.58 * s, 0.04 * s);
            group.add(orb);
        }

        return group;
    }

    // ==================== ANIMALS ====================
    // Helper: 4-legged box-style animal with animated legs
    _makeQuadrupedBox(group, mat, cfg) {
        const { bodyW, bodyH, bodyL, bodyY, legW, legH, headW, headH, headZ, headY } = cfg;
        // Boxy body
        const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyL), mat);
        body.position.y = bodyY;
        body.castShadow = true;
        group.add(body);

        // 4 box legs with animated pivots
        const legs = {};
        const positions = [
            ['fl', -bodyW * 0.35, bodyY - bodyH * 0.4, -bodyL * 0.32],
            ['fr', bodyW * 0.35, bodyY - bodyH * 0.4, -bodyL * 0.32],
            ['bl', -bodyW * 0.35, bodyY - bodyH * 0.4, bodyL * 0.32],
            ['br', bodyW * 0.35, bodyY - bodyH * 0.4, bodyL * 0.32],
        ];
        for (const [name, x, y, z] of positions) {
            const pivot = new THREE.Group();
            pivot.position.set(x, y, z);
            const legMesh = new THREE.Mesh(new THREE.BoxGeometry(legW, legH, legW), mat);
            legMesh.position.y = -legH * 0.5;
            legMesh.castShadow = true;
            pivot.add(legMesh);
            // Hoof/paw
            const hoof = new THREE.Mesh(new THREE.BoxGeometry(legW * 1.15, legW * 0.5, legW * 1.3),
                new THREE.MeshLambertMaterial({ color: 0x2a1a0a }));
            hoof.position.y = -legH;
            pivot.add(hoof);
            group.add(pivot);
            legs[name] = pivot;
        }
        group.userData.limbs = { ...legs, type: 'quadruped' };

        // Head box
        const headMat = mat.clone ? mat.clone() : mat;
        const head = new THREE.Mesh(new THREE.BoxGeometry(headW, headH, headW * 0.9), headMat);
        head.position.set(0, headY, headZ);
        head.castShadow = true;
        group.add(head);

        return { body, head };
    }

    // Helper: add cute dot eyes to an animal head
    _addEyes(group, y, z, spacing, size) {
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        for (const dx of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(size, 5, 4), eyeMat);
            eye.position.set(dx * spacing, y, z);
            group.add(eye);
            const wh = new THREE.Mesh(new THREE.SphereGeometry(size * 0.4, 3, 2), whiteMat);
            wh.position.set(dx * spacing + size * 0.3, y + size * 0.3, z - size * 0.1);
            group.add(wh);
        }
    }

    createAnimalMesh(animal) {
        const type = animal.type;
        const config = ANIMAL_TYPE[type];
        if (!config) return null;

        const color = new THREE.Color(config.color);
        const mat = new THREE.MeshLambertMaterial({ color });
        const group = new THREE.Group();

        switch (type) {
            case 'RABBIT': {
                // Round boxy bunny
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.2), mat);
                body.position.y = 0.16;
                body.castShadow = true;
                group.add(body);
                // Head (slightly bigger for cute)
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.1), mat);
                head.position.set(0, 0.24, -0.12);
                group.add(head);
                // Eyes
                this._addEyes(group, 0.25, -0.17, 0.035, 0.012);
                // Nose
                group.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.01, 3, 2),
                    new THREE.MeshBasicMaterial({ color: 0xffaaaa })),
                    { position: new THREE.Vector3(0, 0.235, -0.175) }));
                // Long ears
                for (const dx of [-0.035, 0.035]) {
                    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.02), mat);
                    ear.position.set(dx, 0.35, -0.1);
                    group.add(ear);
                    // Inner ear (pink)
                    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.005),
                        new THREE.MeshLambertMaterial({ color: 0xffbbbb }));
                    inner.position.set(dx, 0.35, -0.11);
                    group.add(inner);
                }
                // Fluffy tail
                const tail = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4),
                    new THREE.MeshLambertMaterial({ color: 0xffffff }));
                tail.position.set(0, 0.15, 0.12);
                group.add(tail);
                // Animated back legs
                const legs = {};
                for (const [name, x, z] of [['bl', -0.05, 0.06], ['br', 0.05, 0.06]]) {
                    const pivot = new THREE.Group();
                    pivot.position.set(x, 0.1, z);
                    const legM = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.035), mat);
                    legM.position.y = -0.05;
                    pivot.add(legM);
                    group.add(pivot);
                    legs[name] = pivot;
                }
                // Front legs (static)
                for (const dx of [-0.04, 0.04]) {
                    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.03), mat);
                    fl.position.set(dx, 0.08, -0.06);
                    group.add(fl);
                }
                group.userData.limbs = { ...legs, type: 'rabbit' };
                break;
            }
            case 'DEER': {
                this._makeQuadrupedBox(group, mat, {
                    bodyW: 0.2, bodyH: 0.16, bodyL: 0.32, bodyY: 0.4,
                    legW: 0.035, legH: 0.25, headW: 0.1, headH: 0.1, headZ: -0.24, headY: 0.48
                });
                this._addEyes(group, 0.5, -0.29, 0.035, 0.012);
                // Antlers
                const antlerMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
                for (const dx of [-1, 1]) {
                    const base = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.14, 0.015), antlerMat);
                    base.position.set(dx * 0.04, 0.58, -0.22);
                    base.rotation.z = dx * -0.25;
                    group.add(base);
                    const branch = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.012), antlerMat);
                    branch.position.set(dx * 0.06, 0.62, -0.2);
                    branch.rotation.z = dx * -0.6;
                    group.add(branch);
                }
                // Short tail
                const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.04),
                    new THREE.MeshLambertMaterial({ color: 0xffffff }));
                tail.position.set(0, 0.42, 0.18);
                group.add(tail);
                break;
            }
            case 'WOLF': {
                const darkMat = new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.8) });
                this._makeQuadrupedBox(group, mat, {
                    bodyW: 0.18, bodyH: 0.14, bodyL: 0.28, bodyY: 0.3,
                    legW: 0.035, legH: 0.18, headW: 0.11, headH: 0.09, headZ: -0.22, headY: 0.34
                });
                this._addEyes(group, 0.36, -0.28, 0.03, 0.012);
                // Snout
                const snout = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.07), mat);
                snout.position.set(0, 0.315, -0.3);
                group.add(snout);
                // Nose
                group.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 3),
                    new THREE.MeshBasicMaterial({ color: 0x111111 })),
                    { position: new THREE.Vector3(0, 0.33, -0.34) }));
                // Ears (pointed)
                for (const dx of [-1, 1]) {
                    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), darkMat);
                    ear.position.set(dx * 0.04, 0.41, -0.2);
                    group.add(ear);
                }
                // Bushy tail
                const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.14), darkMat);
                tail.position.set(0, 0.3, 0.22);
                tail.rotation.x = -0.5;
                group.add(tail);
                break;
            }
            case 'BEAR': {
                this._makeQuadrupedBox(group, mat, {
                    bodyW: 0.28, bodyH: 0.22, bodyL: 0.3, bodyY: 0.36,
                    legW: 0.06, legH: 0.2, headW: 0.16, headH: 0.14, headZ: -0.2, headY: 0.46
                });
                this._addEyes(group, 0.49, -0.29, 0.04, 0.015);
                // Round ears
                for (const dx of [-1, 1]) {
                    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), mat);
                    ear.position.set(dx * 0.07, 0.56, -0.18);
                    group.add(ear);
                }
                // Snout
                const snoutMat = new THREE.MeshLambertMaterial({ color: color.clone().lerp(new THREE.Color(0xffffff), 0.3) });
                const snout = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), snoutMat);
                snout.position.set(0, 0.43, -0.3);
                group.add(snout);
                // Nose
                group.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 3),
                    new THREE.MeshBasicMaterial({ color: 0x111111 })),
                    { position: new THREE.Vector3(0, 0.45, -0.34) }));
                break;
            }
            case 'BIRD': {
                const flyH = 1.5 + Math.random() * 2;
                // Roundish body
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.1), mat);
                body.position.y = flyH;
                body.castShadow = true;
                group.add(body);
                // Head
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.065, 0.065), mat);
                head.position.set(0, flyH + 0.05, -0.04);
                group.add(head);
                // Eyes
                this._addEyes(group, flyH + 0.055, -0.075, 0.02, 0.008);
                // Beak
                const beak = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 4),
                    new THREE.MeshLambertMaterial({ color: 0xffaa00 }));
                beak.position.set(0, flyH + 0.04, -0.085);
                beak.rotation.x = Math.PI / 2;
                group.add(beak);
                // Animated wings (flat box shapes)
                const wingMat = new THREE.MeshLambertMaterial({
                    color: color.clone().multiplyScalar(0.8), side: THREE.DoubleSide });
                const leftWing = new THREE.Group();
                leftWing.position.set(-0.04, flyH, 0);
                const lw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.06), wingMat);
                lw.position.x = -0.07;
                leftWing.add(lw);
                group.add(leftWing);
                const rightWing = new THREE.Group();
                rightWing.position.set(0.04, flyH, 0);
                const rw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.06), wingMat);
                rw.position.x = 0.07;
                rightWing.add(rw);
                group.add(rightWing);
                // Tail feathers
                const tf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.04), wingMat);
                tf.position.set(0, flyH - 0.01, 0.08);
                group.add(tf);
                group.userData.limbs = { leftWing, rightWing, type: 'bird', flyH };
                break;
            }
            case 'FISH': {
                // Boxy fish
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.18), mat);
                body.position.y = -0.3;
                body.castShadow = true;
                group.add(body);
                // Eyes on the sides
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
                for (const dx of [-1, 1]) {
                    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 3), eyeMat);
                    eye.position.set(dx * 0.042, -0.28, -0.05);
                    group.add(eye);
                }
                // Tail pivot
                const tailPivot = new THREE.Group();
                tailPivot.position.set(0, -0.3, 0.1);
                const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.08, 0.06),
                    new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.8) }));
                tailMesh.position.z = 0.04;
                tailPivot.add(tailMesh);
                group.add(tailPivot);
                // Fins
                const finMat = new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.7), side: THREE.DoubleSide });
                const topFin = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.06), finMat);
                topFin.position.set(0, -0.23, 0);
                group.add(topFin);
                group.userData.limbs = { tail: tailPivot, type: 'fish' };
                break;
            }
            default: {
                // Generic animal - visible blob with eyes
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.16), mat);
                body.position.y = 0.1;
                body.castShadow = true;
                group.add(body);
                this._addEyes(group, 0.12, -0.08, 0.03, 0.01);
            }
        }
        return group;
    }

    // ==================== DINOSAURS ====================
    // Helper: animated biped legs for dinosaurs
    _makeDinoLegs2(group, mat, s, xSpread, attachY) {
        const legs = {};
        for (const [name, dx] of [['left', -xSpread], ['right', xSpread]]) {
            const pivot = new THREE.Group();
            pivot.position.set(dx, attachY, 0);
            const thigh = new THREE.Mesh(new THREE.BoxGeometry(s * 0.14, s * 0.35, s * 0.14), mat);
            thigh.position.y = -s * 0.2;
            thigh.castShadow = true;
            pivot.add(thigh);
            const foot = new THREE.Mesh(new THREE.BoxGeometry(s * 0.2, s * 0.06, s * 0.24), mat);
            foot.position.set(0, -s * 0.42, -s * 0.04);
            pivot.add(foot);
            group.add(pivot);
            legs[name] = pivot;
        }
        group.userData.limbs = { ...legs, type: 'biped', scale: s };
    }

    // Helper: animated quadruped legs for dinosaurs
    _makeDinoLegs4(group, mat, s, positions) {
        const legs = {};
        for (const [name, x, y, z] of positions) {
            const pivot = new THREE.Group();
            pivot.position.set(x, y, z);
            const legM = new THREE.Mesh(new THREE.BoxGeometry(s * 0.12, s * 0.5, s * 0.12), mat);
            legM.position.y = -s * 0.25;
            legM.castShadow = true;
            pivot.add(legM);
            const hoof = new THREE.Mesh(new THREE.BoxGeometry(s * 0.15, s * 0.06, s * 0.18), mat);
            hoof.position.y = -s * 0.52;
            pivot.add(hoof);
            group.add(pivot);
            legs[name] = pivot;
        }
        group.userData.limbs = { ...legs, type: 'quadruped' };
    }

    createDinoMesh(dino) {
        const config = DINOSAUR_TYPE[dino.type];
        if (!config) return null;

        const color = new THREE.Color(config.color);
        const mat = new THREE.MeshLambertMaterial({ color });
        const bellyMat = new THREE.MeshLambertMaterial({ color: color.clone().lerp(new THREE.Color(0xffffff), 0.3) });
        const group = new THREE.Group();
        const s = config.size * 0.35;

        switch (dino.type) {
            case 'TREX': {
                // Massive boxy body
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.7, s * 0.65, s * 0.8), mat);
                body.position.y = s * 1.1;
                body.castShadow = true;
                group.add(body);
                // Big boxy head
                const head = new THREE.Mesh(new THREE.BoxGeometry(s * 0.55, s * 0.42, s * 0.6), mat);
                head.position.set(0, s * 1.65, -s * 0.55);
                head.castShadow = true;
                group.add(head);
                // Lower jaw
                const jaw = new THREE.Mesh(new THREE.BoxGeometry(s * 0.45, s * 0.15, s * 0.5), bellyMat);
                jaw.position.set(0, s * 1.38, -s * 0.52);
                group.add(jaw);
                // Teeth row
                const teethMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                for (let i = 0; i < 4; i++) {
                    const tooth = new THREE.Mesh(new THREE.ConeGeometry(s * 0.02, s * 0.06, 3), teethMat);
                    tooth.position.set((i - 1.5) * s * 0.1, s * 1.42, -s * 0.78);
                    tooth.rotation.x = Math.PI;
                    group.add(tooth);
                }
                // Eyes (menacing red)
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
                for (const dx of [-1, 1]) {
                    const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.055, 5, 4), eyeMat);
                    eye.position.set(dx * s * 0.24, s * 1.75, -s * 0.82);
                    group.add(eye);
                    const pupil = new THREE.Mesh(new THREE.SphereGeometry(s * 0.03, 4, 3),
                        new THREE.MeshBasicMaterial({ color: 0x110000 }));
                    pupil.position.set(dx * s * 0.24, s * 1.75, -s * 0.87);
                    group.add(pupil);
                }
                // Tiny arms (boxy)
                for (const dx of [-1, 1]) {
                    const arm = new THREE.Mesh(new THREE.BoxGeometry(s * 0.08, s * 0.18, s * 0.08), mat);
                    arm.position.set(dx * s * 0.32, s * 1.15, -s * 0.2);
                    arm.rotation.z = dx * 0.4;
                    group.add(arm);
                }
                // Tail (tapered boxes)
                for (let i = 0; i < 3; i++) {
                    const tw = s * (0.35 - i * 0.1);
                    const seg = new THREE.Mesh(new THREE.BoxGeometry(tw, s * 0.2, s * 0.35), mat);
                    seg.position.set(0, s * (0.9 - i * 0.15), s * (0.5 + i * 0.35));
                    seg.rotation.x = -0.15 * (i + 1);
                    group.add(seg);
                }
                // Legs
                this._makeDinoLegs2(group, mat, s, s * 0.22, s * 0.75);
                break;
            }
            case 'BRONTO': {
                // Massive oval body
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.9, s * 0.7, s * 1.0), mat);
                body.position.y = s * 1.2;
                body.castShadow = true;
                group.add(body);
                // Long neck (segmented boxes)
                for (let i = 0; i < 4; i++) {
                    const nw = s * (0.25 - i * 0.03);
                    const seg = new THREE.Mesh(new THREE.BoxGeometry(nw, s * 0.25, nw), mat);
                    seg.position.set(0, s * (1.6 + i * 0.3), -s * (0.35 + i * 0.2));
                    group.add(seg);
                }
                // Small friendly head
                const head = new THREE.Mesh(new THREE.BoxGeometry(s * 0.2, s * 0.16, s * 0.22), mat);
                head.position.set(0, s * 2.85, -s * 1.2);
                group.add(head);
                // Gentle eyes
                this._addEyes(group, s * 2.87, -s * 1.32, s * 0.06, s * 0.025);
                // Tail (segmented)
                for (let i = 0; i < 3; i++) {
                    const tw = s * (0.2 - i * 0.05);
                    const seg = new THREE.Mesh(new THREE.BoxGeometry(tw, tw, s * 0.4), mat);
                    seg.position.set(0, s * (1.0 - i * 0.12), s * (0.6 + i * 0.4));
                    group.add(seg);
                }
                // Thick legs
                this._makeDinoLegs4(group, mat, s,
                    [['fl', -s*0.3, s*0.8, -s*0.25], ['fr', s*0.3, s*0.8, -s*0.25],
                     ['bl', -s*0.3, s*0.8, s*0.25], ['br', s*0.3, s*0.8, s*0.25]]);
                break;
            }
            case 'TRICERATOPS': {
                // Bulky body
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.7, s * 0.55, s * 0.9), mat);
                body.position.y = s * 0.8;
                body.castShadow = true;
                group.add(body);
                // Head
                const head = new THREE.Mesh(new THREE.BoxGeometry(s * 0.45, s * 0.4, s * 0.35), mat);
                head.position.set(0, s * 0.85, -s * 0.55);
                head.castShadow = true;
                group.add(head);
                // Frill (flat box behind head)
                const frillMat = new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.8) });
                const frill = new THREE.Mesh(new THREE.BoxGeometry(s * 0.65, s * 0.45, s * 0.04), frillMat);
                frill.position.set(0, s * 1.05, -s * 0.35);
                frill.rotation.x = -0.2;
                group.add(frill);
                // Eyes
                this._addEyes(group, s * 0.9, -s * 0.73, s * 0.12, s * 0.03);
                // 3 horns
                const hornMat = new THREE.MeshLambertMaterial({ color: 0xf0e0c0 });
                const horn1 = new THREE.Mesh(new THREE.ConeGeometry(s * 0.04, s * 0.3, 4), hornMat);
                horn1.position.set(0, s * 0.88, -s * 0.78);
                horn1.rotation.x = Math.PI / 2.5;
                group.add(horn1);
                for (const dx of [-1, 1]) {
                    const horn = new THREE.Mesh(new THREE.ConeGeometry(s * 0.035, s * 0.35, 4), hornMat);
                    horn.position.set(dx * s * 0.15, s * 1.0, -s * 0.7);
                    horn.rotation.x = Math.PI / 3;
                    horn.rotation.z = dx * -0.15;
                    group.add(horn);
                }
                // Legs
                this._makeDinoLegs4(group, mat, s,
                    [['fl', -s*0.25, s*0.5, -s*0.2], ['fr', s*0.25, s*0.5, -s*0.2],
                     ['bl', -s*0.25, s*0.5, s*0.2], ['br', s*0.25, s*0.5, s*0.2]]);
                break;
            }
            case 'RAPTOR': {
                // Sleek body
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.3, s * 0.28, s * 0.5), mat);
                body.position.y = s * 0.7;
                body.rotation.x = 0.15;
                body.castShadow = true;
                group.add(body);
                // Pointed head
                const head = new THREE.Mesh(new THREE.BoxGeometry(s * 0.2, s * 0.18, s * 0.28), mat);
                head.position.set(0, s * 0.88, -s * 0.38);
                group.add(head);
                // Sharp eyes
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
                for (const dx of [-1, 1]) {
                    const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.03, 5, 4), eyeMat);
                    eye.position.set(dx * s * 0.09, s * 0.92, -s * 0.52);
                    group.add(eye);
                    const pupil = new THREE.Mesh(new THREE.SphereGeometry(s * 0.015, 3, 2),
                        new THREE.MeshBasicMaterial({ color: 0x111100 }));
                    pupil.position.set(dx * s * 0.09, s * 0.92, -s * 0.55);
                    group.add(pupil);
                }
                // Claw arms
                for (const dx of [-1, 1]) {
                    const arm = new THREE.Mesh(new THREE.BoxGeometry(s * 0.06, s * 0.2, s * 0.06), mat);
                    arm.position.set(dx * s * 0.18, s * 0.6, -s * 0.15);
                    arm.rotation.z = dx * 0.5;
                    group.add(arm);
                    // Claws
                    const claw = new THREE.Mesh(new THREE.ConeGeometry(s * 0.015, s * 0.06, 3),
                        new THREE.MeshLambertMaterial({ color: 0xddd8c0 }));
                    claw.position.set(dx * s * 0.2, s * 0.48, -s * 0.15);
                    claw.rotation.x = Math.PI;
                    group.add(claw);
                }
                // Long tail
                for (let i = 0; i < 3; i++) {
                    const tw = s * (0.12 - i * 0.03);
                    const seg = new THREE.Mesh(new THREE.BoxGeometry(tw, tw, s * 0.2), mat);
                    seg.position.set(0, s * (0.55 - i * 0.08), s * (0.3 + i * 0.2));
                    group.add(seg);
                }
                // Legs
                this._makeDinoLegs2(group, mat, s, s * 0.12, s * 0.52);
                break;
            }
            case 'PTERANODON': {
                const flyH = s * 2.5;
                // Body
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.18, s * 0.14, s * 0.28), mat);
                body.position.y = flyH;
                body.castShadow = true;
                group.add(body);
                // Head with crest
                const head = new THREE.Mesh(new THREE.BoxGeometry(s * 0.12, s * 0.1, s * 0.18), mat);
                head.position.set(0, flyH + s * 0.08, -s * 0.18);
                group.add(head);
                const crest = new THREE.Mesh(new THREE.ConeGeometry(s * 0.04, s * 0.2, 3), mat);
                crest.position.set(0, flyH + s * 0.15, -s * 0.08);
                crest.rotation.x = -0.5;
                group.add(crest);
                // Beak
                const beak = new THREE.Mesh(new THREE.ConeGeometry(s * 0.03, s * 0.15, 4),
                    new THREE.MeshLambertMaterial({ color: 0xddcc80 }));
                beak.position.set(0, flyH + s * 0.04, -s * 0.32);
                beak.rotation.x = Math.PI / 2;
                group.add(beak);
                // Eyes
                this._addEyes(group, flyH + s * 0.1, -s * 0.27, s * 0.04, s * 0.015);
                // Wings (animated box panels)
                const wingMat = new THREE.MeshLambertMaterial({
                    color: color.clone().multiplyScalar(0.85), side: THREE.DoubleSide });
                const leftWing = new THREE.Group();
                leftWing.position.set(-s * 0.1, flyH, 0);
                const lwMesh = new THREE.Mesh(new THREE.BoxGeometry(s * 1.2, s * 0.02, s * 0.35), wingMat);
                lwMesh.position.x = -s * 0.55;
                lwMesh.castShadow = true;
                leftWing.add(lwMesh);
                group.add(leftWing);
                const rightWing = new THREE.Group();
                rightWing.position.set(s * 0.1, flyH, 0);
                const rwMesh = new THREE.Mesh(new THREE.BoxGeometry(s * 1.2, s * 0.02, s * 0.35), wingMat);
                rwMesh.position.x = s * 0.55;
                rwMesh.castShadow = true;
                rightWing.add(rwMesh);
                group.add(rightWing);
                group.userData.limbs = { leftWing, rightWing, type: 'flying', flyH };
                break;
            }
            case 'STEGO': {
                // Stout body
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.6, s * 0.5, s * 0.9), mat);
                body.position.y = s * 0.8;
                body.castShadow = true;
                group.add(body);
                // Small head
                const head = new THREE.Mesh(new THREE.BoxGeometry(s * 0.22, s * 0.18, s * 0.22), mat);
                head.position.set(0, s * 0.72, -s * 0.52);
                group.add(head);
                // Eyes
                this._addEyes(group, s * 0.74, -s * 0.64, s * 0.06, s * 0.02);
                // Back plates (diamond box shapes)
                const plateMat = new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.7) });
                for (let i = 0; i < 7; i++) {
                    const pH = s * (0.18 + Math.sin((i / 6) * Math.PI) * 0.1);
                    const plate = new THREE.Mesh(new THREE.BoxGeometry(s * 0.03, pH, s * 0.06), plateMat);
                    plate.position.set(0, s * 1.1 + pH * 0.3, -s * 0.3 + i * s * 0.12);
                    plate.rotation.z = Math.PI * 0.25;
                    plate.castShadow = true;
                    group.add(plate);
                }
                // Tail spikes
                const spikeMat = new THREE.MeshLambertMaterial({ color: 0xddc080 });
                for (const dx of [-1, 1]) {
                    for (let i = 0; i < 2; i++) {
                        const spike = new THREE.Mesh(new THREE.ConeGeometry(s * 0.03, s * 0.2, 4), spikeMat);
                        spike.position.set(dx * s * 0.15, s * 0.7, s * 0.55 + i * s * 0.12);
                        spike.rotation.z = dx * 0.7;
                        group.add(spike);
                    }
                }
                // Legs
                this._makeDinoLegs4(group, mat, s,
                    [['fl', -s*0.22, s*0.5, -s*0.2], ['fr', s*0.22, s*0.5, -s*0.2],
                     ['bl', -s*0.22, s*0.5, s*0.2], ['br', s*0.22, s*0.5, s*0.2]]);
                break;
            }
            default: {
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.45, s * 0.4, s * 0.55), mat);
                body.position.y = s * 0.8;
                body.castShadow = true;
                group.add(body);
                const head = new THREE.Mesh(new THREE.BoxGeometry(s * 0.25, s * 0.22, s * 0.25), mat);
                head.position.set(0, s * 1.15, -s * 0.3);
                group.add(head);
                this._addEyes(group, s * 1.18, -s * 0.43, s * 0.06, s * 0.02);
                this._makeDinoLegs2(group, mat, s, s * 0.15, s * 0.55);
            }
        }
        return group;
    }

    // ==================== GIANTS ====================
    createGiantMesh(giant) {
        const s = (giant.giantSize || GIANT_CONFIG.baseSize) * 0.3;
        const color = new THREE.Color(GIANT_CONFIG.color);
        const mat = new THREE.MeshLambertMaterial({ color });
        const group = new THREE.Group();

        // Massive boxy body
        const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.6, s * 0.7, s * 0.5), mat);
        body.position.y = s * 1.1;
        body.castShadow = true;
        group.add(body);

        // Big boxy head
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xc4a882 });
        const head = new THREE.Mesh(new THREE.BoxGeometry(s * 0.4, s * 0.35, s * 0.35), skinMat);
        head.position.y = s * 1.75;
        head.castShadow = true;
        group.add(head);

        // Angry glowing eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        for (const dx of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.05, 5, 4), eyeMat);
            eye.position.set(dx * s * 0.12, s * 1.8, -s * 0.17);
            group.add(eye);
        }
        // Mouth
        const mouthMat = new THREE.MeshBasicMaterial({ color: 0x331111 });
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(s * 0.2, s * 0.04, s * 0.02), mouthMat);
        mouth.position.set(0, s * 1.66, -s * 0.17);
        group.add(mouth);

        // Huge arms (animated pivots, boxy)
        const leftArm = new THREE.Group();
        leftArm.position.set(-s * 0.38, s * 1.35, 0);
        const laBox = new THREE.Mesh(new THREE.BoxGeometry(s * 0.18, s * 0.55, s * 0.18), mat);
        laBox.position.y = -s * 0.3;
        laBox.castShadow = true;
        leftArm.add(laBox);
        const lFist = new THREE.Mesh(new THREE.BoxGeometry(s * 0.16, s * 0.14, s * 0.16), skinMat);
        lFist.position.y = -s * 0.6;
        leftArm.add(lFist);
        group.add(leftArm);

        const rightArm = new THREE.Group();
        rightArm.position.set(s * 0.38, s * 1.35, 0);
        const raBox = new THREE.Mesh(new THREE.BoxGeometry(s * 0.18, s * 0.55, s * 0.18), mat);
        raBox.position.y = -s * 0.3;
        raBox.castShadow = true;
        rightArm.add(raBox);
        const rFist = new THREE.Mesh(new THREE.BoxGeometry(s * 0.16, s * 0.14, s * 0.16), skinMat);
        rFist.position.y = -s * 0.6;
        rightArm.add(rFist);
        group.add(rightArm);

        // Club weapon in right hand
        const clubMat = new THREE.MeshLambertMaterial({ color: 0x5a4020 });
        const club = new THREE.Mesh(new THREE.BoxGeometry(s * 0.08, s * 0.5, s * 0.08), clubMat);
        club.position.y = -s * 0.85;
        rightArm.add(club);
        const clubHead = new THREE.Mesh(new THREE.BoxGeometry(s * 0.15, s * 0.12, s * 0.15), clubMat);
        clubHead.position.y = -s * 1.1;
        rightArm.add(clubHead);

        // Thick legs (animated pivots, boxy)
        const leftLeg = new THREE.Group();
        leftLeg.position.set(-s * 0.18, s * 0.65, 0);
        const llBox = new THREE.Mesh(new THREE.BoxGeometry(s * 0.2, s * 0.5, s * 0.2), mat);
        llBox.position.y = -s * 0.28;
        llBox.castShadow = true;
        leftLeg.add(llBox);
        const lFoot = new THREE.Mesh(new THREE.BoxGeometry(s * 0.24, s * 0.08, s * 0.28), mat);
        lFoot.position.set(0, -s * 0.55, -s * 0.04);
        leftLeg.add(lFoot);
        group.add(leftLeg);

        const rightLeg = new THREE.Group();
        rightLeg.position.set(s * 0.18, s * 0.65, 0);
        const rlBox = new THREE.Mesh(new THREE.BoxGeometry(s * 0.2, s * 0.5, s * 0.2), mat);
        rlBox.position.y = -s * 0.28;
        rlBox.castShadow = true;
        rightLeg.add(rlBox);
        const rFoot = new THREE.Mesh(new THREE.BoxGeometry(s * 0.24, s * 0.08, s * 0.28), mat);
        rFoot.position.set(0, -s * 0.55, -s * 0.04);
        rightLeg.add(rFoot);
        group.add(rightLeg);

        group.userData.limbs = { leftArm, rightArm, leftLeg, rightLeg, scale: s };

        // Loincloth / belt
        const clothMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(s * 0.62, s * 0.1, s * 0.52), clothMat);
        cloth.position.y = s * 0.72;
        group.add(cloth);

        return group;
    }

    // ==================== VEHICLES ====================
    createVehicleMesh(vehicle) {
        const config = VEHICLE_TYPE[vehicle.type];
        if (!config) return null;

        const color = new THREE.Color(config.color);
        const mat = new THREE.MeshLambertMaterial({ color });
        const group = new THREE.Group();
        const s = config.size * 0.35;

        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
        const windowMat = new THREE.MeshLambertMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.7 });

        // Helper: add box wheels
        const addWheels = (positions, radius, width) => {
            for (const [x, y, z] of positions) {
                const wheel = new THREE.Mesh(
                    new THREE.CylinderGeometry(radius, radius, width, 8), wheelMat);
                wheel.position.set(x, y, z);
                wheel.rotation.z = Math.PI / 2;
                group.add(wheel);
                // Hub cap
                const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.4, radius * 0.4, width * 1.1, 5),
                    new THREE.MeshLambertMaterial({ color: 0x888888 }));
                hub.position.set(x, y, z);
                hub.rotation.z = Math.PI / 2;
                group.add(hub);
            }
        };

        switch (vehicle.type) {
            case 'CART':
            case 'CARRIAGE': {
                // Wooden cart body
                const woodMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.2, s * 0.35), woodMat);
                body.position.y = s * 0.28;
                body.castShadow = true;
                group.add(body);
                // Side walls
                for (const dz of [-1, 1]) {
                    const wall = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.12, s * 0.02), woodMat);
                    wall.position.set(0, s * 0.38, dz * s * 0.17);
                    group.add(wall);
                }
                // Back wall
                const back = new THREE.Mesh(new THREE.BoxGeometry(s * 0.02, s * 0.12, s * 0.35), woodMat);
                back.position.set(s * 0.24, s * 0.38, 0);
                group.add(back);
                // Wheels (wooden)
                addWheels([
                    [-s * 0.18, s * 0.1, s * 0.22], [-s * 0.18, s * 0.1, -s * 0.22],
                    [s * 0.18, s * 0.1, s * 0.22], [s * 0.18, s * 0.1, -s * 0.22]
                ], s * 0.1, s * 0.03);
                break;
            }
            case 'TRAIN': {
                // Engine body (red/black)
                const engine = new THREE.Mesh(new THREE.BoxGeometry(s * 0.55, s * 0.35, s * 0.3), mat);
                engine.position.y = s * 0.3;
                engine.castShadow = true;
                group.add(engine);
                // Roof
                const roofMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
                const roof = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.04, s * 0.32), roofMat);
                roof.position.y = s * 0.5;
                group.add(roof);
                // Chimney
                const chimney = new THREE.Mesh(new THREE.BoxGeometry(s * 0.08, s * 0.18, s * 0.08), roofMat);
                chimney.position.set(-s * 0.18, s * 0.58, 0);
                group.add(chimney);
                // Smoke puff
                const smoke = new THREE.Mesh(new THREE.SphereGeometry(s * 0.06, 5, 4),
                    new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 }));
                smoke.position.set(-s * 0.18, s * 0.72, 0);
                group.add(smoke);
                // Windows
                for (const dx of [-s * 0.1, s * 0.05, s * 0.2]) {
                    const win = new THREE.Mesh(new THREE.BoxGeometry(s * 0.08, s * 0.1, s * 0.32), windowMat);
                    win.position.set(dx, s * 0.35, 0);
                    group.add(win);
                }
                // Carriages
                for (let i = 1; i <= 2; i++) {
                    const carMat = new THREE.MeshLambertMaterial({ color: i === 1 ? 0x8B4513 : 0x6B3510 });
                    const car = new THREE.Mesh(new THREE.BoxGeometry(s * 0.42, s * 0.28, s * 0.28), carMat);
                    car.position.set(i * s * 0.52, s * 0.25, 0);
                    car.castShadow = true;
                    group.add(car);
                    // Windows on carriages
                    for (const dz of [-1, 1]) {
                        const win = new THREE.Mesh(new THREE.BoxGeometry(s * 0.3, s * 0.08, s * 0.01), windowMat);
                        win.position.set(i * s * 0.52, s * 0.3, dz * s * 0.145);
                        group.add(win);
                    }
                }
                // Wheels
                for (let i = 0; i < 3; i++) {
                    addWheels([
                        [i * s * 0.52 - s * 0.15, s * 0.08, s * 0.18],
                        [i * s * 0.52 - s * 0.15, s * 0.08, -s * 0.18],
                        [i * s * 0.52 + s * 0.15, s * 0.08, s * 0.18],
                        [i * s * 0.52 + s * 0.15, s * 0.08, -s * 0.18]
                    ], s * 0.08, s * 0.02);
                }
                break;
            }
            case 'CAR': {
                // Car body
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.42, s * 0.14, s * 0.22), mat);
                body.position.y = s * 0.14;
                body.castShadow = true;
                group.add(body);
                // Cabin
                const cabin = new THREE.Mesh(new THREE.BoxGeometry(s * 0.22, s * 0.12, s * 0.2), windowMat);
                cabin.position.set(s * 0.02, s * 0.25, 0);
                group.add(cabin);
                // Headlights
                const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
                for (const dz of [-1, 1]) {
                    const hl = new THREE.Mesh(new THREE.BoxGeometry(s * 0.02, s * 0.04, s * 0.04), lightMat);
                    hl.position.set(-s * 0.22, s * 0.14, dz * s * 0.08);
                    group.add(hl);
                }
                // Wheels
                addWheels([
                    [-s * 0.12, s * 0.06, s * 0.13], [-s * 0.12, s * 0.06, -s * 0.13],
                    [s * 0.12, s * 0.06, s * 0.13], [s * 0.12, s * 0.06, -s * 0.13]
                ], s * 0.06, s * 0.025);
                break;
            }
            case 'BUS': {
                // Long bus body
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.65, s * 0.22, s * 0.22), mat);
                body.position.y = s * 0.2;
                body.castShadow = true;
                group.add(body);
                // Roof
                const roofMat = new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.8) });
                const roof = new THREE.Mesh(new THREE.BoxGeometry(s * 0.63, s * 0.03, s * 0.21), roofMat);
                roof.position.y = s * 0.33;
                group.add(roof);
                // Windows
                for (const dz of [-1, 1]) {
                    for (let i = 0; i < 4; i++) {
                        const win = new THREE.Mesh(new THREE.BoxGeometry(s * 0.1, s * 0.08, s * 0.01), windowMat);
                        win.position.set(-s * 0.2 + i * s * 0.14, s * 0.25, dz * s * 0.115);
                        group.add(win);
                    }
                }
                // Wheels
                addWheels([
                    [-s * 0.22, s * 0.06, s * 0.13], [-s * 0.22, s * 0.06, -s * 0.13],
                    [s * 0.22, s * 0.06, s * 0.13], [s * 0.22, s * 0.06, -s * 0.13]
                ], s * 0.06, s * 0.025);
                break;
            }
            case 'HORSE': {
                // Boxy horse with legs
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.12, s * 0.1, s * 0.22), mat);
                body.position.y = s * 0.22;
                body.castShadow = true;
                group.add(body);
                // Head
                const head = new THREE.Mesh(new THREE.BoxGeometry(s * 0.08, s * 0.09, s * 0.1), mat);
                head.position.set(0, s * 0.28, -s * 0.14);
                group.add(head);
                // Eyes
                this._addEyes(group, s * 0.3, -s * 0.19, s * 0.028, s * 0.008);
                // Ears
                for (const dx of [-1, 1]) {
                    const ear = new THREE.Mesh(new THREE.BoxGeometry(s * 0.015, s * 0.04, s * 0.015), mat);
                    ear.position.set(dx * s * 0.03, s * 0.34, -s * 0.13);
                    group.add(ear);
                }
                // Legs
                for (const [x, z] of [[-0.04, -0.07], [0.04, -0.07], [-0.04, 0.07], [0.04, 0.07]]) {
                    const leg = new THREE.Mesh(new THREE.BoxGeometry(s * 0.025, s * 0.14, s * 0.025), mat);
                    leg.position.set(x * s, s * 0.1, z * s);
                    group.add(leg);
                }
                // Mane
                const maneMat = new THREE.MeshLambertMaterial({ color: 0x2a1a0a });
                const mane = new THREE.Mesh(new THREE.BoxGeometry(s * 0.02, s * 0.06, s * 0.1), maneMat);
                mane.position.set(0, s * 0.3, -s * 0.04);
                group.add(mane);
                // Tail
                const tail = new THREE.Mesh(new THREE.BoxGeometry(s * 0.02, s * 0.08, s * 0.02), maneMat);
                tail.position.set(0, s * 0.2, s * 0.13);
                group.add(tail);
                break;
            }
            case 'FLYING_CAR': {
                // Futuristic flying vehicle
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.35, s * 0.12, s * 0.2), mat);
                body.position.y = 1.5;
                body.castShadow = true;
                group.add(body);
                // Windshield
                const wind = new THREE.Mesh(new THREE.BoxGeometry(s * 0.12, s * 0.08, s * 0.18), windowMat);
                wind.position.set(-s * 0.08, 1.56, 0);
                group.add(wind);
                // Glow rings (propulsion)
                for (const dz of [-0.08, 0.08]) {
                    const glow = new THREE.Mesh(
                        new THREE.TorusGeometry(s * 0.06, s * 0.008, 4, 8),
                        new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.7 }));
                    glow.position.set(s * 0.12, 1.44, dz * s);
                    glow.rotation.x = Math.PI / 2;
                    group.add(glow);
                }
                // Tail lights
                for (const dz of [-1, 1]) {
                    const tl = new THREE.Mesh(new THREE.BoxGeometry(s * 0.02, s * 0.03, s * 0.03),
                        new THREE.MeshBasicMaterial({ color: 0xff2200 }));
                    tl.position.set(s * 0.18, 1.5, dz * s * 0.08);
                    group.add(tl);
                }
                break;
            }
            default: {
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.4, s * 0.2, s * 0.2), mat);
                body.position.y = s * 0.15;
                body.castShadow = true;
                group.add(body);
                addWheels([
                    [-s * 0.12, s * 0.06, s * 0.12], [-s * 0.12, s * 0.06, -s * 0.12],
                    [s * 0.12, s * 0.06, s * 0.12], [s * 0.12, s * 0.06, -s * 0.12]
                ], s * 0.06, s * 0.02);
            }
        }
        return group;
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

        // Rain
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

        // Snow
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

        // Storm darkness
        if (weather === 'storm') {
            this.ambientLight.intensity = Math.max(0.1, this.ambientLight.intensity - 0.01);
            this.sunLight.intensity = Math.max(0.2, this.sunLight.intensity - 0.02);
            // Lightning flash
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

    // ==================== ENTITY SYNC ====================
    syncEntities() {
        const em = this.game.entityManager;

        this.syncPeople(em.people);
        this.syncBuildings(em.buildings);
        this.syncAnimals(em.animals);

        // Giants
        if (em.giants) this.syncGiants(em.giants);

        // Dinosaurs
        if (em.dinosaurs) this.syncDinosaurs(em.dinosaurs);

        // Vehicles
        if (em.vehicles) this.syncVehicles(em.vehicles);

        // New trees
        while (this.treeMeshes.length < em.trees.length) {
            const idx = this.treeMeshes.length;
            this.addTreeMesh(em.trees[idx]);
        }
    }

    syncPeople(people) {
        // Remove dead
        for (const [person, mesh] of this.personMeshes) {
            if (!person.alive || !people.includes(person)) {
                this.entityGroup.remove(mesh);
                this.disposeMesh(mesh);
                this.personMeshes.delete(person);
            }
        }
        // Add new / update positions
        for (const person of people) {
            if (!person.alive) continue;
            let mesh = this.personMeshes.get(person);
            if (!mesh) {
                mesh = this.createPersonMesh(person);
                this.entityGroup.add(mesh);
                this.personMeshes.set(person, mesh);
            }
            const h = this.getTerrainHeight(person.x, person.y);
            mesh.position.set(person.x, Math.max(0, h), person.y);

            // Face direction of movement
            if (person.prevX !== undefined) {
                const dx = person.x - person.prevX;
                const dz = person.y - person.prevY;
                if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                    mesh.rotation.y = Math.atan2(dx, dz);
                }
            }

            const limbs = mesh.userData.limbs;
            const isWalking = person.state === NPC_STATE.WALKING || person.state === NPC_STATE.FLEEING;
            const isWorking = person.state === NPC_STATE.WORKING || person.state === NPC_STATE.BUILDING;

            if (limbs) {
                if (isWalking) {
                    // Walk cycle: swing legs and arms
                    const speed = person.state === NPC_STATE.FLEEING ? 0.25 : 0.15;
                    const t = this.frame * speed + (person.x * 7); // phase offset per person
                    const swing = Math.sin(t) * 0.7;
                    limbs.leftLeg.rotation.x = swing;
                    limbs.rightLeg.rotation.x = -swing;
                    limbs.leftArm.rotation.x = -swing * 0.5;
                    limbs.rightArm.rotation.x = swing * 0.5;
                    // Slight body bob
                    mesh.position.y += Math.abs(Math.sin(t * 2)) * 0.03;
                } else if (isWorking) {
                    // Working animation: arms moving
                    const t = this.frame * 0.12;
                    limbs.leftArm.rotation.x = Math.sin(t) * 0.8;
                    limbs.rightArm.rotation.x = Math.sin(t + Math.PI) * 0.8;
                    limbs.leftLeg.rotation.x = 0;
                    limbs.rightLeg.rotation.x = 0;
                } else if (person.state === NPC_STATE.SLEEPING) {
                    mesh.rotation.z = Math.PI / 2;
                    mesh.position.y += 0.08;
                    limbs.leftLeg.rotation.x = 0.3;
                    limbs.rightLeg.rotation.x = 0.3;
                    limbs.leftArm.rotation.x = 0.3;
                    limbs.rightArm.rotation.x = 0.3;
                } else {
                    // Idle: gentle breathing/sway
                    const t = this.frame * 0.04 + person.x;
                    limbs.leftArm.rotation.x = Math.sin(t) * 0.05;
                    limbs.rightArm.rotation.x = Math.sin(t + 0.5) * 0.05;
                    limbs.leftLeg.rotation.x = 0;
                    limbs.rightLeg.rotation.x = 0;
                }
            }

            if (person.state !== NPC_STATE.SLEEPING) {
                mesh.rotation.z = 0;
            }
        }
    }

    syncBuildings(buildings) {
        for (const [building, mesh] of this.buildingMeshes) {
            if (building.health <= 0 || !buildings.includes(building)) {
                this.buildingGroup.remove(mesh);
                this.disposeMesh(mesh);
                this.buildingMeshes.delete(building);
            }
        }
        for (const building of buildings) {
            if (this.buildingMeshes.has(building)) continue;
            const mesh = this.createBuildingMesh(building);
            if (mesh) {
                this.buildingGroup.add(mesh);
                this.buildingMeshes.set(building, mesh);
            }
        }
    }

    syncAnimals(animals) {
        for (const [animal, mesh] of this.animalMeshes) {
            if (!animal.alive || !animals.includes(animal)) {
                this.entityGroup.remove(mesh);
                this.disposeMesh(mesh);
                this.animalMeshes.delete(animal);
            }
        }
        for (const animal of animals) {
            if (!animal.alive) continue;
            let mesh = this.animalMeshes.get(animal);
            if (!mesh) {
                mesh = this.createAnimalMesh(animal);
                if (!mesh) continue;
                this.entityGroup.add(mesh);
                this.animalMeshes.set(animal, mesh);
            }
            const h = this.getTerrainHeight(animal.x, animal.y);
            mesh.position.set(animal.x, Math.max(animal.type === 'FISH' ? -0.8 : 0, h), animal.y);

            // Face direction
            let isMoving = false;
            if (animal.prevX !== undefined) {
                const dx = animal.x - animal.prevX;
                const dz = animal.y - animal.prevY;
                if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                    mesh.rotation.y = Math.atan2(dx, dz);
                    isMoving = true;
                }
            }

            // Animate limbs
            const limbs = mesh.userData.limbs;
            if (limbs) {
                const t = this.frame * 0.18 + animal.x * 5;
                if (limbs.type === 'quadruped') {
                    const swing = isMoving ? Math.sin(t) * 0.5 : Math.sin(this.frame * 0.03) * 0.03;
                    if (limbs.fl) limbs.fl.rotation.x = swing;
                    if (limbs.br) limbs.br.rotation.x = swing;
                    if (limbs.fr) limbs.fr.rotation.x = -swing;
                    if (limbs.bl) limbs.bl.rotation.x = -swing;
                } else if (limbs.type === 'bird') {
                    // Wing flapping
                    const flap = Math.sin(this.frame * 0.3 + animal.x) * 0.6;
                    if (limbs.leftWing) limbs.leftWing.rotation.z = flap;
                    if (limbs.rightWing) limbs.rightWing.rotation.z = -flap;
                } else if (limbs.type === 'fish') {
                    // Tail wag
                    if (limbs.tail) limbs.tail.rotation.y = Math.sin(this.frame * 0.2) * 0.4;
                } else if (limbs.type === 'rabbit') {
                    if (isMoving && limbs.bl) {
                        const hop = Math.abs(Math.sin(t * 1.5)) * 0.6;
                        limbs.bl.rotation.x = -hop;
                        if (limbs.br) limbs.br.rotation.x = -hop;
                        mesh.position.y += Math.abs(Math.sin(t * 1.5)) * 0.06;
                    }
                }
            }
        }
    }

    syncGiants(giants) {
        for (const [giant, mesh] of this.giantMeshes) {
            if (!giant.alive || !giants.includes(giant)) {
                this.entityGroup.remove(mesh);
                this.disposeMesh(mesh);
                this.giantMeshes.delete(giant);
            }
        }
        for (const giant of giants) {
            if (!giant.alive) continue;
            let mesh = this.giantMeshes.get(giant);
            if (!mesh) {
                mesh = this.createGiantMesh(giant);
                this.entityGroup.add(mesh);
                this.giantMeshes.set(giant, mesh);
            }
            const h = this.getTerrainHeight(giant.x, giant.y);
            mesh.position.set(giant.x, Math.max(0, h), giant.y);

            // Face direction + detect movement
            let isMoving = false;
            if (giant.prevX !== undefined) {
                const dx = giant.x - giant.prevX;
                const dz = giant.y - giant.prevY;
                if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                    mesh.rotation.y = Math.atan2(dx, dz);
                    isMoving = true;
                }
            }

            // Animate giant limbs (slow, heavy walk)
            const limbs = mesh.userData.limbs;
            if (limbs) {
                const t = this.frame * 0.08 + giant.x;
                if (isMoving) {
                    const swing = Math.sin(t) * 0.35;
                    limbs.leftLeg.rotation.x = swing;
                    limbs.rightLeg.rotation.x = -swing;
                    limbs.leftArm.rotation.x = -swing * 0.4;
                    limbs.rightArm.rotation.x = swing * 0.4;
                    // Heavy ground shake bob
                    mesh.position.y += Math.abs(Math.sin(t * 2)) * 0.05;
                } else {
                    // Idle heavy breathing
                    const b = Math.sin(this.frame * 0.03) * 0.03;
                    limbs.leftArm.rotation.x = b;
                    limbs.rightArm.rotation.x = b;
                    limbs.leftLeg.rotation.x = 0;
                    limbs.rightLeg.rotation.x = 0;
                }
            }
        }
    }

    syncDinosaurs(dinos) {
        for (const [dino, mesh] of this.dinoMeshes) {
            if (!dino.alive || !dinos.includes(dino)) {
                this.entityGroup.remove(mesh);
                this.disposeMesh(mesh);
                this.dinoMeshes.delete(dino);
            }
        }
        for (const dino of dinos) {
            if (!dino.alive) continue;
            let mesh = this.dinoMeshes.get(dino);
            if (!mesh) {
                mesh = this.createDinoMesh(dino);
                if (!mesh) continue;
                this.entityGroup.add(mesh);
                this.dinoMeshes.set(dino, mesh);
            }
            const h = this.getTerrainHeight(dino.x, dino.y);
            mesh.position.set(dino.x, Math.max(0, h), dino.y);

            let isMoving = false;
            if (dino.prevX !== undefined) {
                const dx = dino.x - dino.prevX;
                const dz = dino.y - dino.prevY;
                if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                    mesh.rotation.y = Math.atan2(dx, dz);
                    isMoving = true;
                }
            }

            // Animate limbs
            const limbs = mesh.userData.limbs;
            if (limbs) {
                const t = this.frame * 0.12 + dino.x * 3;
                if (limbs.type === 'quadruped') {
                    const swing = isMoving ? Math.sin(t) * 0.4 : Math.sin(this.frame * 0.02) * 0.02;
                    if (limbs.fl) limbs.fl.rotation.x = swing;
                    if (limbs.br) limbs.br.rotation.x = swing;
                    if (limbs.fr) limbs.fr.rotation.x = -swing;
                    if (limbs.bl) limbs.bl.rotation.x = -swing;
                } else if (limbs.type === 'biped') {
                    const swing = isMoving ? Math.sin(t) * 0.5 : Math.sin(this.frame * 0.02) * 0.02;
                    if (limbs.left) limbs.left.rotation.x = swing;
                    if (limbs.right) limbs.right.rotation.x = -swing;
                    if (isMoving) mesh.position.y += Math.abs(Math.sin(t * 2)) * 0.04;
                } else if (limbs.type === 'flying') {
                    const flap = Math.sin(this.frame * 0.15 + dino.x) * 0.5;
                    if (limbs.leftWing) limbs.leftWing.rotation.z = flap;
                    if (limbs.rightWing) limbs.rightWing.rotation.z = -flap;
                    // Gentle hover bob
                    mesh.position.y += Math.sin(this.frame * 0.05) * 0.15;
                }
            }
        }
    }

    syncVehicles(vehicles) {
        for (const [vehicle, mesh] of this.vehicleMeshes) {
            if (!vehicle.alive || !vehicles.includes(vehicle)) {
                this.vehicleGroup.remove(mesh);
                this.disposeMesh(mesh);
                this.vehicleMeshes.delete(vehicle);
            }
        }
        for (const vehicle of vehicles) {
            if (!vehicle.alive) continue;
            let mesh = this.vehicleMeshes.get(vehicle);
            if (!mesh) {
                mesh = this.createVehicleMesh(vehicle);
                if (!mesh) continue;
                this.vehicleGroup.add(mesh);
                this.vehicleMeshes.set(vehicle, mesh);
            }
            const h = this.getTerrainHeight(vehicle.x, vehicle.y);
            const flyHeight = vehicle.type === 'FLYING_CAR' ? 1.5 : 0;
            mesh.position.set(vehicle.x, Math.max(0, h) + flyHeight, vehicle.y);
            if (vehicle.prevX !== undefined) {
                const dx = vehicle.x - vehicle.prevX;
                const dz = vehicle.y - vehicle.prevY;
                if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                    mesh.rotation.y = Math.atan2(dx, dz);
                }
            }
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

        // Sync 3D objects with game state
        this.syncEntities();

        // Update systems
        this.updateLighting();
        this.updateWater();
        this.updateWeather();
        this.updateEffects();

        // Camera shake
        const cam = this.game.camera3d;
        if (cam.threeCamera) {
            // Update shadow camera to follow view
            this.sunLight.shadow.camera.updateProjectionMatrix();

            this.threeRenderer.render(this.scene, cam.threeCamera);
        }

        // Screen flash overlay (using CSS for simplicity)
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

        // Check terrain intersection
        if (this.terrainMesh) {
            const hits = this.raycaster.intersectObject(this.terrainMesh);
            if (hits.length > 0) {
                const p = hits[0].point;
                // Convert from mesh local coords
                return { x: p.x, z: p.z, y: p.y };
            }
        }
        return null;
    }

    // ==================== UTILITY ====================
    _getCachedGeo(name, factory) {
        if (!this._geoCache[name]) {
            this._geoCache[name] = factory();
        }
        return this._geoCache[name];
    }

    disposeMesh(mesh) {
        mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
    }

    onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.threeRenderer.setSize(w, h);
        if (this.game.camera3d) {
            this.game.camera3d.onResize(w, h);
        }
    }

    dispose() {
        this.scene.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        this.threeRenderer.dispose();
    }
}
