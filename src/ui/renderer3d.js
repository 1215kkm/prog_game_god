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
        const bodyColor = new THREE.Color(pConfig.color);
        const isChild = person.age < 15;
        const s = isChild ? 0.55 : 0.85;

        // Body (torso)
        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyColor, roughness: 0.6, metalness: 0.05
        });
        const bodyGeo = new THREE.CapsuleGeometry(0.12 * s, 0.22 * s, 4, 8);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.35 * s;
        body.castShadow = true;
        group.add(body);

        // Head
        const skinTone = person.gender === 'female' ? 0xf5c8a0 : 0xe8b888;
        const headMat = new THREE.MeshStandardMaterial({
            color: skinTone, roughness: 0.7, metalness: 0
        });
        const headGeo = new THREE.SphereGeometry(0.1 * s, 8, 6);
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.6 * s;
        head.castShadow = true;
        group.add(head);

        // Hair
        const hairColors = [0x2a1a0a, 0x4a2a10, 0x1a0a00, 0x6a4420, 0x3a2010];
        const hairColor = hairColors[Math.floor(Math.abs(person.name?.charCodeAt(0) || 0) % hairColors.length)];
        const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
        const hairGeo = new THREE.SphereGeometry(0.105 * s, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 0.63 * s;
        group.add(hair);

        // Arms
        for (const dx of [-1, 1]) {
            const arm = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.035 * s, 0.18 * s, 3, 6), bodyMat);
            arm.position.set(dx * 0.16 * s, 0.32 * s, 0);
            arm.rotation.z = dx * 0.15;
            arm.castShadow = true;
            group.add(arm);
        }

        // Legs
        const legMat = new THREE.MeshStandardMaterial({
            color: bodyColor.clone().multiplyScalar(0.7), roughness: 0.7
        });
        for (const dx of [-1, 1]) {
            const leg = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.04 * s, 0.16 * s, 3, 6), legMat);
            leg.position.set(dx * 0.06 * s, 0.1 * s, 0);
            leg.castShadow = true;
            group.add(leg);
        }

        // Criminal mark (red aura ring on ground)
        if (personality === 'CRIMINAL') {
            const auraGeo = new THREE.RingGeometry(0.2, 0.28, 16);
            const auraMat = new THREE.MeshBasicMaterial({
                color: 0xff0000, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
            const aura = new THREE.Mesh(auraGeo, auraMat);
            aura.rotation.x = -Math.PI / 2;
            aura.position.y = 0.02;
            group.add(aura);
        }

        // Leader crown
        if (personality === 'LEADER') {
            const crownMat = new THREE.MeshStandardMaterial({
                color: 0xffd700, roughness: 0.3, metalness: 0.5 });
            const crown = new THREE.Mesh(
                new THREE.ConeGeometry(0.07 * s, 0.1 * s, 5), crownMat);
            crown.position.y = 0.75 * s;
            group.add(crown);
        }

        // Scholar hat
        if (personality === 'SCHOLAR') {
            const hatMat = new THREE.MeshStandardMaterial({ color: 0x222244, roughness: 0.6 });
            const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.1 * s, 0.08 * s, 8), hatMat);
            hat.position.y = 0.72 * s;
            group.add(hat);
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.14 * s, 0.015 * s, 8), hatMat);
            brim.position.y = 0.68 * s;
            group.add(brim);
        }

        // Warrior shield
        if (personality === 'WARRIOR') {
            const shieldMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.5 });
            const shield = new THREE.Mesh(new THREE.CircleGeometry(0.1 * s, 6), shieldMat);
            shield.position.set(-0.2 * s, 0.3 * s, 0);
            shield.rotation.y = Math.PI / 2;
            group.add(shield);
        }

        // Healer glow
        if (personality === 'HEALER') {
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0x44ff88, transparent: true, opacity: 0.3 });
            const glow = new THREE.Mesh(new THREE.SphereGeometry(0.3 * s, 8, 6), glowMat);
            glow.position.y = 0.35 * s;
            group.add(glow);
        }

        return group;
    }

    // ==================== ANIMALS ====================
    createAnimalMesh(animal) {
        const type = animal.type;
        const config = ANIMAL_TYPE[type];
        if (!config) return null;

        const color = new THREE.Color(config.color);
        const mat = new THREE.MeshStandardMaterial({
            color, roughness: 0.8, metalness: 0
        });
        const group = new THREE.Group();

        switch (type) {
            case 'RABBIT': {
                const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat);
                body.position.y = 0.12;
                body.scale.set(1, 0.8, 1.3);
                body.castShadow = true;
                group.add(body);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), mat);
                head.position.set(0, 0.2, -0.1);
                group.add(head);
                // Ears
                for (const dx of [-0.04, 0.04]) {
                    const ear = new THREE.Mesh(
                        new THREE.CapsuleGeometry(0.02, 0.1, 2, 4), mat);
                    ear.position.set(dx, 0.32, -0.1);
                    group.add(ear);
                }
                // Tail
                const tailMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
                const tail = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), tailMat);
                tail.position.set(0, 0.12, 0.14);
                group.add(tail);
                break;
            }
            case 'DEER': {
                // Body
                const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.25, 4, 8), mat);
                body.position.y = 0.32;
                body.rotation.z = Math.PI / 2;
                body.castShadow = true;
                group.add(body);
                // Head
                const headMat = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.9) });
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), headMat);
                head.position.set(0, 0.4, -0.22);
                group.add(head);
                // Legs (4 legs)
                for (const dx of [-0.1, 0.1]) {
                    for (const dz of [-0.08, 0.08]) {
                        const leg = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.025, 0.02, 0.25, 4), mat);
                        leg.position.set(dx, 0.12, dz);
                        group.add(leg);
                    }
                }
                // Antlers
                const antlerMat = new THREE.MeshStandardMaterial({ color: 0x8B6914 });
                for (const dx of [-0.05, 0.05]) {
                    const antler = new THREE.Mesh(
                        new THREE.ConeGeometry(0.02, 0.18, 3), antlerMat);
                    antler.position.set(dx, 0.52, -0.2);
                    antler.rotation.z = dx > 0 ? -0.3 : 0.3;
                    group.add(antler);
                }
                break;
            }
            case 'WOLF': {
                const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.22, 4, 8), mat);
                body.position.y = 0.22;
                body.rotation.z = Math.PI / 2;
                body.castShadow = true;
                group.add(body);
                const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 6), mat);
                head.position.set(0, 0.26, -0.2);
                head.rotation.x = Math.PI / 2;
                group.add(head);
                // Legs
                for (const dx of [-0.08, 0.08]) {
                    for (const dz of [-0.06, 0.06]) {
                        const leg = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.025, 0.02, 0.18, 4), mat);
                        leg.position.set(dx, 0.09, dz);
                        group.add(leg);
                    }
                }
                // Tail
                const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.12, 3, 4), mat);
                tail.position.set(0, 0.2, 0.18);
                tail.rotation.x = -0.8;
                group.add(tail);
                break;
            }
            case 'BEAR': {
                const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat);
                body.position.y = 0.25;
                body.scale.set(1.2, 0.9, 1);
                body.castShadow = true;
                group.add(body);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), mat);
                head.position.set(0, 0.38, -0.16);
                head.castShadow = true;
                group.add(head);
                // Ears
                for (const dx of [-0.08, 0.08]) {
                    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3), mat);
                    ear.position.set(dx, 0.48, -0.14);
                    group.add(ear);
                }
                // Legs
                for (const dx of [-0.12, 0.12]) {
                    for (const dz of [-0.06, 0.06]) {
                        const leg = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.04, 0.04, 0.2, 5), mat);
                        leg.position.set(dx, 0.1, dz);
                        group.add(leg);
                    }
                }
                break;
            }
            case 'BIRD': {
                const flyH = 1.5 + Math.random() * 2;
                const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), mat);
                body.position.y = flyH;
                body.castShadow = true;
                group.add(body);
                // Beak
                const beakMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
                const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), beakMat);
                beak.position.set(0, flyH, -0.07);
                beak.rotation.x = Math.PI / 2;
                group.add(beak);
                // Wings
                const wingMat = new THREE.MeshStandardMaterial({
                    color: color.clone().multiplyScalar(0.8), side: THREE.DoubleSide });
                for (const dx of [-1, 1]) {
                    const wing = new THREE.Mesh(
                        new THREE.PlaneGeometry(0.15, 0.04), wingMat);
                    wing.position.set(dx * 0.08, flyH, 0);
                    wing.rotation.z = dx * 0.3;
                    group.add(wing);
                }
                break;
            }
            case 'FISH': {
                const body = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.06, 0.12, 4, 6), mat);
                body.position.y = -0.3;
                body.rotation.z = Math.PI / 2;
                group.add(body);
                // Tail fin
                const tailMat = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.8), side: THREE.DoubleSide });
                const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.06), tailMat);
                tail.position.set(0, -0.3, 0.12);
                group.add(tail);
                break;
            }
            default: {
                const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), mat);
                body.position.y = 0.1;
                body.castShadow = true;
                group.add(body);
            }
        }
        return group;
    }

    // ==================== DINOSAURS ====================
    createDinoMesh(dino) {
        const config = DINOSAUR_TYPE[dino.type];
        if (!config) return null;

        const color = new THREE.Color(config.color);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 });
        const bellyMat = new THREE.MeshStandardMaterial({ color: color.clone().lerp(new THREE.Color(0xffffff), 0.3), roughness: 0.8 });
        const group = new THREE.Group();
        const s = config.size * 0.35; // Much larger scale

        switch (dino.type) {
            case 'TREX': {
                // Massive body
                const body = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.4, s * 0.8, 4, 8), mat);
                body.position.y = s * 1.1;
                body.castShadow = true;
                group.add(body);
                // Big head with jaw
                const head = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.4, s * 0.6), mat);
                head.position.set(0, s * 1.7, -s * 0.6);
                head.castShadow = true;
                group.add(head);
                // Lower jaw
                const jaw = new THREE.Mesh(new THREE.BoxGeometry(s * 0.4, s * 0.15, s * 0.5), bellyMat);
                jaw.position.set(0, s * 1.42, -s * 0.55);
                group.add(jaw);
                // Eyes
                const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0x440000 });
                for (const dx of [-1, 1]) {
                    const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.05, 4, 3), eyeMat);
                    eye.position.set(dx * s * 0.22, s * 1.8, -s * 0.85);
                    group.add(eye);
                }
                // Tiny arms
                for (const dx of [-1, 1]) {
                    const arm = new THREE.Mesh(
                        new THREE.CapsuleGeometry(s * 0.05, s * 0.15, 3, 4), mat);
                    arm.position.set(dx * s * 0.3, s * 1.2, -s * 0.2);
                    arm.rotation.z = dx * 0.5;
                    group.add(arm);
                }
                // Tail
                const tail = new THREE.Mesh(new THREE.ConeGeometry(s * 0.25, s * 1.4, 6), mat);
                tail.position.set(0, s * 0.7, s * 0.9);
                tail.rotation.x = -0.6;
                group.add(tail);
                // Strong legs
                for (const dx of [-s * 0.2, s * 0.2]) {
                    const thigh = new THREE.Mesh(
                        new THREE.CapsuleGeometry(s * 0.12, s * 0.3, 4, 6), mat);
                    thigh.position.set(dx, s * 0.6, 0);
                    group.add(thigh);
                    const foot = new THREE.Mesh(
                        new THREE.BoxGeometry(s * 0.18, s * 0.06, s * 0.22), mat);
                    foot.position.set(dx, s * 0.03, -s * 0.05);
                    group.add(foot);
                }
                break;
            }
            case 'BRONTO': {
                // Massive round body
                const body = new THREE.Mesh(
                    new THREE.SphereGeometry(s * 0.6, 8, 6), mat);
                body.position.y = s * 1.2;
                body.scale.set(1.3, 0.9, 1);
                body.castShadow = true;
                group.add(body);
                // Long neck (multiple segments)
                for (let i = 0; i < 3; i++) {
                    const neckSeg = new THREE.Mesh(
                        new THREE.CapsuleGeometry(s * (0.15 - i * 0.02), s * 0.3, 4, 6), mat);
                    neckSeg.position.set(0, s * (1.6 + i * 0.4), -s * (0.3 + i * 0.25));
                    neckSeg.rotation.x = 0.3;
                    group.add(neckSeg);
                }
                // Small head
                const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.12, 6, 4), mat);
                head.position.set(0, s * 2.9, -s * 1.1);
                group.add(head);
                // Thick legs
                for (const dx of [-s * 0.35, s * 0.35]) {
                    for (const dz of [-s * 0.2, s * 0.2]) {
                        const leg = new THREE.Mesh(
                            new THREE.CylinderGeometry(s * 0.12, s * 0.14, s * 0.8, 6), mat);
                        leg.position.set(dx, s * 0.4, dz);
                        group.add(leg);
                    }
                }
                // Long tail
                const tail = new THREE.Mesh(new THREE.ConeGeometry(s * 0.15, s * 1.5, 5), mat);
                tail.position.set(0, s * 0.8, s * 0.9);
                tail.rotation.x = -0.4;
                group.add(tail);
                break;
            }
            case 'TRICERATOPS': {
                // Bulky body
                const body = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.4, s * 0.5, 4, 8), mat);
                body.position.y = s * 0.8;
                body.rotation.z = Math.PI / 2;
                body.castShadow = true;
                group.add(body);
                // Head with frill
                const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.3, 6, 4), mat);
                head.position.set(0, s * 0.9, -s * 0.6);
                head.castShadow = true;
                group.add(head);
                // Frill (disc behind head)
                const frillMat = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.8), roughness: 0.7 });
                const frill = new THREE.Mesh(new THREE.CircleGeometry(s * 0.35, 8), frillMat);
                frill.position.set(0, s * 1.1, -s * 0.45);
                frill.rotation.x = -0.3;
                group.add(frill);
                // Horns (3)
                const hornMat = new THREE.MeshStandardMaterial({ color: 0xf0e0c0, roughness: 0.5 });
                const horn1 = new THREE.Mesh(new THREE.ConeGeometry(s * 0.04, s * 0.4, 5), hornMat);
                horn1.position.set(0, s * 0.95, -s * 0.88);
                horn1.rotation.x = Math.PI / 2.5;
                group.add(horn1);
                for (const dx of [-1, 1]) {
                    const horn = new THREE.Mesh(new THREE.ConeGeometry(s * 0.03, s * 0.35, 5), hornMat);
                    horn.position.set(dx * s * 0.2, s * 1.05, -s * 0.75);
                    horn.rotation.x = Math.PI / 3;
                    horn.rotation.z = dx * -0.2;
                    group.add(horn);
                }
                // Legs
                for (const dx of [-s * 0.25, s * 0.25]) {
                    for (const dz of [-s * 0.15, s * 0.15]) {
                        const leg = new THREE.Mesh(
                            new THREE.CylinderGeometry(s * 0.08, s * 0.09, s * 0.5, 5), mat);
                        leg.position.set(dx, s * 0.25, dz);
                        group.add(leg);
                    }
                }
                break;
            }
            case 'RAPTOR': {
                // Sleek agile body
                const body = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.2, s * 0.4, 4, 8), mat);
                body.position.y = s * 0.7;
                body.rotation.x = 0.3;
                body.castShadow = true;
                group.add(body);
                // Head
                const head = new THREE.Mesh(new THREE.ConeGeometry(s * 0.12, s * 0.25, 5), mat);
                head.position.set(0, s * 0.9, -s * 0.4);
                head.rotation.x = Math.PI / 2.2;
                group.add(head);
                // Eyes
                const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x443300 });
                for (const dx of [-1, 1]) {
                    const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.03, 4, 3), eyeMat);
                    eye.position.set(dx * s * 0.1, s * 0.95, -s * 0.52);
                    group.add(eye);
                }
                // Arms with claws
                for (const dx of [-1, 1]) {
                    const arm = new THREE.Mesh(
                        new THREE.CapsuleGeometry(s * 0.04, s * 0.2, 3, 4), mat);
                    arm.position.set(dx * s * 0.22, s * 0.65, -s * 0.15);
                    arm.rotation.z = dx * 0.6;
                    group.add(arm);
                }
                // Long tail
                const tail = new THREE.Mesh(new THREE.ConeGeometry(s * 0.08, s * 0.7, 5), mat);
                tail.position.set(0, s * 0.5, s * 0.5);
                tail.rotation.x = -0.7;
                group.add(tail);
                // Strong legs
                for (const dx of [-s * 0.12, s * 0.12]) {
                    const leg = new THREE.Mesh(
                        new THREE.CapsuleGeometry(s * 0.06, s * 0.25, 3, 5), mat);
                    leg.position.set(dx, s * 0.3, 0);
                    group.add(leg);
                }
                break;
            }
            case 'PTERANODON': {
                // Flying dinosaur - hovering above ground
                const flyH = s * 2.5;
                const body = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.12, s * 0.2, 4, 6), mat);
                body.position.y = flyH;
                body.rotation.z = Math.PI / 2;
                body.castShadow = true;
                group.add(body);
                // Head crest
                const head = new THREE.Mesh(new THREE.ConeGeometry(s * 0.08, s * 0.3, 4), mat);
                head.position.set(0, flyH + s * 0.05, -s * 0.2);
                head.rotation.x = Math.PI / 2;
                group.add(head);
                // Wide wings
                const wingMat = new THREE.MeshStandardMaterial({
                    color: color.clone().multiplyScalar(0.85), side: THREE.DoubleSide, roughness: 0.8 });
                for (const dx of [-1, 1]) {
                    const wing = new THREE.Mesh(
                        new THREE.PlaneGeometry(s * 1.2, s * 0.35), wingMat);
                    wing.position.set(dx * s * 0.65, flyH, 0);
                    wing.rotation.z = dx * 0.15;
                    wing.castShadow = true;
                    group.add(wing);
                }
                break;
            }
            case 'STEGO': {
                // Stout body
                const body = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.35, s * 0.5, 4, 8), mat);
                body.position.y = s * 0.8;
                body.rotation.z = Math.PI / 2;
                body.castShadow = true;
                group.add(body);
                // Head
                const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.15, 6, 4), mat);
                head.position.set(0, s * 0.7, -s * 0.5);
                group.add(head);
                // Back plates (diamond shapes)
                const plateMat = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.7), roughness: 0.6 });
                for (let i = 0; i < 5; i++) {
                    const plate = new THREE.Mesh(
                        new THREE.ConeGeometry(s * 0.04, s * 0.25, 4), plateMat);
                    plate.position.set(0, s * 1.2 + Math.sin(i * 0.8) * s * 0.05, -s * 0.2 + i * s * 0.15);
                    plate.castShadow = true;
                    group.add(plate);
                }
                // Tail spikes
                const spikeMat = new THREE.MeshStandardMaterial({ color: 0xddc080 });
                for (const dx of [-1, 1]) {
                    for (let i = 0; i < 2; i++) {
                        const spike = new THREE.Mesh(
                            new THREE.ConeGeometry(s * 0.025, s * 0.2, 4), spikeMat);
                        spike.position.set(dx * s * 0.12, s * 0.6, s * 0.55 + i * s * 0.12);
                        spike.rotation.z = dx * 0.8;
                        group.add(spike);
                    }
                }
                // Legs
                for (const dx of [-s * 0.2, s * 0.2]) {
                    for (const dz of [-s * 0.12, s * 0.12]) {
                        const leg = new THREE.Mesh(
                            new THREE.CylinderGeometry(s * 0.08, s * 0.1, s * 0.5, 5), mat);
                        leg.position.set(dx, s * 0.25, dz);
                        group.add(leg);
                    }
                }
                break;
            }
            default: {
                // Generic dinosaur - still visible
                const body = new THREE.Mesh(
                    new THREE.CapsuleGeometry(s * 0.3, s * 0.5, 4, 8), mat);
                body.position.y = s * 0.8;
                body.castShadow = true;
                group.add(body);
                const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.2, 6, 4), mat);
                head.position.set(0, s * 1.2, -s * 0.35);
                head.castShadow = true;
                group.add(head);
                // Legs
                for (const dx of [-s * 0.15, s * 0.15]) {
                    const leg = new THREE.Mesh(
                        new THREE.CylinderGeometry(s * 0.07, s * 0.08, s * 0.5, 5), mat);
                    leg.position.set(dx, s * 0.25, 0);
                    group.add(leg);
                }
                // Tail
                const tail = new THREE.Mesh(new THREE.ConeGeometry(s * 0.12, s * 0.6, 5), mat);
                tail.position.set(0, s * 0.5, s * 0.5);
                tail.rotation.x = -0.5;
                group.add(tail);
            }
        }
        return group;
    }

    // ==================== GIANTS ====================
    createGiantMesh(giant) {
        const s = (giant.giantSize || GIANT_CONFIG.baseSize) * 0.3;
        const color = new THREE.Color(GIANT_CONFIG.color);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
        const group = new THREE.Group();

        // Massive body
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.35, s * 0.7, 4, 8), mat);
        body.position.y = s * 1.1;
        body.castShadow = true;
        group.add(body);

        // Head
        const headMat = new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.7 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.22, 8, 6), headMat);
        head.position.y = s * 1.8;
        head.castShadow = true;
        group.add(head);

        // Eyes (glowing)
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x662200 });
        for (const dx of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.04, 4, 3), eyeMat);
            eye.position.set(dx * s * 0.1, s * 1.85, -s * 0.18);
            group.add(eye);
        }

        // Huge arms
        for (const dx of [-1, 1]) {
            const arm = new THREE.Mesh(
                new THREE.CapsuleGeometry(s * 0.1, s * 0.55, 3, 6), mat);
            arm.position.set(dx * s * 0.42, s * 1.05, 0);
            arm.rotation.z = dx * 0.25;
            arm.castShadow = true;
            group.add(arm);
            // Fists
            const fist = new THREE.Mesh(new THREE.SphereGeometry(s * 0.1, 5, 4), headMat);
            fist.position.set(dx * s * 0.5, s * 0.5, 0);
            group.add(fist);
        }

        // Thick legs
        for (const dx of [-1, 1]) {
            const leg = new THREE.Mesh(
                new THREE.CapsuleGeometry(s * 0.14, s * 0.45, 3, 6), mat);
            leg.position.set(dx * s * 0.18, s * 0.35, 0);
            leg.castShadow = true;
            group.add(leg);
            // Feet
            const foot = new THREE.Mesh(
                new THREE.BoxGeometry(s * 0.2, s * 0.06, s * 0.25), mat);
            foot.position.set(dx * s * 0.18, s * 0.03, -s * 0.05);
            group.add(foot);
        }

        // Loincloth / belt
        const clothMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 });
        const cloth = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.36, s * 0.38, s * 0.12, 8), clothMat);
        cloth.position.y = s * 0.7;
        group.add(cloth);

        return group;
    }

    // ==================== VEHICLES ====================
    createVehicleMesh(vehicle) {
        const config = VEHICLE_TYPE[vehicle.type];
        if (!config) return null;

        const color = new THREE.Color(config.color);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 });
        const group = new THREE.Group();
        const s = config.size * 0.35;

        switch (vehicle.type) {
            case 'CART':
            case 'CARRIAGE': {
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.6, s * 0.3, s * 0.4), mat);
                body.position.y = s * 0.25;
                body.castShadow = true;
                group.add(body);
                // Wheels
                const wheelMat = new THREE.MeshStandardMaterial({ color: 0x4a3520 });
                for (const dx of [-s * 0.25, s * 0.25]) {
                    const wheel = new THREE.Mesh(
                        new THREE.TorusGeometry(s * 0.08, s * 0.02, 4, 8), wheelMat);
                    wheel.position.set(dx, s * 0.1, s * 0.22);
                    wheel.rotation.y = Math.PI / 2;
                    group.add(wheel);
                }
                break;
            }
            case 'TRAIN': {
                // Engine
                const engine = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.35, s * 0.3), mat);
                engine.position.y = s * 0.25;
                engine.castShadow = true;
                group.add(engine);
                // Chimney
                const chimney = new THREE.Mesh(
                    new THREE.CylinderGeometry(s * 0.04, s * 0.06, s * 0.2, 6),
                    new THREE.MeshStandardMaterial({ color: 0x222222 }));
                chimney.position.set(-s * 0.15, s * 0.52, 0);
                group.add(chimney);
                // Carriages
                for (let i = 1; i <= 2; i++) {
                    const car = new THREE.Mesh(
                        new THREE.BoxGeometry(s * 0.4, s * 0.25, s * 0.28),
                        new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
                    car.position.set(i * s * 0.5, s * 0.2, 0);
                    car.castShadow = true;
                    group.add(car);
                }
                break;
            }
            case 'CAR': {
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.4, s * 0.15, s * 0.2), mat);
                body.position.y = s * 0.12;
                body.castShadow = true;
                group.add(body);
                const cabin = new THREE.Mesh(
                    new THREE.BoxGeometry(s * 0.2, s * 0.12, s * 0.18),
                    mat.clone());
                cabin.material.transparent = true;
                cabin.material.opacity = 0.8;
                cabin.position.set(s * 0.02, s * 0.22, 0);
                group.add(cabin);
                break;
            }
            case 'BUS': {
                const body = new THREE.Mesh(
                    new THREE.BoxGeometry(s * 0.6, s * 0.25, s * 0.22), mat);
                body.position.y = s * 0.18;
                body.castShadow = true;
                group.add(body);
                break;
            }
            case 'HORSE': {
                const body = new THREE.Mesh(
                    new THREE.CapsuleGeometry(s * 0.08, s * 0.15, 4, 6), mat);
                body.position.y = s * 0.2;
                body.rotation.z = Math.PI / 2;
                group.add(body);
                const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.06, 6, 4), mat);
                head.position.set(0, s * 0.28, -s * 0.12);
                group.add(head);
                break;
            }
            case 'FLYING_CAR': {
                const body = new THREE.Mesh(
                    new THREE.CapsuleGeometry(s * 0.1, s * 0.2, 4, 8), mat);
                body.position.y = 1.5;
                body.rotation.z = Math.PI / 2;
                body.castShadow = true;
                group.add(body);
                // Glow ring
                const glow = new THREE.Mesh(
                    new THREE.TorusGeometry(s * 0.15, s * 0.01, 4, 12),
                    new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.6 }));
                glow.position.y = 1.4;
                glow.rotation.x = Math.PI / 2;
                group.add(glow);
                break;
            }
            default: {
                const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.4, s * 0.2, s * 0.2), mat);
                body.position.y = s * 0.15;
                group.add(body);
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

            // Animation: bobbing while walking
            if (person.state === NPC_STATE.WALKING || person.state === NPC_STATE.FLEEING) {
                mesh.position.y += Math.abs(Math.sin(this.frame * 0.15)) * 0.06;
            }
            // Sleeping: lay down
            if (person.state === NPC_STATE.SLEEPING) {
                mesh.rotation.z = Math.PI / 2;
                mesh.position.y += 0.1;
            } else {
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
            if (animal.prevX !== undefined) {
                const dx = animal.x - animal.prevX;
                const dz = animal.y - animal.prevY;
                if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                    mesh.rotation.y = Math.atan2(dx, dz);
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
            if (dino.prevX !== undefined) {
                const dx = dino.x - dino.prevX;
                const dz = dino.y - dino.prevY;
                if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                    mesh.rotation.y = Math.atan2(dx, dz);
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
