// Ambient Display Mode - for big monitors as decorative/screensaver use
// Hides game HUD, shows minimal elegant info overlay, auto-plays everything

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
            </div>
            <div id="ambient-subtitle"></div>
            <div id="ambient-stats">
                <span id="ambient-pop"></span>
                <span id="ambient-era"></span>
            </div>
            <div id="ambient-hint">클릭하여 돌아가기</div>
        `;
        this.overlay.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            pointer-events:none; z-index:100; display:none;
            font-family: 'Georgia', serif;
        `;

        // Styles for ambient overlay elements
        const style = document.createElement('style');
        style.textContent = `
            #ambient-overlay { transition: opacity 1s; }
            #ambient-top-info {
                position:absolute; top:30px; left:50%; transform:translateX(-50%);
                display:flex; gap:20px; font-size:20px; color:rgba(255,255,255,0.6);
                text-shadow: 0 2px 8px rgba(0,0,0,0.8);
                letter-spacing: 3px;
            }
            #ambient-subtitle {
                position:absolute; bottom:100px; left:50%; transform:translateX(-50%);
                font-size:18px; color:rgba(255,215,0,0.8);
                text-shadow: 0 2px 10px rgba(0,0,0,0.9);
                letter-spacing: 2px;
                transition: opacity 0.8s;
                max-width: 80%;
                text-align:center;
            }
            #ambient-stats {
                position:absolute; bottom:40px; left:50%; transform:translateX(-50%);
                display:flex; gap:30px; font-size:14px; color:rgba(255,255,255,0.35);
                text-shadow: 0 1px 4px rgba(0,0,0,0.8);
                letter-spacing: 2px;
            }
            #ambient-hint {
                position:absolute; bottom:15px; left:50%; transform:translateX(-50%);
                font-size:11px; color:rgba(255,255,255,0.15);
                font-family: sans-serif;
                letter-spacing: 1px;
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
        } else {
            // Exit ambient mode
            document.getElementById('hud').style.display = '';
            document.getElementById('minimap-container').style.display = '';
            this.overlay.style.display = 'none';
            game.cinematicCamera.enabled = false;
            game.setSpeed(1);
            game.canvas.style.cursor = 'grab';
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

        // Update ambient info
        if (this.subtitleTimer % 15 === 0) {
            const game = this.game;
            const sim = game.simulation;
            const dayProgress = game.timeOfDay;
            const timeStr = dayProgress < 0.25 ? '밤' :
                           dayProgress < 0.35 ? '새벽' :
                           dayProgress < 0.65 ? '낮' :
                           dayProgress < 0.75 ? '저녁' : '밤';

            document.getElementById('ambient-year').textContent =
                `${game.year}년`;
            document.getElementById('ambient-season').textContent =
                `${game.currentSeason} · ${timeStr}`;
            document.getElementById('ambient-pop').textContent =
                `인구 ${game.entityManager.people.length}`;
            document.getElementById('ambient-era').textContent =
                game.currentEra.name;
        }

        // Show event-based subtitles
        if (this.subtitleTimer % 300 === 0) {
            this.showRandomSubtitle();
        }
    }

    showSubtitle(text) {
        const el = document.getElementById('ambient-subtitle');
        el.style.opacity = '0';
        setTimeout(() => {
            el.textContent = text;
            el.style.opacity = '1';
        }, 400);
        setTimeout(() => {
            el.style.opacity = '0';
        }, 4000);
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
            };
            const stateText = stateTexts[p.state] || '살아가고 있다';
            subtitles.push(`${p.name}(${Math.floor(p.age)}세)이(가) ${stateText}`);
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

        // Poetic
        const poetic = [
            '시간은 흐르고, 세상은 변한다',
            '작은 존재들의 커다란 이야기',
            '신의 눈으로 바라본 세상',
            '모든 생명은 의미가 있다',
            '자연과 문명, 그 사이의 균형',
        ];
        subtitles.push(poetic[Math.floor(Math.random() * poetic.length)]);

        // Pick one
        const text = subtitles[Math.floor(Math.random() * subtitles.length)];
        this.showSubtitle(text);
    }

    // Called from game notify system to capture events for ambient display
    onEvent(message) {
        if (this.active) {
            this.showSubtitle(message);
        }
    }
}
