import type { TagTone } from "@/components/shared/Card";
import type { BillStatus } from "@/types/pago";

export const BILL_STATUS: Record<BillStatus, { label: string; tone: TagTone }> = {
  normala: { label: "✅ Normală", tone: "blue" },
  red_flag: { label: "🚨 Red Flag", tone: "red" },
  contestata: { label: "📨 Contestată", tone: "indigo" },
  platita_partial: { label: "⏳ Plătită parțial", tone: "indigo" },
  platita: { label: "✔️ Plătită", tone: "green" },
};
