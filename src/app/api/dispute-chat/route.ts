import { bills } from "@/data/mockFamilyData";
import { generate, hasGeminiKey } from "@/lib/gemini";
import { fmtRon } from "@/lib/disputes";
import type { Bill, DisputeChatRequest, DisputeChatResponse } from "@/types/pago";

const DEFAULT_QUESTION = "Explică-mi pe scurt dacă factura este normală sau are ceva suspect.";

const SYSTEM_PROMPT = `Ești Pago AI, asistentul din aplicația Pago pentru familii din România.
Răspunzi în română, cald și clar, fără jargon bancar sau birocratic, în maximum 80 de cuvinte.
Folosești doar cifrele din datele primite, nu inventezi sume, termene sau promisiuni de rambursare.`;

function fallbackAnswer(bill: Bill): string {
  return bill.anomaly?.reason ?? `Factura de la ${bill.provider} este în media ta obișnuită. Nu am găsit nimic suspect.`;
}

function buildPrompt(bill: Bill, question: string): string {
  const history = bill.history.map((h) => `${h.month}: ${fmtRon(h.amount)}`).join(", ");
  const meter = bill.meter
    ? `Contor (${bill.meter.unit}): index facturat ${bill.meter.billedIndex}, ultimul index confirmat ${bill.meter.lastConfirmedIndex}, preț ${bill.meter.pricePerUnit} RON/${bill.meter.unit}.`
    : "Factura nu are contor (plată pe bază de abonament).";
  const anomaly = bill.anomaly
    ? `Anomalie detectată: ${bill.anomaly.reason} Suma corectă estimată: ${fmtRon(bill.anomaly.expectedAmount)}.`
    : "Nu s-a detectat nicio anomalie.";

  return [
    `Furnizor: ${bill.provider} (${bill.kind}). Factura ${bill.invoiceNumber}, emisă ${bill.issueDate}, scadentă ${bill.dueDate}.`,
    `Suma facturată: ${fmtRon(bill.amount)}. Media pe 12 luni: ${fmtRon(bill.averageAmount)}.`,
    `Istoric pe 12 luni: ${history}.`,
    meter,
    anomaly,
    "",
    `Întrebarea clientului: ${question}`,
  ].join("\n");
}

function respond(answer: string, source: DisputeChatResponse["source"]): Response {
  const body: DisputeChatResponse = { answer, source };
  return Response.json(body);
}

export async function POST(request: Request) {
  const req = (await request.json()) as DisputeChatRequest;
  const bill = bills.find((b) => b.id === req.billId);
  if (!bill) return Response.json({ error: "Factură necunoscută." }, { status: 400 });

  if (!hasGeminiKey()) return respond(fallbackAnswer(bill), "fallback");

  try {
    const text = await generate([{ text: buildPrompt(bill, req.question?.trim() || DEFAULT_QUESTION) }], {
      system: SYSTEM_PROMPT,
      maxOutputTokens: 1024,
    });
    return respond(text, "claude");
  } catch {
    return respond(fallbackAnswer(bill), "fallback");
  }
}
