"use client";

import Link from "next/link";
import { ChevronRight, Plus, ShieldCheck, Zap } from "lucide-react";
import { SubjectIcon } from "@/components/shared/Badges";
import { Card, Tag } from "@/components/shared/Card";
import { EmptyState } from "@/components/shared/Controls";
import { ScreenTitle } from "@/components/shared/PageHeader";
import { useFamily } from "@/context/FamilyContext";
import { EXPIRY_LABEL } from "@/data/catalog";
import { activeRule } from "@/lib/autopay";
import { fmtRon } from "@/lib/disputes";
import { expiryStatus } from "@/lib/expiry";
import { fmtDate, plural } from "@/lib/format";
import type { ExpiryItem } from "@/types/pago";

export function InsuranceScreen() {
  const { house, houseExpiries, autopay, today } = useFamily();
  const yearly = houseExpiries.reduce((sum, e) => sum + e.price, 0);
  const urgent = houseExpiries.filter((e) => expiryStatus(e, today).urgent).length;

  const groups = new Map<string, ExpiryItem[]>();
  for (const item of [...houseExpiries].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))) {
    groups.set(item.subject, [...(groups.get(item.subject) ?? []), item]);
  }

  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle
        title={`Asigurări · ${house.name}`}
        action={
          <Link href="/asigurari/nou" className="pill pill-primary shrink-0">
            <Plus size={14} /> Adaugă
          </Link>
        }
      />

      {houseExpiries.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nimic de urmărit încă" text="Adaugă RCA-ul, rovinieta, ITP-ul sau asigurarea locuinței. Te anunțăm înainte să expire și le reînnoiești din aplicație.">
          <Link href="/asigurari/nou" className="btn-dark w-full text-sm">
            <Plus size={16} /> Adaugă primul document
          </Link>
        </EmptyState>
      ) : (
        <>
          <Card>
            <p className="text-sm font-medium text-muted">Cost anual total</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{fmtRon(yearly)}</p>
            <p className="mt-1 text-sm text-muted">
              ≈ {fmtRon(Math.round(yearly / 12))}/lună · {urgent > 0 ? <span className="font-semibold text-alert">{plural(urgent, "document expiră curând", "documente expiră curând")}</span> : "toate sunt la zi"}
            </p>
          </Card>

          {[...groups.entries()].map(([subject, items]) => (
            <Card key={subject}>
              <div className="flex items-center gap-3">
                <SubjectIcon kind={items.some((i) => i.kind === "PAD") ? "home" : "car"} />
                <p className="min-w-0 truncate font-bold text-ink">{subject}</p>
              </div>
              <ul className="mt-3 flex flex-col divide-y divide-line">
                {items.map((item) => {
                  const status = expiryStatus(item, today);
                  const automatic = Boolean(activeRule(autopay, item.id));
                  return (
                    <li key={item.id}>
                      <Link href={`/asigurari/${item.id}`} className="flex items-center gap-3 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-ink">{EXPIRY_LABEL[item.kind]}</span>
                          <span className="block truncate text-xs text-muted">
                            Până pe {fmtDate(item.expiresOn)}
                            {item.provider ? ` · ${item.provider}` : ""}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1.5">
                            <Tag tone={status.tone}>{status.label}</Tag>
                            {automatic && (
                              <Tag tone="green">
                                <Zap size={11} /> Automat
                              </Tag>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-bold text-ink">{fmtRon(item.price)}</span>
                          {status.urgent && <span className="block text-xs font-bold text-pago-blue">Reînnoiește</span>}
                        </span>
                        <ChevronRight size={18} className="shrink-0 text-muted" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
