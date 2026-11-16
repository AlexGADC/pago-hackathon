"use client";

// Confirmarea comună după trimiterea unei contestații (Flux A și Flux B).

import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { Card, Tag } from "@/components/shared/Card";
import { POINTS } from "@/data/mockFamilyData";
import { fmtRon } from "@/lib/disputes";
import type { DisputeTicket } from "@/types/pago";

export function DisputeSentCard({ ticket, provider }: { ticket: DisputeTicket; provider: string }) {
  return (
    <Card className="text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-success-bg text-success">
        <PartyPopper size={28} />
      </div>
      <h2 className="mt-3 text-xl font-bold text-ink">Sesizare trimisă, zero telefoane!</h2>
      <p className="mt-1 text-sm text-muted">
        Ai plătit {fmtRon(ticket.paidAmount)}. {fmtRon(ticket.disputedAmount)} rămân înghețați până răspunde {provider} (max. {ticket.legalDeadlineDays} zile).
      </p>
      <div className="mt-4 inline-flex">
        <Tag tone="orange">+{POINTS.bounty} puncte Bounty în Family Pool 🎉</Tag>
      </div>
      <p className="mt-4 rounded-2xl bg-app p-3 text-left text-xs leading-relaxed text-muted">{ticket.message}</p>
      <Link href="/" className="btn-dark mt-4 w-full">
        Înapoi la Acasă
      </Link>
    </Card>
  );
}
