"use client";

import Link from "next/link";
import { BadgeCheck, PartyPopper } from "lucide-react";
import { Card, Tag } from "@/components/shared/Card";
import { POINTS } from "@/data/mockFamilyData";
import { fmtRon, legalDeadlineLabel } from "@/lib/disputes";
import type { Bill, DisputeTicket } from "@/types/pago";

export function DisputeSentCard({ ticket, bill }: { ticket: DisputeTicket; bill: Bill }) {
  const closed = ticket.stage === "stornata";
  const Icon = closed ? BadgeCheck : PartyPopper;

  return (
    <Card className="text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-success-bg text-success">
        <Icon size={28} />
      </div>
      <h2 className="mt-3 text-xl font-bold text-ink">{closed ? "Factura a fost stornată!" : "Sesizare trimisă, zero telefoane!"}</h2>
      <p className="mt-1 text-sm text-muted">
        {closed
          ? `${bill.provider} a emis factura storno. Ai economisit ${fmtRon(ticket.disputedAmount)}, iar factura corectă este de ${fmtRon(ticket.paidAmount)}.`
          : `Plătești acum ${fmtRon(ticket.paidAmount)} · Ceri suspendarea pentru ${fmtRon(ticket.disputedAmount)}. ${bill.provider} are la dispoziție ${legalDeadlineLabel(bill)} ca să răspundă.`}
      </p>
      <div className="mt-4 inline-flex">
        <Tag tone="orange">+{POINTS.bounty} puncte Pago 🎉</Tag>
      </div>
      <Link href="/" className="btn-dark mt-4 w-full">
        Înapoi la Acasă
      </Link>
    </Card>
  );
}
