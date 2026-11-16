"use client";


import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SectionTitle, Tag } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { fmtRon, percentOverAverage } from "@/lib/disputes";
import { BILL_STATUS } from "./billStatus";

export function BillsScreen() {
  const { house, houseBills } = useFamily();

  return (
    <div>
      <SectionTitle>Facturi · {house.name}</SectionTitle>
      <div className="flex flex-col gap-3">
        {houseBills.map((b) => {
          const status = BILL_STATUS[b.status];
          const flagged = b.status === "red_flag";
          return (
            <Link
              key={b.id}
              href={`/facturi/${b.id}`}
              className={`block rounded-card bg-white p-5 shadow-card transition active:scale-[0.99] ${flagged ? "ring-1 ring-alert/40" : ""}`}
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
