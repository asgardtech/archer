import { RaptorGameState } from "../types";
import type { StateTransitionMap } from "../types";

const VALID_TRANSITIONS: StateTransitionMap = {
  loading: ["menu"],
  menu: ["slot_select"],
  slot_select: ["menu", "story_intro", "playing"],
  story_intro: ["briefing", "playing"],
  briefing: ["playing"],
  playing: ["paused", "level_complete", "gameover", "victory"],
  paused: ["playing", "menu"],
  level_complete: ["briefing", "playing", "menu"],
  gameover: ["menu"],
  victory: ["menu"],
};

const TRANSITION_COOLDOWN_MS = 100;
const ASYNC_TIMEOUT_MS = 5000;

const SETTINGS_ALLOWED_STATES: Set<RaptorGameState> = new Set([
  "menu", "slot_select", "paused", "level_complete", "gameover", "victory",
]);

const MUTE_ALLOWED_STATES: Set<RaptorGameState> = new Set([
  "menu", "slot_select", "story_intro", "briefing", "paused", "level_complete", "gameover", "victory",
]);

export class MenuStateMachine {
  private _state: RaptorGameState;
  private _transitionPending = false;
  private _lastTransitionTime = 0;
  private _asyncStartTime = 0;
  private consumeInputFn: (() => void) | null = null;
  private _onAsyncTimeout: (() => void) | null = null;

  constructor(initialState: RaptorGameState = "menu", consumeInputFn?: () => void) {
    this._state = initialState;
    this.consumeInputFn = consumeInputFn ?? null;
  }

  set onAsyncTimeout(cb: (() => void) | null) {
    this._onAsyncTimeout = cb;
  }

  get state(): RaptorGameState {
    return this._state;
  }

  get transitionPending(): boolean {
    return this._transitionPending;
  }

  transition(to: RaptorGameState): boolean {
    const now = performance.now();
    if (now - this._lastTransitionTime < TRANSITION_COOLDOWN_MS) {
      return false;
    }

    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed || !allowed.includes(to)) {
      return false;
    }

    this._state = to;
    this._lastTransitionTime = now;
    this.consumeInputFn?.();
    return true;
  }

  forceState(state: RaptorGameState): void {
    this._state = state;
    this._lastTransitionTime = performance.now();
    this.consumeInputFn?.();
  }

  setAsyncPending(pending: boolean): void {
    this._transitionPending = pending;
    if (pending) {
      this._asyncStartTime = performance.now();
    } else {
      this._asyncStartTime = 0;
    }
  }

  checkAsyncTimeout(): boolean {
    if (!this._transitionPending || this._asyncStartTime === 0) return false;
    if (performance.now() - this._asyncStartTime >= ASYNC_TIMEOUT_MS) {
      this._transitionPending = false;
      this._asyncStartTime = 0;
      this._onAsyncTimeout?.();
      return true;
    }
    return false;
  }

  canTransition(to: RaptorGameState): boolean {
    const allowed = VALID_TRANSITIONS[this._state];
    return !!allowed && allowed.includes(to);
  }

  isSettingsAllowed(): boolean {
    return SETTINGS_ALLOWED_STATES.has(this._state) && !this._transitionPending;
  }

  isMuteAllowed(): boolean {
    return MUTE_ALLOWED_STATES.has(this._state) && !this._transitionPending;
  }
}
