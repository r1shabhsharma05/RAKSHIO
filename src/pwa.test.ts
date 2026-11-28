import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

// Source-level guards for the PWA: the real behaviour (offline reload) is
// covered by the Playwright production spec; these stop a careless edit
// from deleting the worker or its registration unnoticed.
describe('PWA service worker', () => {
  it('public/sw.js exists with a versioned cache and lifecycle handlers', () => {
    const sw = read('../public/sw.js');
    expect(sw).toContain('rakshio-v');
    expect(sw).toContain("addEventListener('install'");
    expect(sw).toContain("addEventListener('activate'");
    expect(sw).toContain("addEventListener('fetch'");
    // Step 19 (A9): the worker must take control on the first visit, or
    // an offline reload on that visit serves a blank page.
    expect(sw).toContain('skipWaiting()');
    expect(sw).toContain('clients.claim()');
    // Step 19 (A9, real fix): first-visit assets load before the worker
    // takes control, so the app posts them for caching (see main.tsx).
    expect(sw).toContain("event.data?.type !== 'cache-assets'");
    // Step 19 (A9, root cause): assets are served with `Vary: Origin`
    // and cache.add() stores no-Origin requests, so a plain match returns
    // null for CORS asset requests even when the bundle is cached.
    expect(sw).toContain('ignoreVary: true');
  });

  it('main.tsx registers /sw.js in production only', () => {
    const main = read('../src/main.tsx');
    expect(main).toContain("navigator.serviceWorker.register('/sw.js')");
    expect(main).toContain('import.meta.env.PROD');
    // Step 19 (A9): the app posts its loaded assets to the worker so a
    // first-visit offline reload renders.
    expect(main).toContain('cache-assets');
  });

  it('manifest declares a stable id for installability', () => {
    const manifest = JSON.parse(read('../public/manifest.webmanifest')) as Record<string, unknown>;
    expect(manifest.id).toBe('/');
    expect(manifest.start_url).toBe('/');
  });

  it('manifest declares 192 and 512 PNG icons (Step 19, A15)', () => {
    const manifest = JSON.parse(read('../public/manifest.webmanifest')) as {
      icons: { sizes: string; src: string; type: string }[];
    };
    const sizes = manifest.icons.map((i) => `${i.sizes}:${i.type}`);
    expect(sizes).toContain('192x192:image/png');
    expect(sizes).toContain('512x512:image/png');
    expect(manifest.icons.find((i) => i.sizes === '192x192')?.src).toBe('/icon-192.png');
    expect(manifest.icons.find((i) => i.sizes === '512x512')?.src).toBe('/icon-512.png');
  });
});
