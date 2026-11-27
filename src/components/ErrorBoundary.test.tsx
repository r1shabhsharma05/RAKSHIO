import { describe, expect, it } from 'vitest';
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'node:stream';
import type { ReactElement } from 'react';
import { ErrorFallback } from './ErrorBoundary';

function renderAsync(el: ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = '';
    const { pipe } = renderToPipeableStream(el, {
      onShellReady() {
        pipe(
          new Writable({
            write(chunk, _encoding, cb) {
              html += chunk.toString();
              cb();
            },
            final(cb) {
              resolve(html);
              cb();
            },
          }),
        );
      },
      onShellError(err) {
        reject(err);
      },
      onError() {
        /* boundary caught it — expected */
      },
    });
  });
}

// The fallback itself is unit-tested here. The boundary's catch path is
// tested in the real browser (tests/production.spec.ts injects a render
// fault): neither legacy renderToString nor the streaming renderer honours
// an error boundary for a sync throw during the shell render, so SSR
// cannot prove the catch works.
describe('ErrorFallback', () => {
  it('renders the calm fallback with a 1930 call link and a way back', async () => {
    const html = await renderAsync(<ErrorFallback onReset={() => undefined} />);
    expect(html).toContain('Kuch gadbad ho gayi');
    expect(html).toContain('tel:1930');
    expect(html).toContain('report file nahi karta');
    expect(html).toContain('Pehle screen par wapas');
  });
});
