"use client";

// Flux A — utilități cu contor. Poză (Claude Vision) SAU index manual → validare → plată parțială + sesizare.

import { useRef, useState } from "react";
import { Camera, CheckCircle2, ImageIcon, Keyboard, Loader2, Snowflake } from "lucide-react";
import { Card, Tag } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { POINTS } from "@/data/mockFamilyData";
import { fmtNum, fmtRon, legalDeadlineDays, validateIndex } from "@/lib/disputes";
import type { AnalyzeMeterRequest, AnalyzeMeterResponse, Bill, ConfidenceLabel, DisputeTicket } from "@/types/pago";

type Mode = "poza" | "manual";
type ReadState = { status: "idle" } | { status: "loading" } | { status: "done"; source: AnalyzeMeterResponse["source"]; preview?: string } | { status: "error"; message: string };

const CONFIDENCE: Record<Mode, ConfidenceLabel> = {
  poza: "Verificat AI + Poză",
  manual: "Declarat manual de client (supus regularizării)",
};

/** `onSent` e apelat după trimitere: factura iese din „red_flag”, deci părintele afișează confirmarea. */
export function DisputeFlowA({ bill, onSent }: { bill: Bill; onSent: (ticket: DisputeTicket) => void }) {
  const { submitDispute, addPoints } = useFamily();
  const meter = bill.meter!;
  const fileInput = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("poza");
  const [read, setRead] = useState<ReadState>({ status: "idle" });
  const [indexText, setIndexText] = useState("");

  // Câmpul de index apare mereu pe „manual”, iar pe „poză” abia după ce AI-ul a citit.
  const showIndexField = mode === "manual" || read.status === "done";
  const realIndex = Number(indexText.replace(/\D/g, ""));
  const validation = indexText ? validateIndex(bill, realIndex) : null;

  async function analyze(body: AnalyzeMeterRequest, preview?: string) {
    setRead({ status: "loading" });
    try {
      const res = await fetch("/api/analyze-meter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8_000), // ruta are deja fallback la 5 s; asta e plasa de siguranță
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AnalyzeMeterResponse;
      if (data.index == null) throw new Error("indexul nu s-a putut citi");
      setIndexText(String(data.index));
      setRead({ status: "done", source: data.source, preview });
    } catch {
      setRead({ status: "error", message: "Nu am putut citi poza. Introdu indexul manual, durează 5 secunde." });
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const { base64, dataUrl } = await downscaleToJpeg(file);
    await analyze({ billId: bill.id, imageBase64: base64, mediaType: "image/jpeg" }, dataUrl);
  }

  function switchMode(next: Mode) {
    setMode(next);
    if (next === "poza" && read.status !== "done") setIndexText("");
  }

  function confirm() {
    if (!validation?.ok) return;
    const ticket: DisputeTicket = {
      id: `tkt-${bill.id}-${Date.now()}`,
      billId: bill.id,
      houseId: bill.houseId,
      createdAt: new Date().toISOString(),
      stage: "trimisa",
      legalDeadlineDays: legalDeadlineDays(bill),
      confidence: CONFIDENCE[mode],
      realIndex,
      disputedAmount: validation.disputedAmount,
      paidAmount: validation.correctAmount,
      message:
        `Către ${bill.provider}: contest factura ${bill.invoiceNumber} (cod client ${bill.clientCode}). ` +
        `Indexul facturat ${fmtNum(meter.billedIndex)} ${meter.unit} este estimat greșit; indexul real este ${fmtNum(realIndex)} ${meter.unit} ` +
        `(${CONFIDENCE[mode]}). Am achitat suma necontestată de ${fmtRon(validation.correctAmount)} și solicit emiterea facturii storno ` +
        `pentru diferența de ${fmtRon(validation.disputedAmount)}.`,
    };
    submitDispute(ticket);
    addPoints(POINTS.bounty);
    onSent(ticket);
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-ink">Care e indexul real?</h2>
      <p className="mt-1 text-sm text-muted">
        Ultimul index confirmat: <b className="text-ink">{fmtNum(meter.lastConfirmedIndex)} {meter.unit}</b> · Facturat: <b className="text-alert">{fmtNum(meter.billedIndex)} {meter.unit}</b>
      </p>

      {/* Tab-uri */}
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-app p-1" role="tablist">
        <TabButton active={mode === "poza"} onClick={() => switchMode("poza")} icon={<Camera size={16} />}>
          Poză contor
        </TabButton>
        <TabButton active={mode === "manual"} onClick={() => switchMode("manual")} icon={<Keyboard size={16} />}>
          Introdu indexul manual
        </TabButton>
      </div>

      {/* Poză */}
      {mode === "poza" && (
        <div className="mt-4">
          {read.status === "done" && read.preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- previzualizare locală (data URL)
            <img src={read.preview} alt="Poza contorului" className="h-40 w-full rounded-2xl object-cover" />
          ) : (
            <button
              onClick={() => fileInput.current?.click()}
              disabled={read.status === "loading"}
              className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-app text-sm font-semibold text-muted"
            >
              {read.status === "loading" ? (
                <>
                  <Loader2 size={26} className="animate-spin text-pago-blue" /> Pago AI citește contorul…
                </>
              ) : (
                <>
                  <ImageIcon size={26} /> Fă o poză sau încarcă una
                </>
              )}
            </button>
          )}
          <input ref={fileInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <button
            onClick={() => analyze({ billId: bill.id, useSample: true })}
            disabled={read.status === "loading"}
            className="mt-2 w-full rounded-full bg-white py-2.5 text-sm font-semibold text-pago-blue shadow-card disabled:opacity-60"
          >
            Folosește poză contor exemplu
          </button>
          {read.status === "error" && (
            <p className="mt-3 rounded-2xl bg-alert-bg p-3 text-sm text-alert">
              {read.message}{" "}
              <button className="font-bold underline" onClick={() => switchMode("manual")}>
                Introdu manual
              </button>
            </p>
          )}
        </div>
      )}

      {/* Câmp editabil */}
      {showIndexField && (
        <label className="mt-4 block">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            {mode === "poza" ? "Index citit de AI — verifică și corectează dacă e cazul" : "Indexul de pe contor"}
            {mode === "poza" && read.status === "done" && read.source === "fallback" && <span className="text-[11px] font-normal text-muted">(demo)</span>}
          </span>
          <div className="mt-2 flex items-center rounded-2xl border border-line bg-white px-4 focus-within:border-pago-blue">
            <input
              inputMode="numeric"
              value={indexText}
              onChange={(e) => setIndexText(e.target.value.replace(/[^\d.\s]/g, ""))}
              placeholder={`ex: ${fmtNum(meter.lastConfirmedIndex + 260)}`}
              className="h-14 min-w-0 flex-1 bg-transparent text-2xl font-bold text-ink outline-none"
            />
            <span className="font-semibold text-muted">{meter.unit}</span>
          </div>
          {validation && !validation.ok && <p className="mt-2 text-sm font-semibold text-alert">{validation.error}</p>}
        </label>
      )}

      {/* Rezumat */}
      {validation?.ok && (
        <div className="mt-4 rounded-2xl bg-app p-4">
          <Tag tone={mode === "poza" ? "green" : "orange"}>{mode === "poza" ? "✓ " : ""}{CONFIDENCE[mode]}</Tag>
          <p className="mt-3 text-sm text-muted">
            Consum real: <b className="text-ink">{fmtNum(validation.consumption)} {meter.unit}</b>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-card">
              <p className="text-xs text-muted">Plătești acum</p>
              <p className="text-2xl font-extrabold text-success">{fmtRon(validation.correctAmount)}</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-card">
              <p className="flex items-center gap-1 text-xs text-muted">
                <Snowflake size={12} /> Înghețat
              </p>
              <p className="text-2xl font-extrabold text-ink">{fmtRon(validation.disputedAmount)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">Diferența rămâne înghețată până când {bill.provider} emite factura storno.</p>
          <button onClick={confirm} className="btn-dark mt-4 w-full">
            <CheckCircle2 size={18} /> Trimite sesizarea și plătește {fmtRon(validation.correctAmount)}
          </button>
        </div>
      )}
    </Card>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[13px] font-semibold transition ${active ? "bg-white text-ink shadow-card" : "text-muted"}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Micșorează poza (telefoanele fac 5–10 MB) la max. 1600px JPEG, ca să ajungă repede la Claude. */
async function downscaleToJpeg(file: File, maxSide = 1600): Promise<{ base64: string; dataUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { dataUrl, base64: dataUrl.split(",")[1] };
}
