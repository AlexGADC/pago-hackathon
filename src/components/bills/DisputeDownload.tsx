"use client";

import { FileDown } from "lucide-react";
import { useDocumentDownload } from "@/components/shared/useDocumentDownload";
import type { Bill, DisputeTicket } from "@/types/pago";

export function DisputeDownload({ ticket, bill }: { ticket: DisputeTicket; bill: Bill }) {
  const documents = useDocumentDownload();

  return (
    <button type="button" onClick={() => void documents.dispute(ticket, bill)} disabled={documents.busy} className="pill pill-soft disabled:opacity-60">
      <FileDown size={14} /> {documents.busy ? "Se generează…" : "Descarcă sesizarea (PDF)"}
    </button>
  );
}
