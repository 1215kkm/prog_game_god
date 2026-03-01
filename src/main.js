import { Game } from './core/game.js';

function showTitleScreen() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    document.getElementById('hud').style.display = 'none';
    document.getElementById('minimap-container').style.display = 'none';

    let frame = 0;
    const stars = [];
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.3 + 0.1,
        });
    }

    let started = false;

    function drawTitle() {
        frame++;
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (const star of stars) {
            const alpha = 0.3 + Math.sin(frame * star.speed * 0.05) * 0.3;
            ctx.fillStyle = `rgba(255,255,200,${alpha})`;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        const grd = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2 - 40, 10,
            canvas.width / 2, canvas.height / 2 - 40, 200
        );
        grd.addColorStop(0, 'rgba(255,215,0,0.15)');
        grd.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const titleY = canvas.height / 2 - 80;
        ctx.textAlign = 'center';

        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = 'rgba(255,215,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.font = 'bold 64px serif';
        ctx.fillText('신의 손길', canvas.width / 2, titleY);

        ctx.shadowBlur = 10;
        ctx.font = '24px serif';
        ctx.fillStyle = '#c4a040';
        ctx.fillText('God Simulation', canvas.width / 2, titleY + 40);
        ctx.shadowBlur = 0;

        const pulse = 0.5 + Math.sin(frame * 0.04) * 0.3;

        // Game mode
        ctx.fillStyle = `rgba(255,255,255,${pulse})`;
        ctx.font = '20px sans-serif';
        ctx.fillText('클릭: 게임 모드', canvas.width / 2, titleY + 120);

        // Ambient mode
        ctx.fillStyle = `rgba(200,180,100,${pulse * 0.8})`;
        ctx.font = '18px sans-serif';
        ctx.fillText('A키: 관상 모드 (바닥 모니터/스크린세이버)', canvas.width / 2, titleY + 155);

        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '13px sans-serif';
        ctx.fillText('드래그: 이동 | 스크롤: 확대/축소 | F: 전체화면 | A: 관상 모드', canvas.width / 2, canvas.height - 40);

        ctx.textAlign = 'start';

        if (!started) requestAnimationFrame(drawTitle);
    }

    function startGame(ambient) {
        if (started) return;
        started = true;

        document.getElementById('hud').style.display = '';
        document.getElementById('minimap-container').style.display = '';

        const game = new Game(canvas);
        game.sound.init();
        game.sound.resume();
        game.init();

        if (ambient) {
            setTimeout(() => game.ambientMode.toggle(), 500);
        }

        window.game = game;
    }

    canvas.addEventListener('click', () => startGame(false), { once: true });
    canvas.addEventListener('touchstart', () => startGame(false), { once: true });

    const keyHandler = (e) => {
        if ((e.key === 'a' || e.key === 'A') && !started) {
            document.removeEventListener('keydown', keyHandler);
            startGame(true);
        }
    };
    document.addEventListener('keydown', keyHandler);

    drawTitle();
}

window.addEventListener('DOMContentLoaded', showTitleScreen);
