/**
 * EventBus - 게임 전체 이벤트 시스템
 *
 * 새로운 엔티티/기능 추가 시, 기존 코드 수정 없이
 * 이벤트를 통해 세계가 반응할 수 있게 해주는 핵심 시스템.
 *
 * 사용 예:
 *   game.events.on('entity:spawned', (entity) => { ... });
 *   game.events.emit('entity:spawned', batman);
 *
 * 이벤트 목록:
 *   entity:spawned     - 엔티티 생성 시 (entity, type)
 *   entity:died         - 엔티티 사망 시 (entity, cause)
 *   entity:moved        - 엔티티 이동 시 (entity, oldPos, newPos)
 *   building:built      - 건물 건설 시 (building)
 *   building:destroyed  - 건물 파괴 시 (building, cause)
 *   power:used          - 신의 권능 사용 시 (powerName, x, y)
 *   terrain:changed     - 지형 변경 시 (x, y, oldType, newType)
 *   weather:changed     - 날씨 변경 시 (oldWeather, newWeather)
 *   season:changed      - 계절 변경 시 (oldSeason, newSeason)
 *   era:changed         - 시대 변경 시 (oldEra, newEra)
 *   day:started         - 새로운 날 시작 시 (dayCount)
 *   night:started       - 밤 시작 시
 *   tick:update         - 매 틱 업데이트 (tick)
 *   simulation:update   - 시뮬레이션 업데이트 시
 *   custom:*            - 커스텀 이벤트 (자유 정의)
 */
export class EventBus {
    constructor() {
        this._listeners = {};
        this._onceListeners = {};
    }

    /**
     * 이벤트 리스너 등록
     * @param {string} event - 이벤트 이름
     * @param {Function} callback - 콜백 함수
     * @returns {Function} unsubscribe 함수
     */
    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);

        // 구독 해제 함수 반환
        return () => this.off(event, callback);
    }

    /**
     * 한 번만 실행되는 리스너 등록
     */
    once(event, callback) {
        if (!this._onceListeners[event]) {
            this._onceListeners[event] = [];
        }
        this._onceListeners[event].push(callback);
    }

    /**
     * 이벤트 리스너 제거
     */
    off(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        }
        if (this._onceListeners[event]) {
            this._onceListeners[event] = this._onceListeners[event].filter(cb => cb !== callback);
        }
    }

    /**
     * 이벤트 발행
     * @param {string} event - 이벤트 이름
     * @param  {...any} args - 이벤트 데이터
     */
    emit(event, ...args) {
        // 일반 리스너
        if (this._listeners[event]) {
            for (const cb of this._listeners[event]) {
                try {
                    cb(...args);
                } catch (e) {
                    console.error(`[EventBus] Error in listener for '${event}':`, e);
                }
            }
        }

        // 일회성 리스너
        if (this._onceListeners[event]) {
            const once = this._onceListeners[event];
            this._onceListeners[event] = [];
            for (const cb of once) {
                try {
                    cb(...args);
                } catch (e) {
                    console.error(`[EventBus] Error in once-listener for '${event}':`, e);
                }
            }
        }

        // 와일드카드 리스너 ('*')
        if (this._listeners['*']) {
            for (const cb of this._listeners['*']) {
                try {
                    cb(event, ...args);
                } catch (e) {
                    console.error(`[EventBus] Error in wildcard listener:`, e);
                }
            }
        }
    }

    /**
     * 특정 이벤트의 모든 리스너 제거
     */
    clear(event) {
        if (event) {
            delete this._listeners[event];
            delete this._onceListeners[event];
        } else {
            this._listeners = {};
            this._onceListeners = {};
        }
    }
}
