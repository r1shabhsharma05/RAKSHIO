import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { addEvidence, countOtherEvidence, db, listEvidence, verifyChain } from './vault';

// Step 20 (B2+B3): per-incident chains + atomic adds.
async function add(incidentId: string, label: string) {
  return addEvidence({
    incidentId, kind: 'note', label, text: label,
    capturedAt: new Date().toISOString(), byCaregiver: false,
  });
}

describe('step 20 B2: chains stay valid across interleaved incidents', () => {
  it('interleaved A+B adds keep both chains green', async () => {
    await db.evidence.clear();
    for (let i = 1; i <= 4; i++) {
      await add('inc-a', `A${i}`);
      await add('inc-b', `B${i}`);
    }
    expect((await listEvidence('inc-a')).length).toBe(4);
    expect((await listEvidence('inc-b')).length).toBe(4);
    expect((await verifyChain('inc-a')).ok).toBe(true);
    expect((await verifyChain('inc-b')).ok).toBe(true);
    // Each incident's first row starts its own chain.
    const bRows = await listEvidence('inc-b');
    expect(bRows[0].prevHash).toBe('');
    expect(bRows[1].prevHash).toBe(bRows[0].hash);
  });

  it('a later add to A still chains to A, not to B', async () => {
    await db.evidence.clear();
    const a1 = await add('inc-a', 'A1');
    await add('inc-b', 'B1');
    const a2 = await add('inc-a', 'A2');
    expect(a2.prevHash).toBe(a1.hash);
    expect((await verifyChain('inc-a')).ok).toBe(true);
    expect((await verifyChain('inc-b')).ok).toBe(true);
  });
});

describe('step 20 B3: concurrent adds do not fork the chain', () => {
  it('10 concurrent adds store 10 rows with a valid chain', async () => {
    await db.evidence.clear();
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => add('inc-c', `C${i + 1}`)),
    );
    expect(results.length).toBe(10);
    expect((await listEvidence('inc-c')).length).toBe(10);
    const v = await verifyChain('inc-c');
    expect(v.ok).toBe(true);
    expect(v.count).toBe(10);
  });
});

describe('step 20 B4: other-incident evidence is countable', () => {
  it('countOtherEvidence names the other incident', async () => {
    await db.evidence.clear();
    await add('inc-a', 'A1');
    await add('inc-a', 'A2');
    await add('inc-b', 'B1');
    const other = await countOtherEvidence('inc-b');
    expect(other.count).toBe(2);
    expect(other.incidentId).toBe('inc-a');
    expect((await countOtherEvidence('inc-a')).count).toBe(1);
  });
});
