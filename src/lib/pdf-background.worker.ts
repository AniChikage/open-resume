import { buildBackgroundPdf } from './pdf-background-build.ts';
import type { BackgroundPages } from './pdf-background-build.ts';
self.addEventListener('message', async (event: MessageEvent<BackgroundPages>) => {
  try {
    const bytes = await buildBackgroundPdf(event.data);
    self.postMessage({ bytes }, { transfer: [bytes.buffer] });
  } catch {
    self.postMessage({ error: 'BACKGROUND_BUILD_FAILED' });
  }
});
