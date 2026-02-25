/**
 * Persist calibration and run config to localStorage.
 */

import type { CalibrationData, RunConfig } from './types.ts';
import { DEFAULT_RUN_CONFIG } from './types.ts';

const CALIBRATION_KEY = 'gsis-bot:calibration';
const CONFIG_KEY = 'gsis-bot:config';

export function saveCalibration(data: CalibrationData): void {
  localStorage.setItem(CALIBRATION_KEY, JSON.stringify(data));
}

export function loadCalibration(): CalibrationData | null {
  const raw = localStorage.getItem(CALIBRATION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CalibrationData;
  } catch {
    return null;
  }
}

export function saveRunConfig(config: RunConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadRunConfig(): RunConfig {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return { ...DEFAULT_RUN_CONFIG };
  try {
    return { ...DEFAULT_RUN_CONFIG, ...JSON.parse(raw) } as RunConfig;
  } catch {
    return { ...DEFAULT_RUN_CONFIG };
  }
}
