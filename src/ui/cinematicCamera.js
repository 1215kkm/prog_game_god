// Cinematic auto-camera for ambient/screensaver mode
// Slowly pans to interesting events, zooms in on action, smooth transitions

export class CinematicCamera {
    constructor(game) {
        this.game = game;
        this.enabled = false;

        // Current target
        this.targetX = 0;
        this.targetY = 0;
        this.targetZoom = 1.5;

        // Smooth interpolation
        this.lerpSpeed = 0.008;
        this.zoomLerpSpeed = 0.005;

        // Timing
        this.holdTimer = 0;
        this.holdDuration = 400; // ticks to stay at a spot
        this.transitionTimer = 0;

        // Points of interest
        this.currentPOI = null;
        this.poiHistory = []; // Avoid revisiting same spots

        // Cinematic modes
        this.modes = ['overview', 'followPerson', 'settlement', 'nature', 'event'];
        this.currentMode = 'overview';
        this.modeTimer = 0;
        this.modeDuration = 600;

        // Slow pan for overview
        this.panAngle = 0;
        this.panRadius = 30;
    }

    toggle() {
        this.enabled = !this.enabled;
        if (this.enabled) {
            this.pickNextMode();
        }
        return this.enabled;
    }

    update() {
        if (!this.enabled) return;

        this.modeTimer++;
        this.holdTimer++;

        // Switch mode periodically
        if (this.modeTimer > this.modeDuration) {
            this.pickNextMode();
        }

        // Execute current mode
        switch (this.currentMode) {
            case 'overview':
                this.updateOverview();
                break;
            case 'followPerson':
                this.updateFollowPerson();
                break;
            case 'settlement':
                this.updateSettlement();
                break;
            case 'nature':
                this.updateNature();
                break;
            case 'event':
                this.updateEvent();
                break;
        }

        // Smooth camera movement
        const cam = this.game.camera;
        const canvas = this.game.canvas;

        // Convert target tile position to camera position
        const desiredCamX = this.targetX * 24 - canvas.width / (2 * this.targetZoom);
        const desiredCamY = this.targetY * 24 - canvas.height / (2 * this.targetZoom);

        cam.x += (desiredCamX - cam.x) * this.lerpSpeed;
        cam.y += (desiredCamY - cam.y) * this.lerpSpeed;
        cam.zoom += (this.targetZoom - cam.zoom) * this.zoomLerpSpeed;
        cam.clamp();
    }

    pickNextMode() {
        this.modeTimer = 0;

        const em = this.game.entityManager;

        // Weight modes by what's interesting right now
        const weights = [];

        weights.push({ mode: 'overview', weight: 1 });

        if (em.people.length > 0) {
            weights.push({ mode: 'followPerson', weight: 3 });
        }
        if (em.buildings.length > 0) {
            weights.push({ mode: 'settlement', weight: 2 });
        }
        weights.push({ mode: 'nature', weight: 2 });

        // Events get priority
        const weather = this.game.weather.current;
        if (weather === 'storm' || weather === 'snow') {
            weights.push({ mode: 'event', weight: 4 });
        }

        // Weighted random pick
        const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const w of weights) {
            roll -= w.weight;
            if (roll <= 0) {
                this.currentMode = w.mode;
                break;
            }
        }

        this.holdTimer = 0;
        this.setupMode();

