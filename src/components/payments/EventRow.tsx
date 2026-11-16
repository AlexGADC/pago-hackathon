"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { EventBadge } from "@/components/shared/Badges";
import { Tag } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { fmtRon } from "@/lib/disputes";
import { fmtDay } from "@/lib/format";
import { CATEGORY_META, eventState, isOverdue, toCheckoutItem, type PaymentEvent } from "@/lib/payments";
import { PaymentStatusTag } from "./PaymentStatus";

export function eventSubtitle(event: PaymentEvent, today: string, showDate: boolean): string {
  const state = eventState(event);
  const parts: string[] = [CATEGORY_META[event.category].label];
  if (showDate) parts.push(fmtDay(event.date));
  if (state === "blocked") parts.push(`peste limita de ${fmtRon(event.autopayLimit ?? 0)}`);
  else if (state === "auto") parts.push("se plătește automat");
  else if (state === "estimated") parts.push("factura nu a fost emisă încă");
  else if (isOverdue(event, today)) parts.push("întârziată");
  if (event.frozen > 0) parts.push(`${fmtRon(event.frozen)} înghețați`);
  return parts.join(" · ");
}

export function EventAction({ event, onNavigate }: { event: PaymentEvent; onNavigate?: () => void }) {
  const { openCheckout } = useFamily();
  const state = eventState(event);

  if (state === "paid") return <span className="text-xs font-bold text-success">Plătit</span>;
  if (state === "pending" && event.record) return <PaymentStatusTag status={event.record.status} />;
  if (state === "estimated") return <Tag tone="gray">Estimare</Tag>;
  if (state === "auto") {
    return (
      <Tag tone="green">
        <Zap size={11} /> Automat
      </Tag>
    );
  }
  if (state === "flagged") {
    return (
      <Link href={event.href} onClick={onNavigate} className="pill pill-alert">
        Verifică
      </Link>
    );
  }
  if (state === "renew") {
    return (
      <Link href={event.href} onClick={onNavigate} className="pill pill-primary">
        Reînnoiește
      </Link>
    );
  }
  return (
    <button onClick={() => openCheckout([toCheckoutItem(event)])} className="pill pill-primary">
      {state === "failed" ? "Reîncearcă" : "Plătește"}
    </button>
  );
}

export function EventRow({ event, showDate = true, onNavigate }: { event: PaymentEvent; showDate?: boolean; onNavigate?: () => void }) {
  const { today } = useFamily();
  const late = isOverdue(event, today);
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <Link href={event.href} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3">
        <EventBadge event={event} />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{event.title}</span>
          <span className={`block truncate text-xs ${late ? "font-semibold text-alert" : "text-muted"}`}>{eventSubtitle(event, today, showDate)}</span>
        </span>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="font-bold text-ink">
          {event.estimated ? "≈ " : ""}
          {fmtRon(event.amount)}
        </span>
        <EventAction event={event} onNavigate={onNavigate} />
      </div>
    </li>
  );
}
