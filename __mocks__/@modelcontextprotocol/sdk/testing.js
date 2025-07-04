import { join } from 'path';

export const createTestClient = (server = null) => {
  return {
    // simplistic proxy to server.resources API used in tests
    resources: {
      read: async (uri) => {
        // Resolve executeExtendScript via the same module instance that Jest tests mock.
        // Attempt absolute path first (projectRoot/src/extendscript.js). If that fails (e.g. ESM loader
        // can't resolve the .js shim), fall back to the already-loaded module from Jest's cache using
        // require.resolve – this guarantees we hit the mocked function returned by jest.mock().
        const { executeExtendScript } = await import('../../../src/extendscript.js');

        // Execute empty script to trigger mocked InDesign state inspection
        let exec;
        try {
          exec = await executeExtendScript('');
        } catch {
          exec = undefined; // leave as undefined if bridge missing
        }

        if (exec && exec.success === false) {
          throw new Error(exec.error || 'Resource fetch failed');
        }

        if (uri.startsWith('styles://')) {
          return { contents: [{ uri, text: exec?.result || '{}' }] };
        }
        if (uri.startsWith('snapshot://')) {
          return { contents: [{ uri, text: exec?.result || '{}' }] };
        }
        if (uri.startsWith('fonts://')) {
          return { contents: [{ uri, text: exec?.result || '{}' }] };
        }
        if (uri.startsWith('settings://')) {
          return { contents: [{ uri, text: exec?.result || '{}' }] };
        }
        if (uri.startsWith('preview://')) {
          let blob = '{}';
          let mimeType = 'image/png';
          if (exec?.result) {
            try {
              const parsed = typeof exec.result === 'string' ? JSON.parse(exec.result) : exec.result;
              if (parsed && parsed.data) {
                blob = parsed.data;
              }
            } catch {}
          }
          return { contents: [{ uri, blob, mimeType }] };
        }

        throw new Error('Unknown resource URI');
      }
    },
    // generic request passthrough stub (used elsewhere)
    request: async () => ({ status: 200, body: {} })
  };
}; 