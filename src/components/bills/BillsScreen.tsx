"use client";

import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";
import { SectionTitle, Tag } from "@/components/shared/Card";
import { ConnectionBadge, PaymentStatusTag } from "@/components/payments/PaymentStatus";
import { useFamily } from "@/context/FamilyContext";
import { fmtRon, percentOverAverage } from "@/lib/disputes";
import { BILL_STATUS } from "./billStatus";

export function BillsScreen() {
  const { house, houseBills, connections, payments, reconnect } = useFamily();
  const broken = connections.filter((c) => c.status === "deconectat" && houseBills.some((b) => b.provider === c.provider));

  return (
    <div>
      <SectionTitle>Facturi · {house.name}</SectionTitle>

      {broken.length > 0 && (
        <div className="mb-3 flex flex-col gap-2 rounded-card bg-alert-bg p-4">
          {broken.map((c) => (
            <div key={c.provider} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-alert">{c.provider} e deconectat</p>
                <p className="text-xs text-muted">Istoricul e păstrat. Reconectează ca să vezi facturile noi.</p>
              </div>
              <button onClick={() => reconnect(c.provider)} className="btn-dark shrink-0 px-3 py-2 text-xs">
                <RefreshCw size={14} /> Reconectează
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {houseBills.map((b) => {
          const status = BILL_STATUS[b.status];
          const flagged = b.status === "red_flag";
          const connection = connections.find((c) => c.provider === b.provider);
          const record = payments.find((p) => p.eventId === `${b.id}-${b.dueDate.slice(0, 7)}`);
          return (
            <Link
              key={b.id}
              href={`/facturi/${b.id}`}
              className={`block rounded-card bg-surface p-5 shadow-card transition active:scale-[0.99] ${flagged ? "ring-1 ring-alert/40" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <Tag tone={status.tone}>{status.label}</Tag>
                <ChevronRight size={18} className="text-muted" />
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-ink">{b.provider}</p>
                  <p className="text-xs text-muted">Scadentă {new Date(b.dueDate).toLocaleDateString("ro-RO")}</p>
                </div>
                <p className={`shrink-0 text-lg font-extrabold ${flagged ? "text-alert" : "text-ink"}`}>{fmtRon(b.amount)}</p>
              </div>
              {(connection || record) && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {connection && <ConnectionBadge status={connection.status} />}
                  {record && <PaymentStatusTag status={record.status} />}
                </div>
              )}
              {flagged && (
                <p className="mt-2 text-xs font-semibold text-alert">
                  +{percentOverAverage(b)}% față de media ta ({fmtRon(b.averageAmount)}) · <b className="font-extrabold">Apasă ca să contești</b>
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
