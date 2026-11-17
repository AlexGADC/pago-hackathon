"use client";

import { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useSession } from "@/context/session";
import { FAMILY_NAME } from "@/data/mockFamilyData";
import { disputeDocument, receiptDocument, type DocumentContext } from "@/lib/documents";
import { downloadBytes } from "@/lib/download";
import { demoNow } from "@/lib/format";
import type { Bill, DisputeTicket, PaymentRecord } from "@/types/pago";

type PdfModule = typeof import("@/lib/pdf");

interface Prepared {
  fileName: string;
  render: (pdf: PdfModule) => Promise<Uint8Array>;
}

export function useDocumentDownload() {
  const { houses, bills, subscriptions, expiries, tickets, toast } = useFamily();
  const { user } = useSession();
  const [busy, setBusy] = useState(false);

  function context(): DocumentContext {
    return { payerName: user?.name ?? FAMILY_NAME, houses, bills, subscriptions, expiries, tickets, generatedAt: demoNow() };
  }

  async function save(prepared: Prepared, done: string): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      const pdf = await import("@/lib/pdf");
      downloadBytes(prepared.fileName, await prepared.render(pdf), "application/pdf");
      toast(done);
    } catch {
      toast("Nu am putut genera documentul. Încearcă din nou.", "alert");
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    receipt(record: PaymentRecord): Promise<void> {
      const data = receiptDocument(record, context());
      return save({ fileName: data.fileName, render: (pdf) => pdf.receiptPdf(data) }, "Chitanța a fost descărcată");
    },
    dispute(ticket: DisputeTicket, bill: Bill): Promise<void> {
      const data = disputeDocument(ticket, bill, context());
      return save({ fileName: data.fileName, render: (pdf) => pdf.disputePdf(data) }, "Sesizarea a fost descărcată");
    },
  };
}
