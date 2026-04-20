import { Injectable, Logger } from '@nestjs/common';

/**
 * Extract plain text from a PDF buffer.
 *
 * Uses pdfjs-dist's legacy node build so we stay in-process without a
 * Python sidecar. The output is line-joined text, which is exactly what
 * the deterministic ab.parser regexes already expect. If extraction
 * fails we fall back to an empty string - the caller decides whether
 * to retry with a heavier extractor or flag the document for review.
 */
@Injectable()
export class PdfExtractorService {
  private readonly log = new Logger('PdfExtractorService');

  async extractText(buffer: Buffer): Promise<{ text: string; pages: number }> {
    try {
      // pdfjs-dist ships legacy CJS for Node. Dynamic import keeps it
      // optional: if the package isn't installed in a given environment
      // we degrade gracefully.
      const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
      // Run in-process without a web worker. The legacy build handles the
      // DOM-shim and pdfjs only complains when workerSrc is set to a
      // non-string, so we leave the default and rely on disableWorker.
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        disableWorker: true,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      const pdf = await loadingTask.promise;
      const pages: string[] = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const lines = groupTextItemsIntoLines(content.items);
        pages.push(lines.join('\n'));
      }
      return { text: pages.join('\n\n'), pages: pdf.numPages };
    } catch (err) {
      this.log.warn({ err: String(err) }, 'pdf extract failed');
      return { text: '', pages: 0 };
    }
  }
}

interface TextItem {
  str: string;
  transform: number[];
}

/** Rough line grouping: cluster items whose y-coordinate matches within a few pt. */
function groupTextItemsIntoLines(items: any[]): string[] {
  const rows: Array<{ y: number; parts: string[] }> = [];
  for (const item of items as TextItem[]) {
    if (!item?.str) continue;
    const y = item.transform?.[5] ?? 0;
    let row = rows.find((r) => Math.abs(r.y - y) < 2);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push(item.str);
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => r.parts.join(' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
}
