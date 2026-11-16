// POST /api/analyze-meter — Claude Vision citește indexul de pe poza contorului.
// Fallback instant (indexul simulat) dacă: lipsește cheia, nu există poză, Claude depășește 5 s sau dă eroare.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { CLAUDE_MODEL, getClient, hasApiKey } from "@/lib/anthropic";
import { bills, FALLBACK_METER_INDEX } from "@/data/mockFamilyData";
import type { AnalyzeMeterRequest, AnalyzeMeterResponse } from "@/types/pago";

const SAMPLE_PHOTO = path.join(process.cwd(), "public", "samples", "contor-exemplu.jpg");

const MeterSchema = z.object({
  index: z.number().int().nullable().describe("Indexul afișat pe contor, fără zecimale; null dacă nu se poate citi"),
  confidence: z.number().describe("Cât de sigur ești, între 0 și 1"),
});

function fallback(billId: string, note: string): Response {
  const body: AnalyzeMeterResponse = { index: FALLBACK_METER_INDEX[billId] ?? null, confidence: 0.9, source: "fallback", note };
  return Response.json(body);
}

export async function POST(request: Request) {
  const req = (await request.json()) as AnalyzeMeterRequest;
  const bill = bills.find((b) => b.id === req.billId);
  if (!bill?.meter) return Response.json({ error: "Factură necunoscută sau fără contor." }, { status: 400 });

  if (!hasApiKey()) return fallback(bill.id, "ANTHROPIC_API_KEY lipsește");

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
    const response = await getClient().beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: zodOutputFormat(MeterSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            {
              type: "text",
              text: `Aceasta este o poză cu un contor de ${bill.kind} (unitate: ${bill.meter.unit}). Citește indexul afișat pe cadran, doar partea întreagă.`,
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) return fallback(bill.id, `fără rezultat (${response.stop_reason})`);

    const body: AnalyzeMeterResponse = { ...response.parsed_output, source: "claude" };
    return Response.json(body);
  } catch (err) {
    // Timeout (5 s), rețea, rate limit — demo-ul merge mai departe pe fallback.
    return fallback(bill.id, err instanceof Error ? err.message : "eroare necunoscută");
  }
}
