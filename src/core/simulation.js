import { TICKS_PER_DAY, BUILDING_TYPE, ERAS } from './constants.js';

export class SimulationEngine {
    constructor(game) {
        this.game = game;
        this.techLevel = 0;
        this.cultureLevel = 0;
        this.foodSupply = 50;
        this.resources = { wood: 30, stone: 10, metal: 0, gold: 0 };
        this.happiness = 50;
        this.faith = 0; // Belief in the god (player)
        this.techGrowthRate = 1;
        this.cultureGrowthRate = 1;
    }

    update() {
        if (this.game.tick % (TICKS_PER_DAY / 2) !== 0) return;

        const people = this.game.entityManager.people;
        const buildings = this.game.entityManager.buildings;
        const pop = people.length;

        if (pop === 0) return;

        // Food production from farms
        const farms = buildings.filter(b => b.buildingType === 'FARM');
        const foodProduction = farms.length * 2 * this.getSeasonFoodMultiplier();
        const foodConsumption = pop * 0.3;
        this.foodSupply += foodProduction - foodConsumption;
        this.foodSupply = Math.max(0, Math.min(this.foodSupply, 500 + farms.length * 100));

        // Resource gathering (passive)
        const workers = people.filter(p => p.age >= 15 && p.age < 60);
        this.resources.wood += workers.length * 0.05;
        this.resources.stone += workers.length * 0.02;
        if (this.techLevel >= 60) this.resources.metal += workers.length * 0.01;
        if (this.techLevel >= 250) this.resources.gold += workers.length * 0.005;

        // Tech progression
        const schools = buildings.filter(b => b.buildingType === 'SCHOOL');
        const workshops = buildings.filter(b => b.buildingType === 'WORKSHOP');
        const baseTechGrowth = 0.02 * this.techGrowthRate;
        const educationBonus = schools.length * 0.05;
        const workshopBonus = workshops.length * 0.03;
        const popBonus = Math.log2(Math.max(1, pop)) * 0.01;
        this.techLevel += (baseTechGrowth + educationBonus + workshopBonus + popBonus);

        // Culture progression
        const temples = buildings.filter(b => b.buildingType === 'TEMPLE');
        const churches = buildings.filter(b => b.buildingType === 'CHURCH');
        const baseCultureGrowth = 0.01 * this.cultureGrowthRate;
        const templeBonus = temples.length * 0.04;
        const churchBonus = churches.length * 0.03;
        this.cultureLevel += baseCultureGrowth + templeBonus + churchBonus;

        // Happiness calculation
        let h = 50;
        if (this.foodSupply > pop * 2) h += 10;
        if (this.foodSupply < pop) h -= 20;
        if (this.foodSupply === 0) h -= 30;
        const houses = buildings.filter(b =>
            b.buildingType === 'HUT' || b.buildingType === 'HOUSE' || b.buildingType === 'SKYSCRAPER'
        );
        const totalCapacity = houses.reduce((sum, b) => sum + (BUILDING_TYPE[b.buildingType]?.capacity || 0), 0);
        if (totalCapacity >= pop) h += 10;
        else h -= 15;
        const weather = this.game.weather;
        if (weather.current === 'storm') h -= 10;
        if (weather.current === 'clear') h += 5;
        h += this.faith * 0.1;
        h += temples.length * 2;
        this.happiness = Math.max(0, Math.min(100, h));
    }

    getSeasonFoodMultiplier() {
        switch (this.game.season) {
            case 0: return 1.2;   // 봄 (Spring)
            case 1: return 1.5;   // 여름 (Summer)
            case 2: return 1.0;   // 가을 (Fall)
            case 3: return 0.3;   // 겨울 (Winter)
            default: return 1.0;
        }
    }

    canBuild(buildingType) {
        const bt = BUILDING_TYPE[buildingType];
        if (!bt) return false;
        const eraIndex = ERAS.findIndex(e => e.name === this.game.currentEra.name);
        return eraIndex >= bt.era;
    }

    getBuildableBuildings() {
        return Object.entries(BUILDING_TYPE)
            .filter(([key]) => this.canBuild(key))
            .map(([key, val]) => ({ key, ...val }));
    }

    onSeasonChange(season) {
        const seasonName = ['봄', '여름', '가을', '겨울'][season];
        this.game.notify(`계절이 바뀌었습니다: ${seasonName}`);

        if (season === 3) {
            // Winter effects
            this.game.weather.setWeather('snow');
        } else if (season === 0) {
            this.game.weather.setWeather('clear');
        }
    }

    onNewYear() {
        this.game.notify(`${this.game.year}년이 되었습니다.`);

        // Check for era change
        const prevEra = this.game.currentEra;
        const newEra = this.game.currentEra;
        if (prevEra.name !== newEra.name) {
            this.game.notify(`새로운 시대: ${newEra.name}!`);
        }

        // Population growth
        this.game.entityManager.tryPopulationGrowth();

        // Auto-build based on needs
        this.tryAutoBuild();
    }

    tryAutoBuild() {
        const em = this.game.entityManager;
        const pop = em.people.length;
        const buildings = em.buildings;

        // Need more housing?
        const housingCap = buildings
            .filter(b => BUILDING_TYPE[b.buildingType]?.capacity > 0)
            .reduce((sum, b) => sum + BUILDING_TYPE[b.buildingType].capacity, 0);

        if (pop > housingCap * 0.8 && this.resources.wood >= 10) {
            if (this.canBuild('HOUSE')) {
                em.tryBuildNear(em.getSettlementCenter(), 'HOUSE');
                this.resources.wood -= 10;
            } else {
                em.tryBuildNear(em.getSettlementCenter(), 'HUT');
                this.resources.wood -= 5;
            }
        }

        // Need more food?
        if (this.foodSupply < pop * 3 && this.canBuild('FARM') && this.resources.wood >= 5) {
            em.tryBuildNear(em.getSettlementCenter(), 'FARM');
            this.resources.wood -= 5;
        }

        // Auto-build era-appropriate buildings
        if (this.canBuild('TEMPLE') && !buildings.some(b => b.buildingType === 'TEMPLE') && this.resources.stone >= 20) {
            em.tryBuildNear(em.getSettlementCenter(), 'TEMPLE');
            this.resources.stone -= 20;
        }
        if (this.canBuild('SCHOOL') && buildings.filter(b => b.buildingType === 'SCHOOL').length < Math.floor(pop / 20) && this.resources.wood >= 15) {
            em.tryBuildNear(em.getSettlementCenter(), 'SCHOOL');
            this.resources.wood -= 15;
        }
        if (this.canBuild('MARKET') && !buildings.some(b => b.buildingType === 'MARKET') && this.resources.wood >= 20) {
            em.tryBuildNear(em.getSettlementCenter(), 'MARKET');
            this.resources.wood -= 20;
        }
    }
}
