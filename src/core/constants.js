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

// 3D terrain heights
export const TERRAIN_HEIGHTS = {
    [TERRAIN.DEEP_WATER]: -2.0,
    [TERRAIN.SHALLOW_WATER]: -0.8,
    [TERRAIN.SAND]: 0.0,
    [TERRAIN.GRASS]: 0.3,
    [TERRAIN.FOREST]: 0.5,
    [TERRAIN.HILL]: 1.5,
    [TERRAIN.MOUNTAIN]: 3.5,
    [TERRAIN.SNOW_PEAK]: 5.0,
    [TERRAIN.FARMLAND]: 0.2,
    [TERRAIN.ROAD]: 0.15,
};

// 3D terrain RGB colors
export const TERRAIN_RGB = {
    [TERRAIN.DEEP_WATER]: [24, 88, 160],
    [TERRAIN.SHALLOW_WATER]: [56, 144, 196],
    [TERRAIN.SAND]: [232, 216, 156],
    [TERRAIN.GRASS]: [90, 184, 69],
    [TERRAIN.FOREST]: [42, 120, 48],
    [TERRAIN.HILL]: [120, 164, 80],
    [TERRAIN.MOUNTAIN]: [138, 138, 150],
    [TERRAIN.SNOW_PEAK]: [238, 240, 248],
    [TERRAIN.FARMLAND]: [138, 189, 52],
    [TERRAIN.ROAD]: [168, 152, 110],
};

// Seasons
export const SEASONS = ['봄', '여름', '가을', '겨울'];

// Season color tints for terrain (multipliers)
export const SEASON_TINTS = {
    0: { grass: [0.9, 1.1, 0.7], forest: [0.8, 1.1, 0.6] },   // 봄: bright green
    1: { grass: [0.8, 1.0, 0.5], forest: [0.7, 1.0, 0.5] },   // 여름: deep green
    2: { grass: [1.2, 1.0, 0.4], forest: [1.3, 0.9, 0.3] },   // 가을: orange/brown
    3: { grass: [1.1, 1.1, 1.1], forest: [1.0, 1.0, 1.0] },   // 겨울: pale
};

// Eras (technology progression) - 공룡시대 추가
export const ERAS = [
    { name: '공룡 시대', techRequired: -1, id: 'DINOSAUR' },
    { name: '원시 시대', techRequired: 0, id: 'PRIMITIVE' },
    { name: '석기 시대', techRequired: 20, id: 'STONE' },
    { name: '청동기 시대', techRequired: 60, id: 'BRONZE' },
    { name: '철기 시대', techRequired: 120, id: 'IRON' },
    { name: '중세 시대', techRequired: 250, id: 'MEDIEVAL' },
    { name: '르네상스', techRequired: 500, id: 'RENAISSANCE' },
    { name: '산업 시대', techRequired: 1000, id: 'INDUSTRIAL' },
    { name: '현대', techRequired: 2000, id: 'MODERN' },
    { name: '미래', techRequired: 5000, id: 'FUTURE' },
];

// Entity types
export const ENTITY_TYPE = {
    PERSON: 'person',
    ANIMAL: 'animal',
    BUILDING: 'building',
    TREE: 'tree',
    GIANT: 'giant',
    VEHICLE: 'vehicle',
    DINOSAUR: 'dinosaur',
};

// Personality types for spawnable people
export const PERSONALITY = {
    NORMAL: { name: '평범', color: '#4488cc', threat: 0, icon: '👤', effect: 'none' },
    CRIMINAL: { name: '범죄자', color: '#cc2222', threat: 0.8, icon: '🔪', effect: 'fear' },
    LEADER: { name: '지도자', color: '#ffd700', threat: 0, icon: '👑', effect: 'inspire', charisma: 1.5 },
    SCHOLAR: { name: '학자', color: '#9966cc', threat: 0, icon: '📚', effect: 'educate', intelligence: 2 },
    WARRIOR: { name: '전사', color: '#cc6600', threat: 0.3, icon: '⚔️', effect: 'protect', strength: 2 },
    HEALER: { name: '치유사', color: '#44cc88', threat: 0, icon: '💚', effect: 'heal', healing: true },
};

// Giant configuration
export const GIANT_CONFIG = {
    name: '거인',
    health: 500,
    baseSize: 3,
    maxSize: 8,
    speed: 0.015,
    threat: 0.9,
    color: '#886644',
    icon: '🗿',
};

// Dinosaur types
export const DINOSAUR_TYPE = {
    TREX: { name: '티라노사우루스', color: '#556B2F', speed: 1.0, size: 4, herbivore: false, icon: '🦖' },
    TRICERATOPS: { name: '트리케라톱스', color: '#8B7355', speed: 0.7, size: 3.5, herbivore: true, icon: '🦕' },
    RAPTOR: { name: '벨로키랍토르', color: '#6B8E23', speed: 1.8, size: 1.5, herbivore: false, icon: '🦎' },
    BRONTO: { name: '브론토사우루스', color: '#708090', speed: 0.4, size: 6, herbivore: true, icon: '🦕' },
    PTERANODON: { name: '프테라노돈', color: '#4682B4', speed: 2.5, size: 2, herbivore: true, icon: '🦅' },
    STEGO: { name: '스테고사우루스', color: '#8B6914', speed: 0.5, size: 3, herbivore: true, icon: '🦎' },
};

// Vehicle types by era
export const VEHICLE_TYPE = {
    CART: { name: '수레', eraId: 'BRONZE', speed: 0.5, color: '#8B6914', size: 0.8 },
    HORSE: { name: '말', eraId: 'IRON', speed: 1.2, color: '#8B4513', size: 0.7 },
    CARRIAGE: { name: '마차', eraId: 'MEDIEVAL', speed: 0.9, color: '#654321', size: 1.0 },
    TRAIN: { name: '기차', eraId: 'INDUSTRIAL', speed: 2.0, color: '#333333', size: 2.0 },
    CAR: { name: '자동차', eraId: 'MODERN', speed: 1.8, color: '#4466aa', size: 0.6 },
    BUS: { name: '버스', eraId: 'MODERN', speed: 1.5, color: '#cc6644', size: 1.0 },
    FLYING_CAR: { name: '비행차', eraId: 'FUTURE', speed: 3.0, color: '#88ccff', size: 0.7 },
};

// Time speed presets
export const TIME_SCALES = [
    { label: '일시정지', speed: 0, icon: '⏸' },
    { label: '1x', speed: 1, icon: '▶' },
    { label: '2x', speed: 2, icon: '▶▶' },
    { label: '5x', speed: 5, icon: '▶▶▶' },
    { label: '10x', speed: 10, icon: '⏩' },
    { label: '50x', speed: 50, icon: '⏩⏩' },
    { label: '1년/초', speed: 200, icon: '⚡' },
];

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
    FIGHTING: 'fighting',
    COWERING: 'cowering',
};

// Simulation
export const TICKS_PER_DAY = 600;
export const DAYS_PER_SEASON = 10;
export const SEASONS_PER_YEAR = 4;
export const TICKS_PER_YEAR = TICKS_PER_DAY * DAYS_PER_SEASON * SEASONS_PER_YEAR;
