import { describe, expect, it } from 'vitest';
import { PdfExtractorService } from './pdf-extractor.service.js';

/**
 * Hermetic tests: we can't easily generate a valid PDF with pure JS in
 * the test harness, so we assert the service's degrade-gracefully
 * behaviour on bad inputs. Layout-quality is covered by the AbUpload
 * end-to-end test against a real PDF in CI.
 */
describe('PdfExtractorService', () => {
  it('returns empty text for non-pdf buffers instead of throwing', async () => {
    const svc = new PdfExtractorService();
    const result = await svc.extractText(Buffer.from('not a pdf'));
    expect(result.text).toBe('');
    expect(result.pages).toBe(0);
  });

  it('returns empty text for an empty buffer', async () => {
    const svc = new PdfExtractorService();
    const result = await svc.extractText(Buffer.from([]));
    expect(result.text).toBe('');
    expect(result.pages).toBe(0);
  });
});
