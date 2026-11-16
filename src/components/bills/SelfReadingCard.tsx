"use client";

import { useState } from "react";
import { CheckCircle2, Gauge } from "lucide-react";
import { Card, Tag } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { fmtNum } from "@/lib/disputes";
import { MONTHS, dateParts, fmtDateTime } from "@/lib/format";
import { selfReadingOpen } from "@/lib/notifications";
import type { Bill } from "@/types/pago";

export function SelfReadingCard({ bill }: { bill: Bill }) {
  const { readings, missions, today, submitReading, toast } = useFamily();
  const [text, setText] = useState("");

  if (!bill.meter || !bill.selfReading) return null;

  const meter = bill.meter;
  const slot = bill.selfReading;
  const open = selfReadingOpen(bill, today);
  const latest = readings.filter((r) => r.billId === bill.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  const sentThisMonth = Boolean(latest) && latest.submittedAt.slice(0, 7) === today.slice(0, 7);
  const minimum = bill.status === "red_flag" ? meter.lastConfirmedIndex : meter.billedIndex;
  const index = Number(text.replace(",", "."));
  const hasValue = text.trim() !== "";
  const valid = hasValue && Number.isFinite(index) && index >= minimum;
  const [, month, day] = dateParts(today);
  const nextMonth = day > slot.toDay ? (month % 12) + 1 : month;
  const bonus = missions.find((m) => m.kind === "autocitire" && !m.completed);

  function send() {
    if (!valid) return;
    submitReading(bill.id, index);
    toast(bonus ? `Index transmis · +${bonus.points} puncte` : "Index transmis");
    setText("");
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-bold text-ink">
          <Gauge size={18} className="text-pago-blue" /> Autocitire contor
        </p>
        <Tag tone={sentThisMonth ? "green" : open ? "orange" : "gray"}>{sentThisMonth ? "Transmis" : open ? "Fereastră deschisă" : "Închisă"}</Tag>
      </div>

      {sentThisMonth ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-ink">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
          <span>
            Ai transmis indexul{" "}
            <b>
              {fmtNum(latest.index)} {meter.unit}
            </b>{" "}
            pe {fmtDateTime(latest.submittedAt)}. Următoarea factură va fi pe consumul real, nu pe o estimare.
          </span>
        </p>
      ) : open ? (
        <>
          <p className="mt-2 text-sm text-muted">
            Poți transmite indexul până pe {slot.toDay} {MONTHS[month - 1].toLowerCase()}. Așa plătești consumul real și eviți facturile de regularizare.
          </p>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-ink">Indexul de pe contor</span>
            <div className="mt-2 flex items-center rounded-2xl border border-line bg-surface px-4 focus-within:border-pago-blue">
              <input
                inputMode="decimal"
                value={text}
                onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder={`minimum ${fmtNum(minimum)}`}
                className="h-12 min-w-0 flex-1 bg-transparent text-xl font-bold text-ink outline-none"
              />
              <span className="font-semibold text-muted">{meter.unit}</span>
            </div>
            {hasValue && !valid && (
              <span className="mt-2 block text-sm font-semibold text-alert">
                Indexul trebuie să fie cel puțin {fmtNum(minimum)} {meter.unit}, cât arăta contorul la ultima factură.
              </span>
            )}
          </label>
          <button onClick={send} disabled={!valid} className="btn-dark mt-4 w-full text-sm disabled:opacity-50">
            Transmite indexul
          </button>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">
          {bill.provider} primește indexul între {slot.fromDay} și {slot.toDay} ale lunii. Următoarea fereastră se deschide pe {slot.fromDay} {MONTHS[nextMonth - 1].toLowerCase()} și te anunțăm atunci.
        </p>
      )}
    </Card>
  );
}
