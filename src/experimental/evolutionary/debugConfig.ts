/**
 * @fileoverview Debug logging configuration for evolutionary testing system
 * Provides standardized debug flags and logging utilities across all evolutionary modules
 */

// Debug environment variables
const DEBUG_TELEMETRY = process.env.DEBUG_TELEMETRY === 'true';
const DEBUG_EVOLUTION = process.env.DEBUG_EVOLUTION === 'true';
const DEBUG_PATTERNS = process.env.DEBUG_PATTERNS === 'true';
const DEBUG_AGENT = process.env.DEBUG_AGENT === 'true';
const DEBUG_TESTING = process.env.DEBUG_TESTING === 'true';
const DEBUG_VALIDATION = process.env.DEBUG_VALIDATION === 'true';
const DEBUG_EXAMPLES = process.env.DEBUG_EXAMPLES === 'true';
const DEBUG_ALL = process.env.DEBUG_ALL === 'true';

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