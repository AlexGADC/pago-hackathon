import { Check, CheckCircle2, Clock3, Send, X, XCircle, type LucideIcon } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/history";
import type { ConnectionStatus, PaymentRecord, PaymentStatus } from "@/types/pago";

const STATUS_STYLE: Record<PaymentStatus, { cls: string; Icon: LucideIcon }> = {
  procesare: { cls: "tag-orange", Icon: Clock3 },
  trimisa: { cls: "tag-blue", Icon: Send },
  confirmata: { cls: "tag-green", Icon: CheckCircle2 },
  esuata: { cls: "tag-red", Icon: XCircle },
};

export function PaymentStatusTag({ status }: { status: PaymentStatus }) {
  const { cls, Icon } = STATUS_STYLE[status];
  return (
    <span className={`${cls} inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold`}>
      <Icon size={12} />
      {STATUS_LABEL[status]}
    </span>
  );
}

const CONNECTION_STYLE: Record<ConnectionStatus, { label: string; dot: string; text: string }> = {
  conectat: { label: "Conectat", dot: "bg-success", text: "text-success" },
  sincronizare: { label: "Se sincronizează…", dot: "bg-warning", text: "text-warning" },
  deconectat: { label: "Deconectat", dot: "bg-alert", text: "text-alert" },
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const { label, dot, text } = CONNECTION_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${text}`}>
      <span className={`size-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export type StepState = "done" | "active" | "todo" | "failed";

export function Step({ state, title, detail, last = false }: { state: StepState; title: string; detail?: string; last?: boolean }) {
  const dot = {
    done: "bg-success text-white",
    active: "bg-warning-bg text-warning ring-2 ring-warning",
    todo: "bg-surface-2 text-muted",
    failed: "bg-alert text-white",
  }[state];
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`grid size-6 shrink-0 place-items-center rounded-full ${dot}`}>
          {state === "done" && <Check size={14} strokeWidth={3} />}
          {state === "failed" && <X size={14} strokeWidth={3} />}
          {state === "active" && <span className="size-2 animate-pulse rounded-full bg-warning" />}
        </span>
        {!last && <span className={`my-1 w-0.5 flex-1 rounded-full ${state === "done" ? "bg-success" : "bg-line"}`} />}
      </div>
      <div className={last ? "" : "pb-4"}>
        <p className={`text-sm font-semibold ${state === "todo" ? "text-muted" : state === "failed" ? "text-alert" : "text-ink"}`}>{title}</p>
        {detail && <p className="mt-0.5 text-xs leading-relaxed text-muted">{detail}</p>}
      </div>
    </li>
  );
}

export function PaymentTimeline({ record }: { record: PaymentRecord }) {
  if (record.external) {
    return (
      <ol>
        <Step state="done" title="Marcată ca plătită" detail={`Ai plătit în afara aplicației. Am notat plata pe ${fmtDateTime(record.createdAt)}.`} last />
      </ol>
    );
  }
  if (record.status === "esuata") {
    return (
      <ol>
        <Step state="done" title="Plată inițiată" detail={fmtDateTime(record.createdAt)} />
        <Step state="failed" title="Plata a eșuat" detail={record.failureReason ?? "Banii nu au plecat din cont."} last />
      </ol>
    );
  }
  const sent = record.status === "trimisa" || record.status === "confirmata";
  const confirmed = record.status === "confirmata";
  return (
    <ol>
      <Step state="done" title="Plată inițiată" detail={`${fmtDateTime(record.createdAt)} · ${record.methodLabel}`} />
      <Step state={sent ? "done" : "active"} title="Trimisă către furnizor" detail={sent ? `Apare pe extras ca ${record.payee}` : "Trimitem banii către furnizor…"} />
      <Step
        state={confirmed ? "done" : sent ? "active" : "todo"}
        title="Confirmată de furnizor"
        detail={confirmed ? `${record.title} a înregistrat plata.` : sent ? "Așteptăm confirmarea furnizorului…" : undefined}
        last
      />
    </ol>
  );
}
