import type { DisputeDocument, DocAmount } from "@/lib/documents";
import { Canvas, type FontBytes } from "./canvas";
import { COLOR, CONTENT_WIDTH, PAGE, TONE } from "./theme";

function drawAmounts(canvas: Canvas, amounts: DocAmount[]): void {
  const gap = 10;
  const width = (CONTENT_WIDTH - gap * (amounts.length - 1)) / amounts.length;
  canvas.ensure(56);
  amounts.forEach((amount, index) => {
    const x = PAGE.margin + index * (width + gap);
    canvas.box(x, canvas.y, width, 50, { fill: TONE[amount.tone].fill, radius: 10 });
    canvas.text(amount.label.toLocaleUpperCase("ro-RO"), x + 12, canvas.y + 18, { size: 7, bold: true, color: COLOR.muted, tracking: 0.8, maxWidth: width - 24 });
    canvas.text(amount.value, x + 12, canvas.y + 38, { size: 14, bold: true, color: TONE[amount.tone].text, maxWidth: width - 24 });
  });
  canvas.y += 50;
}

function drawRequests(canvas: Canvas, requests: string[]): void {
  const style = { size: 10, color: COLOR.ink };
  requests.forEach((request, index) => {
    const lines = canvas.lines(request, style, CONTENT_WIDTH - 28);
    const height = lines.length * 14.5 + 6;
    canvas.ensure(height);
    canvas.dot(PAGE.margin + 8, canvas.y + 7.5, 8, COLOR.mint);
    canvas.text(String(index + 1), PAGE.margin + 8, canvas.y + 10.8, { size: 8.5, bold: true, color: COLOR.greenDark, align: "center" });
    lines.forEach((line, row) => canvas.text(line, PAGE.margin + 28, canvas.y + 11 + row * 14.5, style));
    canvas.y += height;
  });
}

export async function renderDispute(data: DisputeDocument, fonts: FontBytes): Promise<Uint8Array> {
  const canvas = await Canvas.create(fonts, {
    title: `${data.heading} ${data.number}`,
    subject: data.subject,
    heading: data.heading,
    number: data.number,
    issued: data.issued,
  });

  const top = canvas.y + 22;
  canvas.status(data.status, [], top - 6);
  canvas.text("OBIECT", PAGE.margin, top + 6, { size: 8, bold: true, color: COLOR.muted, tracking: 1.2 });
  const subjectHeight = canvas.paragraph(data.subject, PAGE.margin, top + 15, { size: 14, bold: true, color: COLOR.ink }, CONTENT_WIDTH - 145, 19);
  canvas.y = top + 15 + subjectHeight + 12;

  if (data.resolution) {
    canvas.note(data.resolution, "success");
    canvas.y += 12;
  }

  canvas.parties(data.recipient, data.sender);
  canvas.y += 16;

  canvas.section("Factura contestată");
  canvas.grid(data.invoice);
  canvas.y += 6;

  canvas.section(`Motivul sesizării: ${data.reasonTitle}`, 80);
  canvas.y += canvas.paragraph(data.reasonText, PAGE.margin, canvas.y - 2, { size: 10, color: COLOR.ink }, CONTENT_WIDTH, 14.5);
  if (data.reasonRows.length > 0) {
    canvas.y += 8;
    canvas.grid(data.reasonRows, data.reasonRows.length);
  }
  if (data.flagged.length > 0) {
    canvas.y += 6;
    canvas.note(data.flagged.map((line) => `Linie contestată: ${line}`).join("\n"), "alert", 9);
  }
  canvas.y += 12;

  drawAmounts(canvas, data.amounts);
  canvas.y += 18;

  canvas.section("Ce solicit", 70);
  drawRequests(canvas, data.requests);
  canvas.y += 8;

  canvas.section("Declarație și semnătură", 78);
  canvas.signature(data.declaration, data.signature.name, data.signature.line);

  return canvas.finish(data.generated, data.disclaimer);
}
