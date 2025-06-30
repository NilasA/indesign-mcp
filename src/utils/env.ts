/*
 * Centralised environment-variable helpers.
 * Provides typed retrieval, default handling and boolean/int parsing.
 */

function getRaw(key: string): string | undefined {
  return (typeof process !== 'undefined' ? process.env[key] : undefined);
}

export function getBool(key: string, fallback = false): boolean {
  const val = getRaw(key);
  if (val === undefined) return fallback;
  return /^(true|1|yes)$/i.test(val);
}

export function getInt(key: string, fallback: number): number {
  const val = getRaw(key);
  const parsed = val !== undefined ? parseInt(val, 10) : NaN;
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function getString(key: string, fallback?: string): string | undefined {
  const val = getRaw(key);
  return val !== undefined ? val : fallback;
}

// Specific helpers used across codebase
export const ENV = {
  telemetryEnabled: () => getBool('TELEMETRY_ENABLED', false),
  evolutionSessionId: () => getString('EVOLUTION_SESSION_ID'),
  telemetrySessionId: () => getString('TELEMETRY_SESSION_ID'),
  telemetryAgentId: () => getString('TELEMETRY_AGENT_ID', 'task-agent'),
  telemetryGeneration: () => getInt('TELEMETRY_GENERATION', 0),
  debugTelemetry: () => getBool('DEBUG_TELEMETRY', false),
}; 