import type { DocStep, ReceiptDocument } from "@/lib/documents";
import { Canvas, type FontBytes } from "./canvas";
import { CATEGORY_COLOR, COLOR, CONTENT_WIDTH, PAGE, RIGHT, TONE } from "./theme";

function drawSteps(canvas: Canvas, steps: DocStep[]): void {
  const column = CONTENT_WIDTH / steps.length;
  const detailStyle = { size: 8.5, color: COLOR.muted, align: "center" as const };
  const wrapped = steps.map((step) => canvas.lines(step.detail, detailStyle, column - 18).slice(0, 3));
  const height = 44 + Math.max(...wrapped.map((lines) => lines.length)) * 12;
  canvas.ensure(height);
  const centerY = canvas.y + 11;
  const centers = steps.map((_, index) => PAGE.margin + column * index + column / 2);

  for (let index = 1; index < steps.length; index += 1) {
    const reached = steps[index].state === "done";
    canvas.rule(centers[index - 1] + 11, centers[index] - 11, centerY, reached ? COLOR.green : COLOR.line, 1.6);
  }

  steps.forEach((step, index) => {
    const x = centers[index];
    if (step.state === "done") {
      canvas.dot(x, centerY, 10, COLOR.green);
      canvas.mark("check", x, centerY, 11, COLOR.white);
    } else if (step.state === "failed") {
      canvas.dot(x, centerY, 10, TONE.alert.text);
      canvas.mark("cross", x, centerY, 11, COLOR.white);
    } else if (step.state === "active") {
      canvas.dot(x, centerY, 9.3, COLOR.white, TONE.warning.text);
      canvas.dot(x, centerY, 3.4, TONE.warning.text);
    } else {
      canvas.dot(x, centerY, 9.3, COLOR.white, COLOR.line);
    }
    canvas.text(step.label, x, centerY + 28, { size: 9.5, bold: true, color: step.state === "todo" ? COLOR.muted : COLOR.ink, align: "center", maxWidth: column - 10 });
    wrapped[index].forEach((line, row) => canvas.text(line, x, centerY + 41 + row * 12, detailStyle));
  });
  canvas.y += height;
}

export async function renderReceipt(data: ReceiptDocument, fonts: FontBytes): Promise<Uint8Array> {
  const canvas = await Canvas.create(fonts, {
    title: `${data.heading} ${data.number}`,
    subject: `${data.title} · ${data.amount}`,
    heading: data.heading,
    number: data.number,
    issued: data.issued,
  });

  const top = canvas.y + 24;
  canvas.status(data.status, data.badges, top - 6);
  canvas.text(data.amountLabel.toLocaleUpperCase("ro-RO"), PAGE.margin, top + 6, { size: 8, bold: true, color: COLOR.muted, tracking: 1.2 });
  canvas.text(data.amount, PAGE.margin, top + 42, { size: 32, bold: true, color: COLOR.ink });
  canvas.text(data.title, PAGE.margin, top + 64, { size: 13, bold: true, color: COLOR.ink, maxWidth: CONTENT_WIDTH - 150 });
  canvas.dot(PAGE.margin + 4, top + 77, 3.6, CATEGORY_COLOR[data.category]);
  canvas.text(data.subtitle, PAGE.margin + 13, top + 80.5, { size: 9.5, color: COLOR.muted, maxWidth: CONTENT_WIDTH - 150 });
  canvas.y = top + 98;

  canvas.parties(data.payer, data.payee);
  canvas.y += 22;

  canvas.section("Detalii plată");
  canvas.grid(data.details);
  canvas.y += 12;

  canvas.section("Sumar");
  canvas.table(data.summary);
  canvas.y += 6;
  canvas.ensure(46);
  canvas.box(PAGE.margin, canvas.y, CONTENT_WIDTH, 40, { fill: COLOR.mint, radius: 10 });
  canvas.text(data.total.label, PAGE.margin + 16, canvas.y + 25, { size: 11, bold: true, color: COLOR.ink });
  canvas.text(data.total.value, RIGHT - 16, canvas.y + 26.5, { size: 16, bold: true, color: data.status.tone === "success" ? COLOR.greenDark : COLOR.ink, align: "right" });
  canvas.y += 40;
  if (data.points) {
    canvas.text(data.points, PAGE.margin, canvas.y + 15, { size: 9, color: COLOR.muted });
    canvas.y += 15;
  }
  canvas.y += 22;

  canvas.section("Parcursul plății", 90);
  drawSteps(canvas, data.steps);
  if (data.note) {
    canvas.y += 12;
    canvas.note(data.note, "alert");
  }
  canvas.y += 14;
  canvas.ensure(14);
  canvas.text(data.verify, PAGE.margin, canvas.y + 9, { size: 8.5, color: COLOR.muted, maxWidth: CONTENT_WIDTH });

  return canvas.finish(data.generated, data.disclaimer);
}
