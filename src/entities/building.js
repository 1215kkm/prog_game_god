import { BUILDING_TYPE, TILE_SIZE } from '../core/constants.js';

export class Building {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.buildingType = type;
        this.config = BUILDING_TYPE[type];
        this.health = 100;
        this.level = 1;
        this.age = 0;
        this.residents = [];
        this.workers = [];

        this.size = this.config.size;
        this.color = this.config.color;
    }

    update() {
        // Building aging
        if (this.game.tick % 1000 === 0) {
            this.age++;
        }

        // Weather damage
        const weather = this.game.weather.current;
        if (weather === 'storm' && Math.random() < 0.001) {
            this.health -= 5;
            if (this.health <= 0) {
                this.game.notify(`${this.config.name}이(가) 폭풍에 파괴되었습니다!`);
            }
        }
    }

    getInfo() {
        return {
            name: this.config.name,
            level: this.level,
            health: Math.floor(this.health),
            age: this.age,
            capacity: this.config.capacity,
            residents: this.residents.length,
        };
    }
}
