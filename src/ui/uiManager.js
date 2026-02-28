import { TERRAIN, TERRAIN_COLORS, ERAS } from '../core/constants.js';

export class UIManager {
    constructor(game) {
        this.game = game;
    }

    init() {
        // Speed controls
        document.getElementById('btn-pause').addEventListener('click', () => {
            this.game.pause();
            this.updateSpeedButtons(-1);
        });
        document.getElementById('btn-speed1').addEventListener('click', () => {
            this.game.running = true;
            this.game.setSpeed(1);
            this.updateSpeedButtons(0);
        });
        document.getElementById('btn-speed2').addEventListener('click', () => {
            this.game.running = true;
            this.game.setSpeed(2);
            this.updateSpeedButtons(1);
        });
        document.getElementById('btn-speed3').addEventListener('click', () => {
            this.game.running = true;
            this.game.setSpeed(5);
            this.updateSpeedButtons(2);
        });

        // God power buttons
        const powerBtns = document.querySelectorAll('.power-btn');
        powerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const power = btn.dataset.power;
                this.game.godPowers.selectPower(power);

                // Update UI
                powerBtns.forEach(b => b.classList.remove('active'));
                if (this.game.godPowers.activePower === power) {
                    btn.classList.add('active');
                    this.game.canvas.style.cursor = 'crosshair';
                } else {
                    this.game.canvas.style.cursor = 'grab';
                }
            });
        });

        // Close info panel
        document.getElementById('close-info').addEventListener('click', () => {
            document.getElementById('info-panel').classList.add('hidden');
        });
    }

    update() {
        if (this.game.tick % 15 !== 0) return; // Update HUD every 15 ticks

        const sim = this.game.simulation;
        const em = this.game.entityManager;

        document.getElementById('year-display').textContent =
            `${this.game.year}년 ${this.game.currentSeason}`;
        document.getElementById('population-display').textContent =
            `인구: ${em.people.length}`;
        document.getElementById('era-display').textContent =
            `시대: ${this.game.currentEra.name}`;
        document.getElementById('happiness-display').textContent =
            `행복도: ${Math.floor(sim.happiness)}%`;
    }

    updateSpeedButtons(activeIdx) {
        const buttons = ['btn-pause', 'btn-speed1', 'btn-speed2', 'btn-speed3'];
        buttons.forEach((id, i) => {
            document.getElementById(id).classList.toggle('active', i - 1 === activeIdx);
        });
    }

    showEntityInfo(result) {
        const panel = document.getElementById('info-panel');
        const content = document.getElementById('info-content');
        panel.classList.remove('hidden');

        if (result.type === 'person') {
            const info = result.entity.getInfo();
            content.innerHTML = `
                <h4>👤 ${info.name}</h4>
                <div class="stat"><span class="stat-label">성별</span><span class="stat-value">${info.gender}</span></div>
                <div class="stat"><span class="stat-label">나이</span><span class="stat-value">${info.age}세</span></div>
                <div class="stat"><span class="stat-label">상태</span><span class="stat-value">${info.state}</span></div>
                <div class="stat"><span class="stat-label">건강</span><span class="stat-value">${this.bar(info.health)}</span></div>
                <div class="stat"><span class="stat-label">배고픔</span><span class="stat-value">${this.bar(info.hunger)}</span></div>
                <div class="stat"><span class="stat-label">에너지</span><span class="stat-value">${this.bar(info.energy)}</span></div>
                <div class="stat"><span class="stat-label">행복</span><span class="stat-value">${this.bar(info.happiness)}</span></div>
                <div class="stat"><span class="stat-label">지능</span><span class="stat-value">${info.intelligence}</span></div>
                <div class="stat"><span class="stat-label">힘</span><span class="stat-value">${info.strength}</span></div>
                <div class="stat"><span class="stat-label">배우자</span><span class="stat-value">${info.spouse}</span></div>
            `;
        } else if (result.type === 'building') {
            const info = result.entity.getInfo();
            content.innerHTML = `
                <h4>🏠 ${info.name}</h4>
                <div class="stat"><span class="stat-label">레벨</span><span class="stat-value">${info.level}</span></div>
                <div class="stat"><span class="stat-label">내구도</span><span class="stat-value">${this.bar(info.health)}</span></div>
                <div class="stat"><span class="stat-label">수용인원</span><span class="stat-value">${info.residents}/${info.capacity}</span></div>
            `;
        } else if (result.type === 'animal') {
            const a = result.entity;
            content.innerHTML = `
                <h4>🐾 ${a.config.name}</h4>
                <div class="stat"><span class="stat-label">나이</span><span class="stat-value">${Math.floor(a.age)}살</span></div>
                <div class="stat"><span class="stat-label">건강</span><span class="stat-value">${this.bar(a.health)}</span></div>
                <div class="stat"><span class="stat-label">배고픔</span><span class="stat-value">${this.bar(a.hunger)}</span></div>
                <div class="stat"><span class="stat-label">상태</span><span class="stat-value">${a.state}</span></div>
                <div class="stat"><span class="stat-label">식성</span><span class="stat-value">${a.config.herbivore ? '초식' : '육식'}</span></div>
            `;
        }
    }

    showTileInfo(x, y) {
        const world = this.game.world;
        const terrain = world.getTerrain(x, y);
        const terrainNames = {
            [TERRAIN.DEEP_WATER]: '깊은 바다',
            [TERRAIN.SHALLOW_WATER]: '얕은 물',
            [TERRAIN.SAND]: '모래',
            [TERRAIN.GRASS]: '초원',
            [TERRAIN.FOREST]: '숲',
            [TERRAIN.HILL]: '언덕',
            [TERRAIN.MOUNTAIN]: '산',
            [TERRAIN.SNOW_PEAK]: '눈 덮인 봉우리',
            [TERRAIN.FARMLAND]: '농지',
            [TERRAIN.ROAD]: '길',
        };

        const panel = document.getElementById('info-panel');
        const content = document.getElementById('info-content');
        panel.classList.remove('hidden');

        const fertility = world.getFertility(x, y);
        content.innerHTML = `
            <h4>🗺️ 지형 정보</h4>
            <div class="stat"><span class="stat-label">지형</span><span class="stat-value">${terrainNames[terrain] || '알 수 없음'}</span></div>
            <div class="stat"><span class="stat-label">좌표</span><span class="stat-value">(${x}, ${y})</span></div>
            <div class="stat"><span class="stat-label">비옥도</span><span class="stat-value">${(fertility * 100).toFixed(0)}%</span></div>
        `;
    }

    bar(value) {
        const filled = Math.floor(value / 10);
        const empty = 10 - filled;
        const color = value > 60 ? '#4c4' : value > 30 ? '#cc4' : '#c44';
        return `<span style="color:${color}">${'█'.repeat(filled)}${'░'.repeat(empty)}</span> ${Math.floor(value)}`;
    }
}
