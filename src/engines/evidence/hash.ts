// SHA-256 over canonical JSON — the Evidence Vault's tamper-evident chain
// is built on these two functions only, so the chain is verifiable anywhere.
export async function sha256Hex(data: string): Promise<string> {
  const buf = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest('SHA-256', buf as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Stable JSON: sorted keys, recursive — the same record always hashes the same.
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
}
