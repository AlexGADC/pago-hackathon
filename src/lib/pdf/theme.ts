import { rgb, type RGB } from "pdf-lib";
import type { DocTone } from "@/lib/documents";
import type { PaymentCategory } from "@/types/pago";

function hex(value: string): RGB {
  const n = Number.parseInt(value.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export const PAGE = { width: 595.28, height: 841.89, margin: 44, footer: 58 } as const;
export const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
export const RIGHT = PAGE.width - PAGE.margin;

export const COLOR = {
  white: rgb(1, 1, 1),
  mint: hex("#e6f4ea"),
  tint: hex("#f3f9f5"),
  line: hex("#d3e6d8"),
  ink: hex("#1c2b21"),
  muted: hex("#5f7566"),
  green: hex("#2f7d52"),
  greenDark: hex("#1f5c3b"),
} as const;

export const TONE: Record<DocTone, { text: RGB; fill: RGB }> = {
  success: { text: hex("#237a4f"), fill: hex("#e4f6ec") },
  warning: { text: hex("#b8662a"), fill: hex("#fff1e3") },
  alert: { text: hex("#b8334f"), fill: hex("#fdecef") },
  info: { text: hex("#4553b0"), fill: hex("#e3e7fb") },
  neutral: { text: COLOR.ink, fill: COLOR.tint },
};

export const CATEGORY_COLOR: Record<PaymentCategory, RGB> = {
  utilitati: hex("#5a9be6"),
  abonamente: hex("#e8637f"),
  asigurari: hex("#3fae74"),
  servicii: hex("#e09a3e"),
};
