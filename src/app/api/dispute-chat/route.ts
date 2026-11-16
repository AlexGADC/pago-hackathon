// POST /api/dispute-chat — „Întreabă Pago AI” pe o factură.
// TODO (backend): apel real la Claude cu datele facturii + istoricul pe 12 luni, cu același tipar de fallback ca analyze-meter.
// Până atunci răspunde instant cu explicația anomaliei din datele simulate, ca Frontend-ul să poată lucra.

import { bills } from "@/data/mockFamilyData";
import type { DisputeChatRequest, DisputeChatResponse } from "@/types/pago";

export async function POST(request: Request) {
  const req = (await request.json()) as DisputeChatRequest;
  const bill = bills.find((b) => b.id === req.billId);
  if (!bill) return Response.json({ error: "Factură necunoscută." }, { status: 400 });

  const body: DisputeChatResponse = {
    answer: bill.anomaly?.reason ?? `Factura de la ${bill.provider} este în media ta obișnuită. Nu am găsit nimic suspect.`,
    source: "fallback",
  };
  return Response.json(body);
}
