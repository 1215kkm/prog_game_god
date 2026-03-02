# 신의 손길 - 개발 가이드

## 목차
1. [아키텍처 개요](#아키텍처-개요)
2. [확장 시스템 (Registry + EventBus)](#확장-시스템)
3. [새로운 기능 추가 방법](#새로운-기능-추가-방법)
4. [개발 규칙](#개발-규칙)
5. [작업 이력](#작업-이력)
6. [체크리스트 (매 작업 시)](#체크리스트)
7. [파일 구조](#파일-구조)
8. [기존 시스템 참고](#기존-시스템-참고)

---

## 아키텍처 개요

```
┌─────────────────────────────────────────┐
│                  Game                    │
│  ┌──────────┐  ┌──────────┐            │
│  │ EventBus │  │ Registry │  ← 확장의 핵심│
│  └──────────┘  └──────────┘            │
│       │              │                  │
│  ┌────┴────┐  ┌──────┴───────┐         │
│  │ 이벤트   │  │ 엔티티/파워   │         │
│  │ 구독/발행 │  │ 등록/조회    │         │
│  └─────────┘  └──────────────┘         │
│                                         │
│  Core: World, Camera, Simulation        │
│  Entities: EntityManager, Person, ...   │
│  Powers: GodPowers, Weather             │
│  UI: Renderer, UIManager, Sprites       │
└─────────────────────────────────────────┘
```

### 핵심 원칙
- **새 기능 = 기존 코드 수정 최소화**
- Registry에 등록하면 게임이 자동으로 인식
- EventBus로 세계가 새 엔티티/상황에 반응
- 커스텀 렌더링은 등록 시 render 함수로 제공

### 접근 방법
| 추가할 것 | 수정할 파일 | 방법 |
|-----------|------------|------|
| 새 캐릭터 (배트맨 등) | 없음 (registry만) | `game.registry.registerEntity()` |
| 새 신의 권능 | 없음 (registry만) | `game.registry.registerPower()` |
| 새 지형 타입 | 없음 (registry만) | `game.registry.registerTerrain()` |
| 전역 효과 | 없음 (registry만) | `game.registry.registerWorldModifier()` |
| 커스텀 렌더링 | 없음 (registry만) | `game.registry.registerRenderLayer()` |
| 이벤트 반응 | 없음 (eventBus만) | `game.events.on('event', callback)` |

---

## 확장 시스템

### EventBus (`game.events`)

이벤트 발행/구독 시스템. 새 기능이 기존 시스템의 변화에 반응할 수 있게 해줍니다.

#### 사용 가능한 이벤트

| 이벤트 | 발생 시점 | 파라미터 |
|--------|----------|---------|
| `entity:spawned` | 엔티티 생성 | (entity, type) |
| `entity:died` | 엔티티 사망 | (entity, type) |
| `building:destroyed` | 건물 파괴 | (building) |
| `power:used` | 신의 권능 사용 | (powerName, x, y) |
| `terrain:changed` | 지형 변경 | (x, y, oldType, newType) |
| `weather:changed` | 날씨 변경 | (oldWeather, newWeather) |
| `season:changed` | 계절 변경 | (oldSeason, newSeason) |
| `day:started` | 새 날 시작 | (dayCount) |
| `dawn:started` | 새벽 시작 | - |
| `night:started` | 밤 시작 | - |
| `tick:update` | 매 틱 | (tickNumber) |

#### 예시

```javascript
// 밤이 되면 배트맨 활성화
game.events.on('night:started', () => {
    const batman = game.entityManager.customEntities.find(e => e.def.type === 'batman');
    if (batman) batman.data.active = true;
});

// 건물이 파괴되면 알림
game.events.on('building:destroyed', (building) => {
    game.notify(`${building.name}이(가) 파괴되었습니다!`);
});

// 한 번만 실행
game.events.once('era:changed', (oldEra, newEra) => {
    game.notify('새로운 시대가 열렸습니다!');
});
```

### Registry (`game.registry`)

엔티티, 파워, 지형 등을 등록하는 중앙 레지스트리.

---

## 새로운 기능 추가 방법

### 1. 새 캐릭터 추가 (예: 배트맨)

**수정 파일: 0개** - init 후 registry에 등록만 하면 됨

```javascript
// game.init() 이후 아무 시점에서 실행
game.registry.registerEntity('batman', {
    name: '배트맨',
    category: 'special',
    config: {
        speed: 2.5,
        health: 200,
        color: '#1a1a2e',
        size: 1.5,
        hostile: false,
    },
    behavior: (entity, game, dt) => {
        // 밤에만 활동
        if (game.isDaytime) return;

        // 가장 가까운 악당 찾기
        const villain = game.entityManager.customEntities.find(
            e => e.def.config.hostile && e.alive && e !== entity
        );
        if (villain) {
            entity.moveTo(villain.x, villain.y);
            if (entity.distanceTo(villain) < 2) {
                villain.health -= 5;
                if (villain.health <= 0) {
                    villain.kill();
                    game.notify('배트맨이 악당을 처치했습니다!');
                }
            }
        } else {
            // 도시 순찰
            const center = game.entityManager.getSettlementCenter();
            const angle = game.tick * 0.002;
            const patrolX = center.x + Math.cos(angle) * 15;
            const patrolY = center.y + Math.sin(angle) * 15;
            entity.moveTo(patrolX, patrolY);
        }
    },
    render: (ctx, entity, TILE_SIZE, sprites) => {
        const sx = entity.x * TILE_SIZE;
        const sy = entity.y * TILE_SIZE;
        // 망토
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 12);
        ctx.lineTo(sx - 8, sy + 4);
        ctx.lineTo(sx + 8, sy + 4);
        ctx.closePath();
        ctx.fill();
        // 몸체
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(sx - 4, sy - 10, 8, 14);
        // 마스크
        ctx.fillStyle = '#111';
        ctx.fillRect(sx - 3, sy - 14, 6, 6);
        // 눈
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx - 2, sy - 12, 2, 1);
        ctx.fillRect(sx + 1, sy - 12, 2, 1);
    },
    onSpawn: (entity, game) => {
        game.notify('🦇 배트맨이 도시를 지키러 나타났습니다!');
    },
    onDeath: (entity, game) => {
        game.notify('배트맨이 쓰러졌습니다...');
    },
});

// 스폰
const center = game.entityManager.getSettlementCenter();
game.entityManager.spawnCustom('batman', center.x, center.y);
```

### 2. 새 악당 추가 (예: 조커)

```javascript
game.registry.registerEntity('joker', {
    name: '조커',
    category: 'special',
    config: {
        speed: 1.5,
        health: 150,
        color: '#44ff44',
        size: 1.3,
        hostile: true,
    },
    behavior: (entity, game, dt) => {
        // 건물 근처에서 혼란 유발
        for (const p of game.entityManager.people) {
            if (entity.distanceTo(p) < 5 && p.alive) {
                p.happiness = Math.max(0, p.happiness - 0.5);
                if (Math.random() < 0.01) p.flee(entity.x, entity.y);
            }
        }
        // 랜덤 이동
        if (game.tick % 60 === 0) {
            entity.data.targetX = entity.x + (Math.random() - 0.5) * 10;
            entity.data.targetY = entity.y + (Math.random() - 0.5) * 10;
        }
        if (entity.data.targetX) {
            entity.moveTo(entity.data.targetX, entity.data.targetY);
        }
    },
    onSpawn: (entity, game) => {
        game.notify('🃏 조커가 도시에 나타났습니다! 혼란이 시작됩니다!');
    },
});

// 스폰
game.entityManager.spawnCustom('joker', 50, 50);
```

### 3. 새 신의 권능 추가 (예: 나무 심기)

**수정 파일: 0개** (UI 버튼은 자동 생성 또는 별도 추가)

```javascript
game.registry.registerPower('plantTree', {
    name: '나무 심기',
    icon: '🌳',
    description: '선택한 위치에 거대한 나무를 심습니다',
    cooldown: 30,
    faithCost: 0,
    faithGain: 1,
    effect: (game, x, y) => {
        game.entityManager.spawnTree(x, y, 5 + Math.random() * 5);
        game.notify('🌳 신성한 나무가 자라났습니다!');
        // 파티클 효과
        for (let i = 0; i < 15; i++) {
            game.renderer.addParticle(x, y, 'sparkle', {
                vy: -0.03, vx: (Math.random() - 0.5) * 0.02,
                life: 40, size: 3, color: '#4a4'
            });
        }
    },
});

// GodPowers에서 자동으로 인식됨
// game.godPowers.activePower = 'plantTree' 후 클릭하면 실행
```

### 4. 하늘까지 닿는 거대 나무

```javascript
game.registry.registerEntity('worldTree', {
    name: '세계수',
    category: 'object',
    config: { size: 5, color: '#2a5a20' },
    behavior: null, // 움직이지 않음
    render: (ctx, entity, TILE_SIZE) => {
        const sx = entity.x * TILE_SIZE;
        const sy = entity.y * TILE_SIZE;
        const scale = entity.size;
        // 거대한 줄기
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(sx - 8 * scale, sy - 40 * scale, 16 * scale, 44 * scale);
        // 거대한 수관
        ctx.fillStyle = '#2a6a20';
        ctx.beginPath();
        ctx.arc(sx, sy - 45 * scale, 25 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a8a30';
        ctx.beginPath();
        ctx.arc(sx - 8 * scale, sy - 35 * scale, 18 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + 10 * scale, sy - 38 * scale, 15 * scale, 0, Math.PI * 2);
        ctx.fill();
    },
    onSpawn: (entity, game) => {
        game.notify('🌲 하늘에 닿는 세계수가 자라났습니다!');
        // 주변 행복도/비옥도 부스트
        game.registry.registerWorldModifier('worldTreeAura', {
            name: '세계수의 축복',
            onTick: (game) => {
                for (const p of game.entityManager.people) {
                    if (p.alive && Math.sqrt((p.x - entity.x)**2 + (p.y - entity.y)**2) < 20) {
                        p.happiness = Math.min(100, p.happiness + 0.01);
                    }
                }
            }
        });
    },
});
```

### 5. 도로에 폭포 만들기

```javascript
game.registry.registerPower('createWaterfall', {
    name: '폭포 생성',
    icon: '🌊',
    description: '선택한 위치에 폭포를 만듭니다',
    cooldown: 120,
    faithGain: 5,
    effect: (game, x, y) => {
        const world = game.world;
        const tileX = Math.floor(x);
        const tileY = Math.floor(y);
        // 지형을 물로 변경
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                world.setTerrain(tileX + dx, tileY + dy, 1); // SHALLOW_WATER
            }
        }
        // 커스텀 렌더 레이어로 폭포 애니메이션 추가
        game.registry.registerRenderLayer('waterfall_' + tileX + '_' + tileY, 50, (ctx, game, cam) => {
            const px = tileX * 32; // TILE_SIZE
            const py = tileY * 32;
            const tick = game.tick;
            // 물줄기 애니메이션
            ctx.fillStyle = `rgba(100,180,255,${0.3 + Math.sin(tick * 0.05) * 0.1})`;
            for (let i = 0; i < 5; i++) {
                const fy = py + i * 6 + (tick * 0.5 % 6);
                ctx.fillRect(px + 10 + Math.sin(tick * 0.03 + i) * 2, fy, 12, 5);
            }
            // 물보라
            ctx.fillStyle = 'rgba(200,230,255,0.2)';
            ctx.beginPath();
            ctx.arc(px + 16, py + 36, 10 + Math.sin(tick * 0.04) * 3, 0, Math.PI * 2);
            ctx.fill();
        });
        game.notify('🌊 장엄한 폭포가 생겨났습니다!');
    },
});
```

### 6. 월드 모디파이어 (전역 효과)

```javascript
// 영원한 봄 효과 (1000틱 지속)
game.registry.registerWorldModifier('eternalSpring', {
    name: '영원한 봄',
    duration: 1000,
    onApply: () => game.notify('🌸 영원한 봄의 축복이 내렸습니다!'),
    onTick: (game) => {
        game.simulation.foodSupply += 0.01; // 매 틱 약간의 식량 증가
    },
    onRemove: () => game.notify('영원한 봄의 축복이 사라졌습니다.'),
});
```

---

## 개발 규칙

### 1. 코드 수정 최소화 원칙
- 새 기능은 **반드시 Registry + EventBus** 를 통해 추가
- 기존 파일(renderer.js, entityManager.js 등)을 직접 수정하지 않는 것이 목표
- 불가피하게 수정이 필요한 경우, 이 문서의 [작업 이력](#작업-이력)에 기록

### 2. 엔티티 규칙
- 모든 커스텀 엔티티는 `game.registry.registerEntity()`로 등록
- behavior 함수는 매 틱 호출됨 → 무거운 연산 금지
- render 함수가 없으면 기본 원형으로 표시됨
- `entity.data` 객체를 자유 데이터 저장소로 활용

### 3. 파워 규칙
- 커스텀 파워는 `game.registry.registerPower()`로 등록
- cooldown 설정 필수 (연타 방지)
- effect 함수에서 game 객체로 모든 시스템에 접근 가능

### 4. 렌더링 규칙
- 커스텀 렌더링은 render 콜백 또는 registerRenderLayer()로
- zIndex < 100: 엔티티 아래 (지형 위), zIndex >= 100: 엔티티 위
- ctx.save()/restore() 사용하여 상태 오염 방지

### 5. 이벤트 규칙
- 기존 이벤트 목록은 [EventBus 섹션](#eventbus-gameevents) 참고
- 커스텀 이벤트는 `custom:` 접두사 권장 (예: `custom:batmanArrived`)
- 리스너에서 무거운 작업 금지 (프레임 드랍 유발)

### 6. 성능 규칙
- behavior 함수: O(1) 또는 O(작은 n) 유지
- 매 틱 전체 엔티티 순회 지양 → 필요 시 일정 틱 간격으로
- 렌더링에서 createRadialGradient/createLinearGradient 남용 금지

---

## 작업 이력

### v0.1.0 - 초기 개발
- 기본 게임 시스템 구현 (월드, 엔티티, 시뮬레이션)
- 10종 신의 권능 구현
- 캔버스 2D 렌더링 파이프라인

### v0.2.0 - 관상 모드 (Ambient Mode)
- 디지털 수족관 스타일 관상 모드
- 시네마틱 카메라 자동 이동
- ambient.html 독립 페이지

### v0.3.0 - 그래픽 대규모 개선
- 밤낮 깜박임 수정 (TICKS_PER_DAY 120→600)
- 배속 연동 밤낮 (저속: 오버레이+반딧불, 고속: 아이콘만)
- 격자 패턴 제거 (오프스크린 캔버스 바이리니어 보간)
- imageSmoothingEnabled = true
- 스프라이트 크기 증가 (사람 2.0x, 동물 2.2x, 나무 /3)

### v0.4.0 - 디오라마 시각효과
- 틸트시프트 블러 (상단/하단 점진적 블러)
- CSS 필터 (saturate 1.4, contrast 1.1, brightness 1.02)
- 따뜻한 색감 오버레이 (오후 햇살 느낌)
- 강화된 비네팅 (0.15 → 0.35)
- 소프트 그림자 (블루 틴트 다중 레이어)
- 인물 그림자 추가
- 지형 색상 채도 향상

### v0.5.0 - 확장 시스템 구축 ← 현재
- **EventBus** 이벤트 시스템 구현 (`src/core/eventBus.js`)
- **Registry** 확장 레지스트리 구현 (`src/core/registry.js`)
  - 엔티티, 파워, 지형, 월드 모디파이어, 렌더 레이어 등록
- game.js에 EventBus/Registry 통합
- entityManager.js에 customEntities + spawnCustom() 추가
- godPowers.js에 커스텀 파워 지원 추가
- renderer.js에 커스텀 엔티티 렌더링 + 커스텀 레이어 훅 추가
- DEVELOPMENT.md 개발 가이드 작성

---

## 체크리스트 (매 작업 시)

매번 새로운 기능을 추가하거나 수정할 때 반드시 아래 항목을 확인합니다.

### 1단계: 규칙 확인
- [ ] Registry/EventBus를 통해 추가했는가? (기존 파일 수정 최소화)
- [ ] behavior 함수가 매 틱 안전하게 실행되는가? (null 체크, 범위 확인)
- [ ] render 함수가 ctx 상태를 오염시키지 않는가?
- [ ] cooldown이 적절하게 설정되었는가? (파워)
- [ ] 이벤트 리스너가 메모리 누수를 유발하지 않는가?
- [ ] 성능에 문제가 없는가? (O(n²) 루프 없는지 확인)

### 2단계: 작업이력 파악
- [ ] DEVELOPMENT.md의 [작업 이력](#작업-이력)에 변경사항 기록
- [ ] 수정한 파일 목록 기록
- [ ] 새로 등록한 엔티티/파워/이벤트 목록 기록

### 3단계: 오류 확인 및 시뮬레이션
- [ ] 브라우저 콘솔에 에러 없는지 확인
- [ ] 새 엔티티가 화면에 정상 렌더링되는지 확인
- [ ] 엔티티 behavior가 정상 동작하는지 확인 (이동, 상호작용)
- [ ] 기존 시스템에 영향 없는지 확인 (사람/동물/건물 정상 동작)
- [ ] 밤낮 전환 시 문제 없는지 확인
- [ ] 배속 변경(1x~5x) 시 문제 없는지 확인
- [ ] 메모리 사용량이 시간에 따라 증가하지 않는지 확인
- [ ] 엔티티 사망/제거가 정상 처리되는지 확인

---

## 파일 구조

```
src/
├── core/
│   ├── game.js          # 게임 메인 오케스트레이터
│   ├── constants.js     # 상수 정의 (지형, 건물, 동물 등)
│   ├── simulation.js    # 경제/기술/문화 시뮬레이션
│   ├── eventBus.js      # ★ 이벤트 발행/구독 시스템
│   └── registry.js      # ★ 엔티티/파워/지형 등록 레지스트리
├── entities/
│   ├── entityManager.js # 엔티티 관리 (+ customEntities)
│   ├── person.js        # NPC AI (상태머신)
│   ├── animal.js        # 동물 AI
│   └── building.js      # 건물 클래스
├── powers/
│   ├── godPowers.js     # 신의 권능 (+ 커스텀 파워 지원)
│   └── weather.js       # 날씨 시스템
├── world/
│   └── world.js         # 지형 생성 및 관리
├── ui/
│   ├── renderer.js      # 렌더링 (+ 커스텀 엔티티/레이어)
│   ├── camera.js        # 카메라/입력
│   ├── uiManager.js     # HUD 관리
│   ├── minimap.js       # 미니맵
│   ├── sprites.js       # 스프라이트 생성
│   ├── sound.js         # 사운드
│   ├── ambientMode.js   # 관상 모드
│   └── cinematicCamera.js # 시네마틱 카메라
├── utils/
│   ├── noise.js         # 펄린 노이즈
│   └── pathfinding.js   # 길찾기
└── main.js              # 진입점 + 타이틀 화면
```

★ 표시: 확장 시스템 핵심 파일

---

## 기존 시스템 참고

### game 객체에서 접근 가능한 시스템

```javascript
game.events          // EventBus - 이벤트 구독/발행
game.registry        // Registry - 확장 등록
game.world           // World - 지형 조회/변경
game.entityManager   // EntityManager - 엔티티 관리
game.weather         // WeatherSystem - 날씨
game.godPowers       // GodPowers - 신의 권능
game.simulation      // SimulationEngine - 시뮬레이션 데이터
game.renderer        // Renderer - 파티클/쇼크웨이브 추가
game.camera          // Camera - 카메라 위치/줌
game.sound           // SoundSystem - 사운드
game.tick            // 현재 틱
game.speed           // 현재 배속 (1, 2, 5)
game.season          // 현재 계절 (0=봄, 1=여름, 2=가을, 3=겨울)
game.year            // 현재 년도
game.timeOfDay       // 하루 중 시간 (0.0~1.0)
game.isDaytime       // 낮인지 여부
```

### 자주 사용하는 메서드

```javascript
// 엔티티 스폰
game.entityManager.spawnCustom('type', x, y)  // 커스텀 엔티티
game.entityManager.spawnTree(x, y, size)       // 나무

// 알림
game.notify('메시지')

// 지형 변경
game.world.getTerrain(x, y)      // 지형 타입 조회
game.world.setTerrain(x, y, type) // 지형 타입 변경
game.world.isWalkable(x, y)       // 이동 가능 여부

// 시뮬레이션 데이터
game.simulation.techLevel
game.simulation.foodSupply
game.simulation.happiness
game.simulation.faith

// 렌더링 효과
game.renderer.addParticle(x, y, type, options)
game.renderer.addShockwave(x, y, options)
game.renderer.addGlowPoint(x, y, options)
game.renderer.triggerScreenFlash(color, intensity)

// 카메라
game.camera.centerOn(x, y)
game.camera.shake(intensity, duration)
```

### 지형 타입 번호

```
0: DEEP_WATER    (깊은 물)
1: SHALLOW_WATER (얕은 물)
2: SAND          (모래)
3: GRASS         (초원)
4: FOREST        (숲)
5: HILL          (언덕)
6: MOUNTAIN      (산)
7: SNOW_PEAK     (설산)
8: FARMLAND      (농지)
9: ROAD          (도로)
```
