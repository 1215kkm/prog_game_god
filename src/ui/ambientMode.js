// Ambient Display Mode - for big monitors as decorative/screensaver use
// Premium digital aquarium experience: elegant overlays, auto-play, BGM

export class AmbientMode {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.overlay = null;
        this.subtitleTimer = 0;
        this.currentSubtitle = '';
        this.subtitleFade = 0;
        this.eventQueue = [];
        this.idleTimer = 0;
        this.IDLE_TIMEOUT = 1800; // 60 seconds at 30fps -> auto-enable

        // Burn-in prevention
        this.burnInTimer = 0;
        this.overlayDriftX = 0;
        this.overlayDriftY = 0;
    }

    init() {
        this.createOverlay();
        this.setupAutoEnable();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'ambient-overlay';
        this.overlay.innerHTML = `
            <div id="ambient-top-info">
                <span id="ambient-year"></span>
                <span id="ambient-season"></span>
                <span id="ambient-clock"></span>
            </div>
            <div id="ambient-subtitle"></div>
            <div id="ambient-center-event"></div>
            <div id="ambient-stats">
                <span id="ambient-pop"></span>
                <span id="ambient-era"></span>
            </div>
            <div id="ambient-hint">A: 게임 모드  ·  F: 전체화면  ·  더블클릭: 전환</div>
        `;
        this.overlay.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            pointer-events:none; z-index:100; display:none;
            font-family: 'Georgia', 'Noto Serif KR', serif;
        `;

        // Styles for ambient overlay elements
        const style = document.createElement('style');
        style.textContent = `
            #ambient-overlay {
                transition: opacity 1.5s ease-in-out;
            }
            #ambient-top-info {
                position:absolute; top:30px; left:50%; transform:translateX(-50%);
                display:flex; gap:24px; font-size:18px; color:rgba(255,255,255,0.5);
                text-shadow: 0 2px 12px rgba(0,0,0,0.9);
                letter-spacing: 4px;
                font-weight: 300;
                transition: transform 8s ease-in-out;
            }
            #ambient-clock {
                font-variant-numeric: tabular-nums;
                font-family: 'SF Mono', 'Consolas', monospace;
                font-size: 15px;
                opacity: 0.4;
                letter-spacing: 2px;
            }
            #ambient-subtitle {
                position:absolute; bottom:120px; left:50%; transform:translateX(-50%);
                font-size:22px; color:rgba(255,215,0,0.75);
                text-shadow: 0 2px 16px rgba(0,0,0,0.95), 0 0 40px rgba(255,215,0,0.1);
                letter-spacing: 3px;
                transition: opacity 1.2s ease-in-out;
                max-width: 70%;
                text-align:center;
                line-height: 1.6;
                font-weight: 300;
            }
            #ambient-center-event {
                position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
                font-size:36px; color:rgba(255,255,255,0);
                text-shadow: 0 4px 20px rgba(0,0,0,0.95);
                letter-spacing: 6px;
                transition: color 2s ease-in-out, transform 2s ease-in-out;
                text-align:center;
                font-weight: 300;
                pointer-events:none;
            }
            #ambient-center-event.show {
                color:rgba(255,215,0,0.6);
                transform:translate(-50%,-50%) scale(1.05);
            }
            #ambient-stats {
                position:absolute; bottom:50px; left:50%; transform:translateX(-50%);
                display:flex; gap:40px; font-size:13px; color:rgba(255,255,255,0.25);
                text-shadow: 0 1px 6px rgba(0,0,0,0.9);
                letter-spacing: 3px;
                font-weight: 300;
                transition: transform 8s ease-in-out;
            }
            #ambient-hint {
                position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
                font-size:11px; color:rgba(255,255,255,0.1);
                font-family: 'Segoe UI', sans-serif;
                letter-spacing: 2px;
                transition: opacity 0.5s;
            }
            #ambient-overlay:hover #ambient-hint {
                opacity: 1;
            }

            /* Ambient mode transition animations */
            @keyframes ambientFadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes ambientSubtitleIn {
                0% { opacity: 0; transform: translateX(-50%) translateY(8px); }
                15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                85% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(this.overlay);
    }

    setupAutoEnable() {
        // Auto-enable ambient mode after no interaction
        const resetIdle = () => {
            this.idleTimer = 0;
            if (this.active) {
                // Click to exit ambient mode
                this.toggle();
            }
        };

        document.addEventListener('mousemove', resetIdle);
        document.addEventListener('mousedown', resetIdle);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'a' || e.key === 'A') {
                this.toggle();
            } else {
                resetIdle();
            }
            if (e.key === 'f' || e.key === 'F') {
                this.toggleFullscreen();
            }
        });
        document.addEventListener('touchstart', resetIdle);
    }

    toggle() {
        this.active = !this.active;
        const game = this.game;

        if (this.active) {
            // Enter ambient mode
            document.getElementById('hud').style.display = 'none';
            document.getElementById('minimap-container').style.display = 'none';
            this.overlay.style.display = 'block';
            game.cinematicCamera.enabled = true;
            game.running = true;
            game.setSpeed(2); // Slightly faster for ambient watching
            game.godPowers.activePower = null;
            game.canvas.style.cursor = 'none';
            this.showSubtitle('관상 모드');

            // Start ambient BGM
            if (game.sound && game.sound.initialized) {
                game.sound.startBGM();
            }
        } else {
            // Exit ambient mode
            document.getElementById('hud').style.display = '';
            document.getElementById('minimap-container').style.display = '';
            this.overlay.style.display = 'none';
            game.cinematicCamera.enabled = false;
            game.setSpeed(1);
            game.canvas.style.cursor = 'grab';

            // Stop ambient BGM
            if (game.sound) {
                game.sound.stopBGM();
            }
        }

        return this.active;
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    }

    update() {
        if (!this.active) {
            // Track idle time
            this.idleTimer++;
            if (this.idleTimer > this.IDLE_TIMEOUT && !this.active) {
                this.toggle();
            }
            return;
        }

        this.subtitleTimer++;
        this.burnInTimer++;

        // Burn-in prevention: slowly drift overlay position every 5 minutes
        if (this.burnInTimer % 9000 === 0) { // 300 seconds at 30fps
            this.overlayDriftX = (Math.random() - 0.5) * 20;
            this.overlayDriftY = (Math.random() - 0.5) * 10;

            const topInfo = document.getElementById('ambient-top-info');
            const stats = document.getElementById('ambient-stats');
            if (topInfo) topInfo.style.transform = `translateX(calc(-50% + ${this.overlayDriftX}px))`;
            if (stats) stats.style.transform = `translateX(calc(-50% + ${this.overlayDriftX}px))`;
        }

        // Update ambient info
        if (this.subtitleTimer % 15 === 0) {
            const game = this.game;
            const dayProgress = game.timeOfDay;
            const timeStr = dayProgress < 0.2 ? '밤' :
                           dayProgress < 0.28 ? '새벽' :
                           dayProgress < 0.72 ? '낮' :
                           dayProgress < 0.82 ? '저녁' : '밤';

            // Game world time
            const yearEl = document.getElementById('ambient-year');
            const seasonEl = document.getElementById('ambient-season');
            const clockEl = document.getElementById('ambient-clock');
            const popEl = document.getElementById('ambient-pop');
            const eraEl = document.getElementById('ambient-era');

            if (yearEl) yearEl.textContent = `${game.year}년`;
            if (seasonEl) seasonEl.textContent = `${game.currentSeason} · ${timeStr}`;
            if (popEl) popEl.textContent = `인구 ${game.entityManager.people.length}`;
            if (eraEl) eraEl.textContent = game.currentEra.name;

            // Real-world clock
            if (clockEl) {
                const now = new Date();
                const h = String(now.getHours()).padStart(2, '0');
                const m = String(now.getMinutes()).padStart(2, '0');
                clockEl.textContent = `${h}:${m}`;
            }
        }

        // Show event-based subtitles
        if (this.subtitleTimer % 300 === 0) {
            this.showRandomSubtitle();
        }
    }

    showSubtitle(text) {
        const el = document.getElementById('ambient-subtitle');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(() => {
            el.textContent = text;
            el.style.opacity = '1';
        }, 600);
        setTimeout(() => {
            el.style.opacity = '0';
        }, 5000);
    }

    // Show a big center event (for major events like era changes)
    showCenterEvent(text) {
        const el = document.getElementById('ambient-center-event');
        if (!el) return;
        el.textContent = text;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 4000);
    }

    showRandomSubtitle() {
        const game = this.game;
        const em = game.entityManager;
        const sim = game.simulation;
        const people = em.people.filter(p => p.alive);

        const subtitles = [];

        // Population-based
        if (people.length > 0) {
            const p = people[Math.floor(Math.random() * people.length)];
            const stateTexts = {
                idle: '하늘을 바라보고 있다',
                walking: '어딘가로 걸어가고 있다',
                working: '열심히 일하고 있다',
                eating: '식사를 하고 있다',
                sleeping: '깊은 잠에 빠져 있다',
                socializing: '이웃과 대화를 나누고 있다',
                gathering: '자원을 모으고 있다',
                building: '건물을 짓고 있다',
                fleeing: '무언가로부터 도망치고 있다',
            };
            const stateText = stateTexts[p.state] || '살아가고 있다';
            subtitles.push(`${p.name} (${Math.floor(p.age)}세)  ─  ${stateText}`);
        }

        // Relationships
        if (people.length > 0) {
            const married = people.filter(p => p.spouse);
            if (married.length > 0) {
                const p = married[Math.floor(Math.random() * married.length)];
                subtitles.push(`${p.name}과(와) ${p.spouse}의 일상이 계속된다`);
            }
            const children = people.filter(p => p.age < 15);
            if (children.length > 0) {
                const c = children[Math.floor(Math.random() * children.length)];
                subtitles.push(`어린 ${c.name}이(가) 세상을 탐험하고 있다`);
            }
        }

        // Weather-based
        const weatherTexts = {
            clear: '맑은 하늘 아래 평화로운 시간이 흐른다',
            rain: '빗소리가 대지를 적시고 있다',
            storm: '폭풍이 세상을 뒤흔든다',
            snow: '하얀 눈이 조용히 내려앉는다',
            wind: '바람이 세상을 가로지른다',
        };
        if (weatherTexts[game.weather.current]) {
            subtitles.push(weatherTexts[game.weather.current]);
        }

        // Time-based
        const dayProgress = game.timeOfDay;
        if (dayProgress > 0.2 && dayProgress < 0.28) {
            subtitles.push('동이 트고, 새로운 하루가 시작된다');
        }
        if (dayProgress > 0.72 && dayProgress < 0.78) {
            subtitles.push('해가 지고, 마을에 불빛이 하나둘 켜진다');
        }
        if (dayProgress < 0.15 || dayProgress > 0.85) {
            subtitles.push('별빛 아래 세상이 잠든다');
        }

        // Season-based
        const seasonTexts = [
            '새 생명이 움트는 봄',
            '뜨거운 태양 아래의 여름',
            '풍성한 수확의 가을',
            '고요한 겨울의 시간',
        ];
        subtitles.push(seasonTexts[game.season]);

        // Stats-based
        if (sim.techLevel > 50) {
            subtitles.push(`문명이 ${game.currentEra.name}으로 발전하고 있다`);
        }
        if (people.length > 20) {
            subtitles.push(`${people.length}명의 주민이 이 땅에서 살아가고 있다`);
        }
        if (em.buildings.length > 5) {
            subtitles.push(`${em.buildings.length}채의 건물이 마을을 이루고 있다`);
        }

        // Poetic / philosophical
        const poetic = [
            '시간은 흐르고, 세상은 변한다',
            '작은 존재들의 커다란 이야기',
            '신의 눈으로 바라본 세상',
            '모든 생명은 의미가 있다',
            '자연과 문명, 그 사이의 균형',
            '흙에서 왔다가 흙으로 돌아가는 것들',
            '무한한 시간 속의 찰나',
            '나무 한 그루가 자라는 데 백 년이 걸린다',
            '강은 바다로 흘러가고, 구름은 비가 되어 돌아온다',
            '역사는 기억하는 자의 것이다',
        ];
        subtitles.push(poetic[Math.floor(Math.random() * poetic.length)]);

        // Pick one
        const text = subtitles[Math.floor(Math.random() * subtitles.length)];
        this.showSubtitle(text);
    }

    // Called from game notify system to capture events for ambient display
    onEvent(message) {
        if (this.active) {
            // Major events get center display
            if (message.includes('시대가 열렸') || message.includes('창조')) {
                this.showCenterEvent(message);
            } else {
                this.showSubtitle(message);
            }
        }
    }
}
