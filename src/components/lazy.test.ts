import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';

// The three heavy screens load through useChunk (dynamic import + one
// hard-reload recovery) in ToolPages — this guards the dynamic imports
// themselves (a renamed export breaks the loader at runtime, not at
// build time).
describe('lazy screens load', () => {
  it('Vault, Proof and Care resolve to components', async () => {
    const vault = await import('../screens/Vault');
    const proof = await import('../screens/Proof');
    const care = await import('../screens/Care');
    expect(typeof vault.VaultScreen).toBe('function');
    expect(typeof proof.ProofScreen).toBe('function');
    expect(typeof care.CareScreen).toBe('function');
  });
});
