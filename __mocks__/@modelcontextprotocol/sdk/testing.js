export const createTestClient = (server = null) => {
  return {
    // simplistic proxy to server.resources API used in tests
    resources: {
      read: async (uri) => {
        // Leverage mocked executeExtendScript provided by tests
        const mod = await import(`${process.cwd()}/dist/extendscript.js`);
        const executeExtendScript = mod.executeExtendScript;
        const exec = await executeExtendScript('');

        if (!exec.success) {
          throw new Error(exec.error || 'Resource fetch failed');
        }

        if (uri.startsWith('styles://')) {
          return { contents: [{ uri, text: exec.result || '{}' }] };
        }
        if (uri.startsWith('snapshot://')) {
          return { contents: [{ uri, text: exec.result || '{}' }] };
        }
        if (uri.startsWith('fonts://')) {
          return { contents: [{ uri, text: exec.result || '{}' }] };
        }
        if (uri.startsWith('settings://')) {
          return { contents: [{ uri, text: exec.result || '{}' }] };
        }
        if (uri.startsWith('preview://')) {
          return { contents: [{ uri, blob: exec.result }] };
        }

        throw new Error('Unknown resource URI');
      }
    },
    // generic request passthrough stub (used elsewhere)
    request: async () => ({ status: 200, body: {} })
  };
}; 