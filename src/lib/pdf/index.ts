import type { DisputeDocument, ReceiptDocument } from "@/lib/documents";
import type { FontBytes } from "./canvas";
import { renderDispute } from "./dispute";
import { renderReceipt } from "./receipt";

const FONT_URLS = { regular: "/fonts/Inter-Regular.ttf", bold: "/fonts/Inter-SemiBold.ttf" } as const;

let cached: Promise<FontBytes> | null = null;

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fontul ${url} nu a putut fi încărcat.`);
  return response.arrayBuffer();
}

function loadFonts(): Promise<FontBytes> {
  if (!cached) {
    cached = Promise.all([fetchFont(FONT_URLS.regular), fetchFont(FONT_URLS.bold)])
      .then(([regular, bold]) => ({ regular, bold }))
      .catch((error: unknown) => {
        cached = null;
        throw error;
      });
  }
  return cached;
}

export async function receiptPdf(data: ReceiptDocument): Promise<Uint8Array> {
  return renderReceipt(data, await loadFonts());
}

export async function disputePdf(data: DisputeDocument): Promise<Uint8Array> {
  return renderDispute(data, await loadFonts());
}
