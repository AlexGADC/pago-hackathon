import { CheckCircle2, Hourglass } from "lucide-react";
import { Step } from "@/components/payments/PaymentStatus";
import { Card, Tag } from "@/components/shared/Card";
import { fmtRon, hasWorkingDayDeadline, legalDeadlineLabel } from "@/lib/disputes";
import { addDays, fmtDate, fmtDateTime } from "@/lib/format";
import type { Bill, DisputeTicket } from "@/types/pago";
import { DisputeDownload } from "./DisputeDownload";

export function TicketTracker({ ticket, bill, download = true }: { ticket: DisputeTicket; bill: Bill; download?: boolean }) {
  const provider = bill.provider;
  const analysing = ticket.stage === "in_analiza" || ticket.stage === "stornata";
  const closed = ticket.stage === "stornata";
  const term = legalDeadlineLabel(bill);
  const deadline = hasWorkingDayDeadline(bill)
    ? `Termen legal de răspuns: ${term} de la trimitere.`
    : `Termen legal de răspuns: ${fmtDate(addDays(ticket.createdAt.slice(0, 10), ticket.legalDeadlineDays))} (${term}).`;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="font-bold text-ink">Starea contestației</p>
        {closed ? (
          <Tag tone="green">
            <CheckCircle2 size={11} /> {fmtRon(ticket.disputedAmount)} economisiți
          </Tag>
        ) : (
          <Tag tone="indigo">
            <Hourglass size={11} /> Suspendare cerută: {fmtRon(ticket.disputedAmount)}
          </Tag>
        )}
      </div>
      <ol className="mt-4">
        <Step state="done" title="Sesizare trimisă" detail={`${fmtDateTime(ticket.createdAt)} · ${ticket.confidence}`} />
        <Step state={analysing ? "done" : "active"} title={`În analiză la ${provider}`} detail={analysing ? deadline : "Furnizorul preia sesizarea…"} />
        <Step
          state={closed ? "done" : analysing ? "active" : "todo"}
          title="Factură stornată"
          detail={
            closed
              ? `${provider} a emis factura storno${ticket.resolvedAt ? ` pe ${fmtDateTime(ticket.resolvedAt)}` : ""}. Diferența de ${fmtRon(ticket.disputedAmount)} a fost anulată.`
              : analysing
                ? "Te anunțăm imediat ce furnizorul emite factura storno."
                : undefined
          }
          last
        />
      </ol>
      <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">{ticket.message}</p>
      {download && (
        <div className="mt-3 flex justify-end">
          <DisputeDownload ticket={ticket} bill={bill} />
        </div>
      )}
    </Card>
  );
}
