import fontkit from "@pdf-lib/fontkit";
import { LineCapStyle, PDFDocument, setCharacterSpacing, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { DocParty, DocRow, DocStatus, DocTone } from "@/lib/documents";
import { COLOR, CONTENT_WIDTH, PAGE, RIGHT, TONE } from "./theme";

export interface FontBytes {
  regular: Uint8Array | ArrayBuffer;
  bold: Uint8Array | ArrayBuffer;
}

export interface DocumentMeta {
  title: string;
  subject: string;
  heading: string;
  number: string;
  issued: string;
}

export interface TextStyle {
  size: number;
  bold?: boolean;
  color?: RGB;
  align?: "left" | "right" | "center";
  tracking?: number;
  maxWidth?: number;
}

interface BoxStyle {
  fill?: RGB;
  stroke?: RGB;
  strokeWidth?: number;
  radius?: number;
}

const KAPPA = 0.5523;
const ELLIPSIS = "…";
const PRODUCER = "Pago Home & Family";
const BAND_HEIGHT = 98;
const SLIM_BAND_HEIGHT = 52;

function roundedPath(width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  const k = r * KAPPA;
  return [
    `M ${r} 0`,
    `H ${width - r}`,
    `C ${width - r + k} 0 ${width} ${r - k} ${width} ${r}`,
    `V ${height - r}`,
    `C ${width} ${height - r + k} ${width - r + k} ${height} ${width - r} ${height}`,
    `H ${r}`,
    `C ${r - k} ${height} 0 ${height - r + k} 0 ${height - r}`,
    `V ${r}`,
    `C 0 ${r - k} ${r - k} 0 ${r} 0`,
    "Z",
  ].join(" ");
}

export class Canvas {
  readonly pages: PDFPage[] = [];
  y = 0;
  private page!: PDFPage;
  private readonly supported: Set<number>;

  private constructor(
    private readonly doc: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
    private readonly meta: DocumentMeta,
  ) {
    this.supported = new Set(regular.getCharacterSet());
  }

  static async create(fonts: FontBytes, meta: DocumentMeta): Promise<Canvas> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const regular = await doc.embedFont(fonts.regular, { subset: false });
    const bold = await doc.embedFont(fonts.bold, { subset: false });
    doc.setTitle(meta.title);
    doc.setSubject(meta.subject);
    doc.setAuthor(PRODUCER);
    doc.setCreator(PRODUCER);
    doc.setProducer(PRODUCER);
    doc.setLanguage("ro-RO");
    const canvas = new Canvas(doc, regular, bold, meta);
    canvas.openPage(true);
    return canvas;
  }

  private openPage(first: boolean): void {
    this.page = this.doc.addPage([PAGE.width, PAGE.height]);
    this.pages.push(this.page);
    const height = first ? BAND_HEIGHT : SLIM_BAND_HEIGHT;
    this.box(0, 0, PAGE.width, height, { fill: COLOR.mint });
    this.box(0, 0, PAGE.width, 5, { fill: COLOR.green });
    if (first) {
      this.text("pago", PAGE.margin, 62, { size: 30, bold: true, color: COLOR.green });
      this.text("Home & Family", PAGE.margin + 1, 79, { size: 9, color: COLOR.muted });
      this.text(this.meta.heading.toLocaleUpperCase("ro-RO"), RIGHT, 43, { size: 8.5, bold: true, color: COLOR.muted, align: "right", tracking: 1.4 });
      this.text(this.meta.number, RIGHT, 65, { size: 17, bold: true, color: COLOR.ink, align: "right" });
      this.text(this.meta.issued, RIGHT, 82, { size: 9, color: COLOR.muted, align: "right" });
    } else {
      this.text("pago", PAGE.margin, 34, { size: 17, bold: true, color: COLOR.green });
      this.text(`${this.meta.heading} ${this.meta.number}`, RIGHT, 33, { size: 9, bold: true, color: COLOR.muted, align: "right" });
    }
    this.y = height;
  }

  ensure(height: number): void {
    if (this.y + height <= PAGE.height - PAGE.footer) return;
    this.openPage(false);
    this.y += 22;
  }

  private font(style: TextStyle): PDFFont {
    return style.bold ? this.bold : this.regular;
  }

  clean(value: string): string {
    let out = "";
    for (const ch of value.normalize("NFC")) {
      const code = ch.codePointAt(0) ?? 0;
      if (ch === "\n" || ch === "\t") out += " ";
      else if (this.supported.has(code)) out += ch;
    }
    return out.replace(/ {2,}/g, " ").trim();
  }

  private width(cleaned: string, style: TextStyle): number {
    const base = this.font(style).widthOfTextAtSize(cleaned, style.size);
    const count = [...cleaned].length;
    return style.tracking && count > 1 ? base + style.tracking * (count - 1) : base;
  }

  measure(value: string, style: TextStyle): number {
    return this.width(this.clean(value), style);
  }

  private fit(cleaned: string, style: TextStyle, maxWidth: number): string {
    if (this.width(cleaned, style) <= maxWidth) return cleaned;
    const chars = [...cleaned];
    while (chars.length > 1 && this.width(`${chars.join("").trimEnd()}${ELLIPSIS}`, style) > maxWidth) chars.pop();
    return `${chars.join("").trimEnd()}${ELLIPSIS}`;
  }

  lines(value: string, style: TextStyle, maxWidth: number): string[] {
    const result: string[] = [];
    for (const block of value.split("\n")) {
      let current = "";
      for (const word of this.clean(block).split(" ").filter(Boolean)) {
        const candidate = current ? `${current} ${word}` : word;
        if (this.width(candidate, style) <= maxWidth) {
          current = candidate;
          continue;
        }
        if (current) result.push(current);
        current = word;
        while (this.width(current, style) > maxWidth && current.length > 1) {
          let cut = current.length - 1;
          while (cut > 1 && this.width(current.slice(0, cut), style) > maxWidth) cut -= 1;
          result.push(current.slice(0, cut));
          current = current.slice(cut);
        }
      }
      if (current) result.push(current);
    }
    return result.length > 0 ? result : [""];
  }

  text(value: string, x: number, baseline: number, style: TextStyle): number {
    const cleaned = this.clean(value);
    const content = style.maxWidth ? this.fit(cleaned, style, style.maxWidth) : cleaned;
    if (!content) return 0;
    const width = this.width(content, style);
    const left = style.align === "right" ? x - width : style.align === "center" ? x - width / 2 : x;
    if (style.tracking) this.page.pushOperators(setCharacterSpacing(style.tracking));
    this.page.drawText(content, { x: left, y: PAGE.height - baseline, size: style.size, font: this.font(style), color: style.color ?? COLOR.ink });
    if (style.tracking) this.page.pushOperators(setCharacterSpacing(0));
    return width;
  }

  paragraph(value: string, x: number, top: number, style: TextStyle, maxWidth: number, lineHeight: number = style.size * 1.45): number {
    const lines = this.lines(value, style, maxWidth);
    lines.forEach((line, index) => this.text(line, x, top + style.size * 0.82 + index * lineHeight, style));
    return lines.length * lineHeight;
  }

  box(x: number, top: number, width: number, height: number, style: BoxStyle): void {
    const common = { color: style.fill, borderColor: style.stroke, borderWidth: style.stroke ? (style.strokeWidth ?? 0.8) : 0 };
    if (style.radius) {
      this.page.drawSvgPath(roundedPath(width, height, style.radius), { x, y: PAGE.height - top, ...common });
      return;
    }
    this.page.drawRectangle({ x, y: PAGE.height - top - height, width, height, ...common });
  }

  rule(x1: number, x2: number, top: number, color: RGB = COLOR.line, thickness = 0.8): void {
    this.page.drawLine({ start: { x: x1, y: PAGE.height - top }, end: { x: x2, y: PAGE.height - top }, thickness, color });
  }

  dot(cx: number, cy: number, radius: number, fill?: RGB, stroke?: RGB, strokeWidth = 1.4): void {
    this.page.drawCircle({ x: cx, y: PAGE.height - cy, size: radius, color: fill, borderColor: stroke, borderWidth: stroke ? strokeWidth : 0 });
  }

  mark(kind: "check" | "cross", cx: number, cy: number, size: number, color: RGB): void {
    const s = size / 10;
    const path = kind === "check" ? `M ${1.8 * s} ${5.3 * s} L ${4.2 * s} ${7.6 * s} L ${8.3 * s} ${2.7 * s}` : `M ${2.6 * s} ${2.6 * s} L ${7.4 * s} ${7.4 * s} M ${7.4 * s} ${2.6 * s} L ${2.6 * s} ${7.4 * s}`;
    this.page.drawSvgPath(path, { x: cx - size / 2, y: PAGE.height - (cy - size / 2), borderColor: color, borderWidth: 1.5 * s + 0.4, borderLineCap: LineCapStyle.Round });
  }

  pill(label: string, x: number, top: number, tone: DocTone, align: "left" | "right" = "left"): number {
    const style: TextStyle = { size: 9, bold: true, color: TONE[tone].text };
    const width = this.measure(label, style) + 20;
    const left = align === "right" ? x - width : x;
    this.box(left, top, width, 20, { fill: TONE[tone].fill, radius: 10 });
    this.text(label, left + 10, top + 13.4, style);
    return width;
  }

  status(status: DocStatus, badges: string[], top: number): void {
    this.pill(status.label, RIGHT, top, status.tone, "right");
    badges.forEach((badge, index) => this.pill(badge, RIGHT, top + 26 * (index + 1), "neutral", "right"));
  }

  section(label: string, reserve = 60): void {
    this.ensure(reserve);
    const style: TextStyle = { size: 8, bold: true, color: COLOR.green, tracking: 1.2 };
    const width = this.text(label.toLocaleUpperCase("ro-RO"), PAGE.margin, this.y + 8, style);
    this.rule(PAGE.margin + width + 10, RIGHT, this.y + 5.2);
    this.y += 22;
  }

  parties(left: DocParty, right: DocParty): void {
    const gap = 14;
    const width = (CONTENT_WIDTH - gap) / 2;
    const inner = width - 28;
    const lineStyle: TextStyle = { size: 9.5, color: COLOR.muted };
    const wrapped = [left, right].map((party) => party.lines.flatMap((line) => this.lines(line, lineStyle, inner)));
    const height = 44 + Math.max(...wrapped.map((lines) => lines.length)) * 13.5 + 6;
    this.ensure(height + 20);
    [left, right].forEach((party, index) => {
      const x = PAGE.margin + index * (width + gap);
      this.box(x, this.y, width, height, { fill: COLOR.tint, radius: 12 });
      this.text(party.label.toLocaleUpperCase("ro-RO"), x + 14, this.y + 19, { size: 7.5, bold: true, color: COLOR.muted, tracking: 1.1 });
      this.text(party.name, x + 14, this.y + 36, { size: 12, bold: true, color: COLOR.ink, maxWidth: inner });
      wrapped[index].forEach((line, row) => this.text(line, x + 14, this.y + 52 + row * 13.5, lineStyle));
    });
    this.y += height;
  }

  grid(rows: DocRow[], columns = 4): void {
    const gap = 14;
    const width = (CONTENT_WIDTH - gap * (columns - 1)) / columns;
    const valueStyle: TextStyle = { size: 10.5, bold: true, color: COLOR.ink };
    for (let start = 0; start < rows.length; start += columns) {
      const cells = rows.slice(start, start + columns).map((row) => ({ label: row.label, lines: this.lines(row.value, valueStyle, width).slice(0, 3) }));
      const height = 15 + Math.max(...cells.map((cell) => cell.lines.length)) * 14 + 7;
      this.ensure(height);
      cells.forEach((cell, index) => {
        const x = PAGE.margin + index * (width + gap);
        this.text(cell.label.toLocaleUpperCase("ro-RO"), x, this.y + 7, { size: 7, bold: true, color: COLOR.muted, tracking: 0.9, maxWidth: width });
        cell.lines.forEach((line, row) => this.text(line, x, this.y + 22 + row * 14, { ...valueStyle, maxWidth: width }));
      });
      this.y += height;
    }
  }

  table(rows: DocRow[]): void {
    rows.forEach((row, index) => {
      this.ensure(22);
      if (index > 0) this.rule(PAGE.margin, RIGHT, this.y, COLOR.line, 0.6);
      this.text(row.label, PAGE.margin, this.y + 14.5, { size: 10, color: COLOR.muted, maxWidth: CONTENT_WIDTH - 150 });
      this.text(row.value, RIGHT, this.y + 14.5, { size: 10, bold: true, color: COLOR.ink, align: "right" });
      this.y += 22;
    });
  }

  note(value: string, tone: DocTone, size = 9.5): void {
    const style: TextStyle = { size, color: TONE[tone].text };
    const lines = this.lines(value, style, CONTENT_WIDTH - 28);
    const height = lines.length * size * 1.45 + 20;
    this.ensure(height + 6);
    this.box(PAGE.margin, this.y, CONTENT_WIDTH, height, { fill: TONE[tone].fill, radius: 10 });
    lines.forEach((line, index) => this.text(line, PAGE.margin + 14, this.y + 10 + size * 0.82 + index * size * 1.45, style));
    this.y += height;
  }

  signature(statement: string, name: string, line: string): void {
    const style: TextStyle = { size: 9.5, color: COLOR.muted };
    const width = CONTENT_WIDTH * 0.54;
    const lines = this.lines(statement, style, width);
    const height = Math.max(lines.length * 13.5, 50);
    this.ensure(height);
    lines.forEach((text, index) => this.text(text, PAGE.margin, this.y + 9 + index * 13.5, style));
    this.text("Cu stimă,", RIGHT, this.y + 9, { size: 9.5, color: COLOR.muted, align: "right" });
    this.text(name, RIGHT, this.y + 27, { size: 12, bold: true, color: COLOR.ink, align: "right", maxWidth: CONTENT_WIDTH * 0.4 });
    this.rule(RIGHT - 170, RIGHT, this.y + 35);
    this.text(line, RIGHT, this.y + 48, { size: 8.5, color: COLOR.muted, align: "right" });
    this.y += height;
  }

  async finish(generated: string, disclaimer: string): Promise<Uint8Array> {
    const total = this.pages.length;
    this.pages.forEach((page, index) => {
      this.page = page;
      const top = PAGE.height - 50;
      this.rule(PAGE.margin, RIGHT, top);
      this.text(generated, PAGE.margin, top + 16, { size: 8, color: COLOR.muted, maxWidth: CONTENT_WIDTH - 90 });
      this.text(`Pagina ${index + 1} din ${total}`, RIGHT, top + 16, { size: 8, color: COLOR.muted, align: "right" });
      this.text(disclaimer, PAGE.margin, top + 29, { size: 7.5, color: COLOR.muted, maxWidth: CONTENT_WIDTH });
    });
    return this.doc.save();
  }
}
