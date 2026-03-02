// World
export const TILE_SIZE = 32;
export const WORLD_WIDTH = 200;
export const WORLD_HEIGHT = 200;

// Terrain types
export const TERRAIN = {
    DEEP_WATER: 0,
    SHALLOW_WATER: 1,
    SAND: 2,
    GRASS: 3,
    FOREST: 4,
    HILL: 5,
    MOUNTAIN: 6,
    SNOW_PEAK: 7,
    FARMLAND: 8,
    ROAD: 9,
};

export const TERRAIN_COLORS = {
    [TERRAIN.DEEP_WATER]: '#1858a0',
    [TERRAIN.SHALLOW_WATER]: '#3890c4',
    [TERRAIN.SAND]: '#e8d89c',
    [TERRAIN.GRASS]: '#4aac40',
    [TERRAIN.FOREST]: '#2a8030',
    [TERRAIN.HILL]: '#78a450',
    [TERRAIN.MOUNTAIN]: '#8a8a96',
    [TERRAIN.SNOW_PEAK]: '#eef0f8',
    [TERRAIN.FARMLAND]: '#82bc34',
    [TERRAIN.ROAD]: '#a8986e',
};

// Seasons
export const SEASONS = ['봄', '여름', '가을', '겨울'];

// Eras (technology progression)
export const ERAS = [
    { name: '원시 시대', techRequired: 0 },
    { name: '석기 시대', techRequired: 20 },
    { name: '청동기 시대', techRequired: 60 },
    { name: '철기 시대', techRequired: 120 },
    { name: '중세 시대', techRequired: 250 },
    { name: '르네상스', techRequired: 500 },
    { name: '산업 시대', techRequired: 1000 },
    { name: '현대', techRequired: 2000 },
    { name: '미래', techRequired: 5000 },
];

// Entity types
export const ENTITY_TYPE = {
    PERSON: 'person',
    ANIMAL: 'animal',
    BUILDING: 'building',
    TREE: 'tree',
};

// Building types
export const BUILDING_TYPE = {
    HUT: { name: '움막', era: 0, size: 1, color: '#8B6914', capacity: 3 },
    HOUSE: { name: '집', era: 1, size: 1, color: '#A0522D', capacity: 5 },
    FARM: { name: '농장', era: 1, size: 2, color: '#9ACD32', capacity: 0 },
    GRANARY: { name: '곡물 저장소', era: 2, size: 1, color: '#DAA520', capacity: 0 },
    TEMPLE: { name: '신전', era: 2, size: 2, color: '#FFD700', capacity: 0 },
    MARKET: { name: '시장', era: 3, size: 2, color: '#CD853F', capacity: 0 },
    SCHOOL: { name: '학교', era: 3, size: 1, color: '#4682B4', capacity: 20 },
    CASTLE: { name: '성', era: 4, size: 3, color: '#696969', capacity: 50 },
    WORKSHOP: { name: '공방', era: 4, size: 1, color: '#8B7355', capacity: 0 },
    CHURCH: { name: '교회', era: 4, size: 1, color: '#F5F5DC', capacity: 30 },
    FACTORY: { name: '공장', era: 6, size: 2, color: '#778899', capacity: 0 },
    HOSPITAL: { name: '병원', era: 6, size: 2, color: '#FFFFFF', capacity: 0 },
    SKYSCRAPER: { name: '고층건물', era: 7, size: 2, color: '#B0C4DE', capacity: 100 },
};

// Animal types
export const ANIMAL_TYPE = {
    RABBIT: { name: '토끼', color: '#D2B48C', speed: 1.5, herbivore: true },
    DEER: { name: '사슴', color: '#8B6914', speed: 1.2, herbivore: true },
    WOLF: { name: '늑대', color: '#696969', speed: 1.3, herbivore: false },
    BEAR: { name: '곰', color: '#5C4033', speed: 0.8, herbivore: false },
    BIRD: { name: '새', color: '#4169E1', speed: 2.0, herbivore: true },
    FISH: { name: '물고기', color: '#00CED1', speed: 1.0, herbivore: true },
};

// Weather states
export const WEATHER = {
    CLEAR: 'clear',
    CLOUDY: 'cloudy',
    RAIN: 'rain',
    STORM: 'storm',
    SNOW: 'snow',
    WIND: 'wind',
};

// NPC States
export const NPC_STATE = {
    IDLE: 'idle',
    WALKING: 'walking',
    WORKING: 'working',
    EATING: 'eating',
    SLEEPING: 'sleeping',
    SOCIALIZING: 'socializing',
    BUILDING: 'building',
    GATHERING: 'gathering',
    FLEEING: 'fleeing',
};

// Simulation
export const TICKS_PER_DAY = 600;
export const DAYS_PER_SEASON = 10;
export const SEASONS_PER_YEAR = 4;
export const TICKS_PER_YEAR = TICKS_PER_DAY * DAYS_PER_SEASON * SEASONS_PER_YEAR;
