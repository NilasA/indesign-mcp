/**
 * @fileoverview Singleton module for telemetry enabled flag
 * Prevents circular import issues in telemetry system
 */

import { ENV } from "../utils/env.js";

/**
 * Internal flag for telemetry enabled state
 */
let telemetryEnabled = false;

/**
 * Check if telemetry is currently enabled
 */
export function isTelemetryEnabled(): boolean {
  return telemetryEnabled;
}

/**
 * Set telemetry enabled state
 */
export function setTelemetryEnabled(enabled: boolean): void {
  telemetryEnabled = enabled;
  if (ENV.debugTelemetry()) {
    console.log(`📊 Telemetry ${enabled ? 'enabled' : 'disabled'}`);
  }
}

/**
 * Initialize telemetry state from environment
 */
export function initializeTelemetryFromEnv(): void {
  // Check environment variables for initial state
  const envEnabled = ENV.telemetryEnabled() ||
                    ENV.evolutionSessionId() !== undefined;
  
  if (envEnabled) {
    setTelemetryEnabled(true);
  }
}