        // Vary durations
        this.modeDuration = 400 + Math.random() * 400;
    }

    setupMode() {
        const em = this.game.entityManager;
        const world = this.game.world;

        switch (this.currentMode) {
            case 'overview':
                this.targetZoom = 0.6 + Math.random() * 0.4;
                this.lerpSpeed = 0.005;
                const center = em.getSettlementCenter();
                this.targetX = center.x;
                this.targetY = center.y;
                this.panAngle = Math.random() * Math.PI * 2;
                break;

            case 'followPerson':
                this.targetZoom = 2.0 + Math.random() * 1.0;
                this.lerpSpeed = 0.015;
                // Pick an interesting person
                this.currentPOI = this.pickInterestingPerson();
                break;

            case 'settlement':
                this.targetZoom = 1.2 + Math.random() * 0.8;
                this.lerpSpeed = 0.008;
                const sc = em.getSettlementCenter();
                this.targetX = sc.x + (Math.random() - 0.5) * 15;
                this.targetY = sc.y + (Math.random() - 0.5) * 15;
                break;

            case 'nature':
                this.targetZoom = 1.0 + Math.random() * 1.0;
                this.lerpSpeed = 0.006;
                // Find a scenic spot (forest, water edge, mountain)
                const scenic = this.findScenicSpot();
                this.targetX = scenic.x;
                this.targetY = scenic.y;
                break;

            case 'event':
                this.targetZoom = 1.5;
                this.lerpSpeed = 0.012;
                break;
        }
    }

    updateOverview() {
        // Slow circular pan around settlement
        this.panAngle += 0.002;
        const center = this.game.entityManager.getSettlementCenter();
        this.targetX = center.x + Math.cos(this.panAngle) * this.panRadius;
        this.targetY = center.y + Math.sin(this.panAngle) * this.panRadius;
    }

    updateFollowPerson() {
        if (!this.currentPOI || !this.currentPOI.alive) {
            this.currentPOI = this.pickInterestingPerson();
            if (!this.currentPOI) {
                this.currentMode = 'overview';
                this.setupMode();
                return;
            }
        }
        this.targetX = this.currentPOI.x;
        this.targetY = this.currentPOI.y;
    }

    updateSettlement() {
        // Gentle drift around settlement area
        if (this.holdTimer % 200 === 0) {
            const sc = this.game.entityManager.getSettlementCenter();
            this.targetX = sc.x + (Math.random() - 0.5) * 20;
            this.targetY = sc.y + (Math.random() - 0.5) * 20;
        }
    }

    updateNature() {
        // Stay put and slowly zoom in/out
        const breath = Math.sin(this.modeTimer * 0.005) * 0.2;
        this.targetZoom = 1.2 + breath;
    }

    updateEvent() {
        // Follow weather or any ongoing event
        const weather = this.game.weather;
        if (weather.current === 'storm' && weather.lightningFlash > 0) {
            this.targetZoom = 1.8;
        }

        // If nothing happening, switch to something else
        if (this.holdTimer > 300 && weather.current === 'clear') {
            this.pickNextMode();
        }
    }

    pickInterestingPerson() {
        const people = this.game.entityManager.people.filter(p => p.alive);
        if (people.length === 0) return null;

        // Prioritize: socializing > working > walking > idle
        const scored = people.map(p => {
            let score = Math.random() * 2;
            if (p.state === 'socializing') score += 5;
            if (p.state === 'working') score += 3;
            if (p.state === 'walking') score += 2;
            if (p.state === 'fleeing') score += 6;
            if (p.spouse) score += 1;
            if (p.age < 15) score += 2; // Children are cute
            return { person: p, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0].person;
    }

    findScenicSpot() {
        const world = this.game.world;
        const spots = [];

        // Sample random locations and score them
        for (let i = 0; i < 30; i++) {
            const x = 10 + Math.random() * (world.width - 20);
            const y = 10 + Math.random() * (world.height - 20);
            const terrain = world.getTerrain(Math.floor(x), Math.floor(y));

            let score = 0;
            if (terrain === 4) score += 3; // Forest
            if (terrain === 5) score += 4; // Hill (scenic overlook)
            if (terrain === 6) score += 5; // Mountain

            // Bonus for being near water
            for (const [dx, dy] of [[-3,0],[3,0],[0,-3],[0,3]]) {
                if (world.isWater(Math.floor(x + dx), Math.floor(y + dy))) {
                    score += 3;
                    break;
                }
            }

            spots.push({ x, y, score });
        }

        spots.sort((a, b) => b.score - a.score);
        return spots[0] || { x: world.width / 2, y: world.height / 2 };
    }
}
