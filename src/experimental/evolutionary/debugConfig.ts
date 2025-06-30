/**
 * @fileoverview Debug logging configuration for evolutionary testing system
 * Provides standardized debug flags and logging utilities across all evolutionary modules
 */

import { getBool } from "../../utils/env.js";

// Debug environment variables
const DEBUG_TELEMETRY = getBool('DEBUG_TELEMETRY');
const DEBUG_EVOLUTION = getBool('DEBUG_EVOLUTION');
const DEBUG_PATTERNS = getBool('DEBUG_PATTERNS');
const DEBUG_AGENT = getBool('DEBUG_AGENT');
const DEBUG_TESTING = getBool('DEBUG_TESTING');
const DEBUG_VALIDATION = getBool('DEBUG_VALIDATION');
const DEBUG_EXAMPLES = getBool('DEBUG_EXAMPLES');
const DEBUG_ALL = getBool('DEBUG_ALL');

// Emoji prefixes for consistent formatting
export const LOG_PREFIXES = {
  TELEMETRY: '📊',
  EVOLUTION: '🧬',
  PATTERNS: '🔍',
  AGENT: '🤖',
  TESTING: '🧪',
  VALIDATION: '⚠️',
  EXAMPLES: '📚',
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️'
} as const;

/**
 * Debug logger factory functions
 */
export const createDebugLogger = (category: keyof typeof LOG_PREFIXES) => {
  const prefix = LOG_PREFIXES[category];
  const shouldLog = DEBUG_ALL || 
    (category === 'TELEMETRY' && DEBUG_TELEMETRY) ||
    (category === 'EVOLUTION' && DEBUG_EVOLUTION) ||
    (category === 'PATTERNS' && DEBUG_PATTERNS) ||
    (category === 'AGENT' && DEBUG_AGENT) ||
    (category === 'TESTING' && DEBUG_TESTING) ||
    (category === 'VALIDATION' && DEBUG_VALIDATION) ||
    (category === 'EXAMPLES' && DEBUG_EXAMPLES);

  return (message: string) => {
    if (shouldLog) {
      console.log(`${prefix} ${message}`);
    }
  };
};

/**
 * Pre-configured debug loggers for common categories
 */
export const debugLog = {
  telemetry: createDebugLogger('TELEMETRY'),
  evolution: createDebugLogger('EVOLUTION'),
  patterns: createDebugLogger('PATTERNS'),
  agent: createDebugLogger('AGENT'),
  testing: createDebugLogger('TESTING'),
  validation: createDebugLogger('VALIDATION'),
  examples: createDebugLogger('EXAMPLES'),
  success: createDebugLogger('SUCCESS'),
  error: createDebugLogger('ERROR'),
  warning: createDebugLogger('WARNING'),
  info: createDebugLogger('INFO')
};

/**
 * Check if any debug mode is enabled
 */
export const isDebugEnabled = () => {
  return DEBUG_ALL || DEBUG_TELEMETRY || DEBUG_EVOLUTION || 
         DEBUG_PATTERNS || DEBUG_AGENT || DEBUG_TESTING || 
         DEBUG_VALIDATION || DEBUG_EXAMPLES;
};

/**
 * Get current debug configuration
 */
export const getDebugConfig = () => ({
  DEBUG_TELEMETRY,
  DEBUG_EVOLUTION,
  DEBUG_PATTERNS,
  DEBUG_AGENT,
  DEBUG_TESTING,
  DEBUG_VALIDATION,
  DEBUG_EXAMPLES,
  DEBUG_ALL,
  isEnabled: isDebugEnabled()
});

/**
 * Print debug configuration status
 */
export const printDebugStatus = () => {
  if (!isDebugEnabled()) {
    console.log('ℹ️  Debug logging disabled. Set DEBUG_* environment variables to enable.');
    console.log('   Available: DEBUG_EVOLUTION, DEBUG_TELEMETRY, DEBUG_PATTERNS, DEBUG_AGENT');
    console.log('   Set DEBUG_ALL=true to enable all debug output.');
    return;
  }

  console.log('🔧 Debug Configuration:');
  const config = getDebugConfig();
  Object.entries(config).forEach(([key, value]) => {
    if (key !== 'isEnabled' && typeof value === 'boolean') {
      console.log(`   ${key}: ${value ? '✅' : '❌'}`);
    }
  });
  console.log('');
};