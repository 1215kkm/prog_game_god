// Placement System - 플레이어가 엔티티를 직접 배치할 수 있는 시스템
import { PERSONALITY, GIANT_CONFIG, ANIMAL_TYPE, BUILDING_TYPE, DINOSAUR_TYPE } from '../core/constants.js';

export class PlacementSystem {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.category = null;    // 'person', 'giant', 'tree', 'animal', 'building', 'dinosaur'
        this.selectedType = null; // 구체적 타입
        this.selectedSize = 3;   // 크기 (나무, 거인용)
        this.selectedPersonality = 'NORMAL';
    }

    init() {
        this.buildUI();
    }

    buildUI() {
        const panel = document.getElementById('placement-panel');
        if (!panel) return;

        // Category buttons
        const categories = [
            { id: 'person', icon: '👤', label: '인물' },
            { id: 'giant', icon: '🗿', label: '거인' },
            { id: 'tree', icon: '🌲', label: '나무' },
            { id: 'animal', icon: '🐾', label: '동물' },
            { id: 'building', icon: '🏠', label: '건물' },
            { id: 'dinosaur', icon: '🦖', label: '공룡' },
        ];

        const catBar = document.getElementById('placement-categories');
        if (!catBar) return;

        catBar.innerHTML = '';
        for (const cat of categories) {
            const btn = document.createElement('button');
            btn.className = 'placement-cat-btn';
            btn.dataset.category = cat.id;
            btn.innerHTML = `${cat.icon} ${cat.label}`;
            btn.addEventListener('click', () => this.selectCategory(cat.id));
            catBar.appendChild(btn);
        }

        // Cancel button
        const cancelBtn = document.getElementById('placement-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.deactivate());
        }
    }

    selectCategory(category) {
        this.category = category;
        this.active = true;
        this.selectedType = null;

        // Update UI
        document.querySelectorAll('.placement-cat-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Show sub-options
        const options = document.getElementById('placement-options');
        if (!options) return;
        options.innerHTML = '';
        options.style.display = 'flex';

        switch (category) {
            case 'person':
                this.showPersonalityOptions(options);
                break;
            case 'giant':
                this.showSizeOptions(options, GIANT_CONFIG.baseSize, GIANT_CONFIG.maxSize, '거인 크기');
                this.selectedType = 'GIANT';
                break;
            case 'tree':
                this.showSizeOptions(options, 2, 10, '나무 크기');
                this.selectedType = 'TREE';
                break;
            case 'animal':
                this.showAnimalOptions(options);
                break;
            case 'building':
                this.showBuildingOptions(options);
                break;
            case 'dinosaur':
                this.showDinoOptions(options);
                break;
        }

        // Change cursor
        const canvas = this.game.canvas3d || this.game.canvas;
        if (canvas) canvas.style.cursor = 'crosshair';

        document.getElementById('placement-panel').classList.add('active');
    }

    showPersonalityOptions(container) {
        for (const [key, config] of Object.entries(PERSONALITY)) {
            const btn = document.createElement('button');
            btn.className = 'placement-option-btn';
            btn.innerHTML = `${config.icon} ${config.name}`;
            btn.style.borderColor = config.color;
            btn.addEventListener('click', () => {
                this.selectedPersonality = key;
                this.selectedType = 'PERSON';
                container.querySelectorAll('.placement-option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
            container.appendChild(btn);
        }
        // Default select NORMAL
        this.selectedPersonality = 'NORMAL';
        this.selectedType = 'PERSON';
        container.children[0]?.classList.add('selected');
    }

    showSizeOptions(container, min, max, label) {
        const wrapper = document.createElement('div');
        wrapper.className = 'placement-slider-wrap';
        wrapper.innerHTML = `
            <label>${label}: <span id="size-display">${min}</span></label>
            <input type="range" id="placement-size-slider" min="${min}" max="${max}" value="${min}" step="1">
        `;
        container.appendChild(wrapper);

        const slider = wrapper.querySelector('#placement-size-slider');
        const display = wrapper.querySelector('#size-display');
        slider.addEventListener('input', () => {
            this.selectedSize = parseInt(slider.value);
            display.textContent = slider.value;
        });
        this.selectedSize = min;
    }

    showAnimalOptions(container) {
        for (const [key, config] of Object.entries(ANIMAL_TYPE)) {
            const btn = document.createElement('button');
            btn.className = 'placement-option-btn';
            const icon = config.herbivore ? '🌿' : '🥩';
            btn.innerHTML = `${icon} ${config.name}`;
            btn.addEventListener('click', () => {
                this.selectedType = key;
                container.querySelectorAll('.placement-option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
            container.appendChild(btn);
        }
        this.selectedType = 'RABBIT';
        container.children[0]?.classList.add('selected');
    }

    showBuildingOptions(container) {
        for (const [key, config] of Object.entries(BUILDING_TYPE)) {
            const btn = document.createElement('button');
            btn.className = 'placement-option-btn';
            btn.innerHTML = `🏗️ ${config.name}`;
            btn.addEventListener('click', () => {
                this.selectedType = key;
                container.querySelectorAll('.placement-option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
            container.appendChild(btn);
        }
        this.selectedType = 'HUT';
        container.children[0]?.classList.add('selected');
    }

    showDinoOptions(container) {
        for (const [key, config] of Object.entries(DINOSAUR_TYPE)) {
            const btn = document.createElement('button');
            btn.className = 'placement-option-btn';
            btn.innerHTML = `${config.icon} ${config.name}`;
            btn.addEventListener('click', () => {
                this.selectedType = key;
                container.querySelectorAll('.placement-option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
            container.appendChild(btn);
        }
        this.selectedType = 'TREX';
        container.children[0]?.classList.add('selected');
    }

    placeAt(worldX, worldY) {
        if (!this.active || !this.selectedType) return;

        const em = this.game.entityManager;
        const world = this.game.world;

        // Check walkable
        const tx = Math.floor(worldX);
        const ty = Math.floor(worldY);
        if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) return;

        switch (this.category) {
            case 'person': {
                const person = em.spawnPersonAt(worldX, worldY, {
                    personality: this.selectedPersonality
                });
                if (person) {
                    this.game.notify(`${PERSONALITY[this.selectedPersonality].name} 인물을 배치했습니다.`);
                    this.triggerReactions(person, worldX, worldY);
                }
                break;
            }
            case 'giant': {
                const giant = em.spawnGiant(worldX, worldY, this.selectedSize);
                if (giant) {
                    this.game.notify(`크기 ${this.selectedSize}의 거인을 배치했습니다!`);
                    this.triggerReactions(giant, worldX, worldY);
                }
                break;
            }
            case 'tree': {
                em.spawnTree(worldX, worldY, this.selectedSize);
                this.game.notify(`크기 ${this.selectedSize}의 나무를 심었습니다.`);
                break;
            }
            case 'animal': {
                const animal = em.spawnAnimalAt(worldX, worldY, this.selectedType);
                if (animal) {
                    this.game.notify(`${ANIMAL_TYPE[this.selectedType].name}을(를) 배치했습니다.`);
                }
                break;
            }
            case 'building': {
                const building = em.tryBuildAt(tx, ty, this.selectedType);
                if (building) {
                    this.game.notify(`${BUILDING_TYPE[this.selectedType].name}을(를) 건설했습니다.`);
                } else {
                    this.game.notify('이곳에 건설할 수 없습니다.');
                }
                break;
            }
            case 'dinosaur': {
                const dino = em.spawnDinosaur(worldX, worldY, this.selectedType);
                if (dino) {
                    this.game.notify(`${DINOSAUR_TYPE[this.selectedType].name}을(를) 배치했습니다!`);
                    this.triggerReactions(dino, worldX, worldY);
                }
                break;
            }
        }

        // Add placement effect
        this.game.renderer?.addParticleEffect(worldX, worldY, 'small', '#44ff88');
    }

    triggerReactions(entity, worldX, worldY) {
        const em = this.game.entityManager;
        const reactionRadius = entity.reactionRadius || 10;

        for (const person of em.people) {
            if (!person.alive || person === entity) continue;
            const dx = person.x - worldX;
            const dy = person.y - worldY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < reactionRadius) {
                person.reactTo(entity, dist);
            }
        }
    }

    deactivate() {
        this.active = false;
        this.category = null;
        this.selectedType = null;

        const canvas = this.game.canvas3d || this.game.canvas;
        if (canvas) canvas.style.cursor = 'grab';

        this.game.renderer?.removeGhostPreview();

        const panel = document.getElementById('placement-panel');
        if (panel) panel.classList.remove('active');

        const options = document.getElementById('placement-options');
        if (options) options.style.display = 'none';

        document.querySelectorAll('.placement-cat-btn').forEach(btn => btn.classList.remove('active'));
    }
}
