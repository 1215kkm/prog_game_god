import { Game } from './core/game.js';

// Title screen
function showTitleScreen() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Hide HUD during title
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

    function drawTitle() {
        frame++;
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Stars
        for (const star of stars) {
            const alpha = 0.3 + Math.sin(frame * star.speed * 0.05) * 0.3;
            ctx.fillStyle = `rgba(255,255,200,${alpha})`;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        // Subtle glow in center
        const grd = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2 - 40, 10,
            canvas.width / 2, canvas.height / 2 - 40, 200
        );
        grd.addColorStop(0, 'rgba(255,215,0,0.15)');
        grd.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        const titleY = canvas.height / 2 - 60;
        ctx.textAlign = 'center';

        // Main title
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = 'rgba(255,215,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.font = 'bold 64px serif';
        ctx.fillText('신의 손길', canvas.width / 2, titleY);

        // Subtitle
        ctx.shadowBlur = 10;
        ctx.font = '24px serif';
        ctx.fillStyle = '#c4a040';
        ctx.fillText('God Simulation', canvas.width / 2, titleY + 40);

        ctx.shadowBlur = 0;

        // Start prompt (pulsing)
        const pulse = 0.5 + Math.sin(frame * 0.04) * 0.3;
        ctx.fillStyle = `rgba(255,255,255,${pulse})`;
        ctx.font = '20px sans-serif';
        ctx.fillText('클릭하여 세계를 창조하세요', canvas.width / 2, titleY + 120);

        // Controls info
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '14px sans-serif';
        ctx.fillText('드래그: 이동 | 스크롤: 확대/축소 | 좌측 패널: 신의 권능', canvas.width / 2, canvas.height - 40);

        ctx.textAlign = 'start';

        if (!started) {
            requestAnimationFrame(drawTitle);
        }
    }

    let started = false;

    function startGame() {
        if (started) return;
        started = true;

        document.getElementById('hud').style.display = '';
        document.getElementById('minimap-container').style.display = '';

        const game = new Game(canvas);
        game.sound.init();
        game.sound.resume();
        game.init();

        window.game = game;
        console.log('🌍 신의 손길 - God Simulation Started');
    }

    canvas.addEventListener('click', startGame, { once: true });
    canvas.addEventListener('touchstart', startGame, { once: true });

    drawTitle();
}

window.addEventListener('DOMContentLoaded', showTitleScreen);
