import type { BillStatus } from "@/types/pago";

/** Eticheta + tonul pastilei pentru fiecare status de factură (folosit în listă și în detaliu). */
export const BILL_STATUS: Record<BillStatus, { label: string; tone: "blue" | "red" | "green" | "indigo" }> = {
  normala: { label: "✅ Normală", tone: "blue" },
  red_flag: { label: "🚨 Red Flag", tone: "red" },
  contestata: { label: "📨 Contestată", tone: "indigo" },
  platita_partial: { label: "🧊 Plătită parțial", tone: "indigo" },
  platita: { label: "✔️ Plătită", tone: "green" },
};
