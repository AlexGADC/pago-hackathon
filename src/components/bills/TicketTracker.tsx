import { Snowflake } from "lucide-react";
import { Step } from "@/components/payments/PaymentStatus";
import { Card, Tag } from "@/components/shared/Card";
import { fmtRon } from "@/lib/disputes";
import { addDays, daysLabel, fmtDate, fmtDateTime } from "@/lib/format";
import type { DisputeTicket } from "@/types/pago";

export function TicketTracker({ ticket, provider }: { ticket: DisputeTicket; provider: string }) {
  const analysing = ticket.stage === "in_analiza" || ticket.stage === "stornata";
  const closed = ticket.stage === "stornata";
  const deadline = addDays(ticket.createdAt.slice(0, 10), ticket.legalDeadlineDays);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-ink">Starea contestației</p>
        <Tag tone="indigo">
          <Snowflake size={11} /> {fmtRon(ticket.disputedAmount)} înghețați
        </Tag>
      </div>
      <ol className="mt-4">
        <Step state="done" title="Sesizare trimisă" detail={`${fmtDateTime(ticket.createdAt)} · ${ticket.confidence}`} />
        <Step
          state={analysing ? "done" : "active"}
          title={`În analiză la ${provider}`}
          detail={analysing ? `Termen legal de răspuns: ${fmtDate(deadline)} (${daysLabel(ticket.legalDeadlineDays)}).` : "Furnizorul preia sesizarea…"}
        />
        <Step
          state={closed ? "done" : analysing ? "active" : "todo"}
          title="Factură stornată"
          detail={closed ? "Diferența a fost anulată." : analysing ? "Te anunțăm imediat ce furnizorul emite factura storno." : undefined}
          last
        />
      </ol>
      <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">{ticket.message}</p>
    </Card>
  );
}
