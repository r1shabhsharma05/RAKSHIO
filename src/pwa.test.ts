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
  });

  it('main.tsx registers /sw.js in production only', () => {
    const main = read('../src/main.tsx');
    expect(main).toContain("navigator.serviceWorker.register('/sw.js')");
    expect(main).toContain('import.meta.env.PROD');
  });

  it('manifest declares a stable id for installability', () => {
    const manifest = JSON.parse(read('../public/manifest.webmanifest')) as Record<string, unknown>;
    expect(manifest.id).toBe('/');
    expect(manifest.start_url).toBe('/');
  });
});
