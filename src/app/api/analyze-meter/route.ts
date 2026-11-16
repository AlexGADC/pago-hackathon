// POST /api/analyze-meter — Claude Vision citește indexul de pe poza contorului.
// Fallback instant (indexul simulat) dacă: lipsește cheia, nu există poză, Claude depășește 5 s sau dă eroare.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { generate, hasGeminiKey } from "@/lib/gemini";
import { bills, FALLBACK_METER_INDEX } from "@/data/mockFamilyData";
import type { AnalyzeMeterRequest, AnalyzeMeterResponse } from "@/types/pago";

const SAMPLE_PHOTO = path.join(process.cwd(), "public", "samples", "contor-exemplu.jpg");

const MeterSchema = z.object({
  index: z.number().nullable(),
  confidence: z.number().min(0).max(1),
});

function fallback(billId: string, note: string): Response {
  const body: AnalyzeMeterResponse = { index: FALLBACK_METER_INDEX[billId] ?? null, confidence: 0.9, source: "fallback", note };
  return Response.json(body);
}

export async function POST(request: Request) {
  const req = (await request.json()) as AnalyzeMeterRequest;
  const bill = bills.find((b) => b.id === req.billId);
  if (!bill?.meter) return Response.json({ error: "Factură necunoscută sau fără contor." }, { status: 400 });

  if (!hasGeminiKey()) return fallback(bill.id, "GEMINI_API_KEY lipsește");

  let data = req.imageBase64;
  let mediaType = req.mediaType ?? "image/jpeg";
  if (!data && req.useSample) {
    try {
      data = (await readFile(SAMPLE_PHOTO)).toString("base64");
      mediaType = "image/jpeg";
    } catch {
      return fallback(bill.id, "public/samples/contor-exemplu.jpg nu există încă");
    }
  }
  if (!data) return fallback(bill.id, "nicio poză trimisă");

  try {
    const text = await generate(
      [
        { inline_data: { mime_type: mediaType, data } },
        {
          text: `Aceasta este o poză cu un contor de ${bill.kind} (unitate: ${bill.meter.unit}). Citește indexul afișat pe cadran, cu zecimalele dacă există (de exemplu 15.79). Răspunde doar cu JSON de forma {"index": număr sau null dacă nu se poate citi, "confidence": număr între 0 și 1}.`,
        },
      ],
      { json: true, maxOutputTokens: 1024 },
    );

    const parsed = MeterSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return fallback(bill.id, "răspuns invalid de la model");

    const body: AnalyzeMeterResponse = { ...parsed.data, source: "claude" };
    return Response.json(body);
  } catch (err) {
    // Timeout (5 s), rețea, rate limit — demo-ul merge mai departe pe fallback.
    return fallback(bill.id, err instanceof Error ? err.message : "eroare necunoscută");
  }
}
