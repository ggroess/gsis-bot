import type { AppState } from './types.ts';
import {
  ConnectionState,
  RunState,
  CalibrationStep,
  PLATE_ROWS,
  PLATE_COLS,
  wellId,
  WellState,
  DEFAULT_RUN_CONFIG,
} from './types.ts';

type Listener = () => void;

function createInitialWellStates(): Map<string, WellState> {
  const map = new Map<string, WellState>();
  for (let r = 0; r < PLATE_ROWS; r++) {
    for (let c = 0; c < PLATE_COLS; c++) {
      map.set(wellId(r, c), WellState.Pending);
    }
  }
  return map;
}

function createInitialState(): AppState {
  return {
    connection: ConnectionState.Disconnected,
    machinePosition: { x: 0, y: 0 },
    penDown: false,
    calibration: null,
    calibrationStep: CalibrationStep.None,
    runConfig: { ...DEFAULT_RUN_CONFIG },
    runState: RunState.Idle,
    currentWell: null,
    wellStates: createInitialWellStates(),
    dwellRemainingSec: 0,
    consoleLog: [],
  };
}

class Store {
  state: AppState = createInitialState();
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(partial: Partial<AppState>): void {
    Object.assign(this.state, partial);
    this.notify();
  }

  /** Log a message to the console panel */
  log(message: string): void {
    this.state.consoleLog.push(message);
    // Keep last 500 lines
    if (this.state.consoleLog.length > 500) {
      this.state.consoleLog = this.state.consoleLog.slice(-500);
    }
    this.notify();
  }

  resetWells(): void {
    this.state.wellStates = createInitialWellStates();
    this.state.currentWell = null;
    this.state.dwellRemainingSec = 0;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const store = new Store();
