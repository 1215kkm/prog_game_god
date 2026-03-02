/**
 * Registry - 엔티티/파워/지형 등을 등록하고 관리하는 확장 시스템
 *
 * 새로운 기능 추가 시 기존 코드를 수정하지 않고
 * registry에 등록만 하면 자동으로 게임 세계에 반영됩니다.
 *
 * === 엔티티 등록 예시 ===
 *
 * // 배트맨 추가
 * game.registry.registerEntity('batman', {
 *     name: '배트맨',
 *     category: 'special',   // 'person', 'animal', 'special', 'object'
 *     config: {
 *         speed: 2.5, health: 200, color: '#222',
 *         size: 1.5, hostile: false
 *     },
 *     behavior: (entity, game, dt) => {
 *         // 매 틱 실행되는 AI 로직
 *         const villain = game.entityManager.customEntities.find(
 *             e => e.def.config.hostile && e.alive
 *         );
 *         if (villain) entity.moveTo(villain.x, villain.y);
 *     },
 *     render: (ctx, entity, TILE_SIZE, sprites) => {
 *         // 커스텀 렌더링 (선택사항, 없으면 기본 원형)
 *         ctx.fillStyle = '#222';
 *         const sx = entity.x * TILE_SIZE;
 *         const sy = entity.y * TILE_SIZE;
 *         ctx.fillRect(sx - 8, sy - 16, 16, 20);
 *     },
 *     onSpawn: (entity, game) => {
 *         game.notify('🦇 배트맨이 도시에 나타났습니다!');
 *     },
 *     onDeath: (entity, game) => {
 *         game.notify('배트맨이 쓰러졌습니다...');
 *     },
 *     reactions: {
 *         'entity:spawned': (self, other, game) => {
 *             if (other.def?.config?.hostile) {
 *                 self.target = other;
 *             }
 *         }
 *     }
 * });
 *
 * // 스폰: game.entityManager.spawnCustom('batman', 50, 50);
 *
 * === 파워 등록 예시 ===
 *
 * game.registry.registerPower('plantTree', {
 *     name: '나무 심기',
 *     icon: '🌳',
 *     description: '선택한 위치에 나무를 심습니다',
 *     cooldown: 30,
 *     faithCost: 0,
 *     faithGain: 1,
 *     effect: (game, x, y) => {
 *         game.entityManager.spawnTree(x, y, 5);
 *         game.events.emit('terrain:changed', x, y, null, 'tree_planted');
 *     }
 * });
 *
 * === 지형 타입 등록 예시 ===
 *
 * game.registry.registerTerrain('waterfall', {
 *     name: '폭포',
 *     color: '#4488cc',
 *     passable: true,
 *     effect: (game, x, y) => {
 *         // 주변 행복도 증가 등
 *     },
 *     render: (ctx, x, y, TILE_SIZE, tick) => {
 *         // 애니메이션 렌더링
 *     }
 * });
 */

export class Registry {
    constructor() {
        // 커스텀 엔티티 타입 정의
        this._entities = {};

        // 커스텀 파워 정의
        this._powers = {};

        // 커스텀 지형 타입 정의
        this._terrains = {};

        // 월드 모디파이어 (매 틱 실행되는 전역 효과)
        this._worldModifiers = {};

        // 렌더 레이어 (커스텀 렌더링 레이어)
        this._renderLayers = [];
    }

    // ==================== 엔티티 ====================

    /**
     * 새로운 엔티티 타입 등록
     * @param {string} type - 고유 타입 이름 (예: 'batman', 'dragon')
     * @param {Object} definition - 엔티티 정의
     */
    registerEntity(type, definition) {
        if (this._entities[type]) {
            console.warn(`[Registry] Entity type '${type}' already registered, overwriting.`);
        }
        this._entities[type] = {
            type,
            name: definition.name || type,
            category: definition.category || 'special',
            config: definition.config || {},
            behavior: definition.behavior || null,
            render: definition.render || null,
            onSpawn: definition.onSpawn || null,
            onDeath: definition.onDeath || null,
            onInteract: definition.onInteract || null,
            reactions: definition.reactions || {},
        };
        return this;
    }

    getEntity(type) {
        return this._entities[type] || null;
    }

    getAllEntities() {
        return { ...this._entities };
    }

    // ==================== 파워 ====================

    /**
     * 새로운 신의 권능 등록
     * @param {string} id - 고유 파워 ID (예: 'plantTree', 'summonDragon')
     * @param {Object} definition - 파워 정의
     */
    registerPower(id, definition) {
        if (this._powers[id]) {
            console.warn(`[Registry] Power '${id}' already registered, overwriting.`);
        }
        this._powers[id] = {
            id,
            name: definition.name || id,
            icon: definition.icon || '✨',
            description: definition.description || '',
            cooldown: definition.cooldown || 60,
            faithCost: definition.faithCost || 0,
            faithGain: definition.faithGain || 2,
            effect: definition.effect,
            particle: definition.particle || null,
            sound: definition.sound || null,
        };
        return this;
    }

    getPower(id) {
        return this._powers[id] || null;
    }

    getAllPowers() {
        return { ...this._powers };
    }

    // ==================== 지형 ====================

    /**
     * 새로운 지형 타입 등록
     * @param {string} id - 고유 지형 ID
     * @param {Object} definition - 지형 정의
     */
    registerTerrain(id, definition) {
        this._terrains[id] = {
            id,
            name: definition.name || id,
            color: definition.color || '#ff00ff',
            passable: definition.passable !== false,
            effect: definition.effect || null,
            render: definition.render || null,
        };
        return this;
    }

    getTerrain(id) {
        return this._terrains[id] || null;
    }

    getAllTerrains() {
        return { ...this._terrains };
    }

    // ==================== 월드 모디파이어 ====================

    /**
     * 월드 모디파이어 등록 (매 틱 실행되는 전역 효과)
     * 예: "영원한 겨울" 효과, "행복 부스트" 등
     */
    registerWorldModifier(id, definition) {
        this._worldModifiers[id] = {
            id,
            name: definition.name || id,
            duration: definition.duration || Infinity,
            remaining: definition.duration || Infinity,
            onTick: definition.onTick || null,
            onApply: definition.onApply || null,
            onRemove: definition.onRemove || null,
        };
        if (definition.onApply) definition.onApply();
        return this;
    }

    removeWorldModifier(id) {
        const mod = this._worldModifiers[id];
        if (mod && mod.onRemove) mod.onRemove();
        delete this._worldModifiers[id];
    }

    updateWorldModifiers(game) {
        for (const [id, mod] of Object.entries(this._worldModifiers)) {
            if (mod.remaining <= 0) {
                this.removeWorldModifier(id);
                continue;
            }
            if (mod.onTick) mod.onTick(game);
            if (mod.remaining !== Infinity) mod.remaining--;
        }
    }

    // ==================== 렌더 레이어 ====================

    /**
     * 커스텀 렌더링 레이어 등록
     * @param {string} id - 레이어 ID
     * @param {number} zIndex - 렌더링 순서 (낮을수록 먼저)
     * @param {Function} renderFn - (ctx, game, camera) => void
     */
    registerRenderLayer(id, zIndex, renderFn) {
        this._renderLayers = this._renderLayers.filter(l => l.id !== id);
        this._renderLayers.push({ id, zIndex, render: renderFn });
        this._renderLayers.sort((a, b) => a.zIndex - b.zIndex);
        return this;
    }

    getRenderLayers() {
        return this._renderLayers;
    }
}
