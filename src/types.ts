/** Position in machine coordinates (mm) */
export interface Position {
  x: number;
  y: number;
}

/** Well identifier like "A1", "B3", etc. */
export type WellId = string;

/** State of an individual well during a run */
export type WellState = 'pending' | 'active' | 'done' | 'skipped';
export const WellState = {
  Pending: 'pending' as WellState,
  Active: 'active' as WellState,
  Done: 'done' as WellState,
  Skipped: 'skipped' as WellState,
} as const;

/** 48-well plate: 6 rows (A-F) x 8 columns (1-8) */
export const PLATE_ROWS = 6;
export const PLATE_COLS = 8;
export const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/** Build a well ID from row/col indices */
export function wellId(row: number, col: number): WellId {
  return `${ROW_LABELS[row]}${col + 1}`;
}

/** Parse a well ID into row/col indices */
export function parseWellId(id: WellId): { row: number; col: number } {
  const rowChar = id[0].toUpperCase();
  const col = parseInt(id.slice(1), 10) - 1;
  const row = ROW_LABELS.indexOf(rowChar as (typeof ROW_LABELS)[number]);
  return { row, col };
}

/** Calibration data: machine positions for 3 corner wells */
export interface CalibrationData {
  a1: Position; // top-left
  a8: Position; // top-right
  f1: Position; // bottom-left
}

/** Run configuration */
export interface RunConfig {
  dwellTimeSec: number;
  feedRate: number;       // mm/min for XY moves between wells
  zFeedRate: number;      // mm/min for Z moves (slow, gentle dip)
  penUpValue: number;     // Z position in mm for pen up (tip raised)
  penDownValue: number;   // Z position in mm for pen down (tip in well)
}

/** Connection state */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export const ConnectionState = {
  Disconnected: 'disconnected' as ConnectionState,
  Connecting: 'connecting' as ConnectionState,
  Connected: 'connected' as ConnectionState,
  Error: 'error' as ConnectionState,
} as const;

/** Run state */
export type RunState = 'idle' | 'running' | 'paused' | 'complete';
export const RunState = {
  Idle: 'idle' as RunState,
  Running: 'running' as RunState,
  Paused: 'paused' as RunState,
  Complete: 'complete' as RunState,
} as const;

/** Calibration step */
export type CalibrationStep = 'none' | 'a1' | 'a8' | 'f1' | 'complete';
export const CalibrationStep = {
  None: 'none' as CalibrationStep,
  CalibratingA1: 'a1' as CalibrationStep,
  CalibratingA8: 'a8' as CalibrationStep,
  CalibratingF1: 'f1' as CalibrationStep,
  Complete: 'complete' as CalibrationStep,
} as const;

/** Full app state */
export interface AppState {
  connection: ConnectionState;
  machinePosition: Position;
  penDown: boolean;
  calibration: CalibrationData | null;
  calibrationStep: CalibrationStep;
  runConfig: RunConfig;
  runState: RunState;
  currentWell: WellId | null;
  wellStates: Map<WellId, WellState>;
  dwellRemainingSec: number;
  consoleLog: string[];
}

export const DEFAULT_RUN_CONFIG: RunConfig = {
  dwellTimeSec: 120,
  feedRate: 3000,
  zFeedRate: 300,
  penUpValue: 0,
  penDownValue: 7,
};
