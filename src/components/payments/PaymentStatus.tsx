import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { ConnectionStatus, PaymentStatus } from "@/types/pago";

export function PaymentStatusTag({ status }: { status: PaymentStatus }) {
  const map = {
    in_asteptare: { label: "În așteptare", cls: "tag-orange", Icon: Clock3 },
    confirmata: { label: "Confirmată", cls: "tag-green", Icon: CheckCircle2 },
    esuata: { label: "Eșuată", cls: "tag-red", Icon: XCircle },
  } as const;
  const { label, cls, Icon } = map[status];
  return (
    <span className={`${cls} inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const map = {
    conectat: { label: "Conectat", dot: "bg-success", text: "text-success" },
    sincronizare: { label: "Se sincronizează…", dot: "bg-orange-400", text: "text-orange-500" },
    deconectat: { label: "Deconectat", dot: "bg-alert", text: "text-alert" },
  } as const;
  const { label, dot, text } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${text}`}>
      <span className={`size-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
