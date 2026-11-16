"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/shared/Card";
import { Chip, Field } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { useFamily } from "@/context/FamilyContext";
import { EXPIRY_HINT, EXPIRY_LABEL, RENEWAL_OPTIONS } from "@/data/catalog";
import { fmtRon } from "@/lib/disputes";
import { isVehicleKind } from "@/lib/expiry";
import { addMonths } from "@/lib/format";
import type { ExpiryKind } from "@/types/pago";

const KINDS: ExpiryKind[] = ["RCA", "Rovinietă", "ITP", "PAD"];
const NEW_VEHICLE = "__new__";

export function InsuranceForm() {
  const router = useRouter();
  const { house, houseExpiries, today, addExpiry, toast } = useFamily();
  const vehicles = [...new Set(houseExpiries.filter((e) => isVehicleKind(e.kind)).map((e) => e.subject))];

  const [kind, setKind] = useState<ExpiryKind>("RCA");
  const [vehicle, setVehicle] = useState<string>(NEW_VEHICLE);
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [home, setHome] = useState("");
  const [date, setDate] = useState(addMonths(today, 1));
  const [priceText, setPriceText] = useState("");
  const [provider, setProvider] = useState("");

  const car = isVehicleKind(kind);
  const chosenVehicle = vehicles.includes(vehicle) ? vehicle : NEW_VEHICLE;
  const plateLabel = plate.trim().toUpperCase().replace(/\s+/g, "-");
  const subject = car ? (chosenVehicle === NEW_VEHICLE ? `${model.trim()} · ${plateLabel}` : chosenVehicle) : `Locuință · ${home.trim() || house.address}`;
  const subjectValid = car ? chosenVehicle !== NEW_VEHICLE || (model.trim().length >= 2 && plate.trim().length >= 5) : true;
  const suggested = RENEWAL_OPTIONS[kind].find((o) => o.recommended)?.price ?? 0;
  const price = priceText.trim() === "" ? suggested : Number(priceText.replace(",", "."));
  const valid = subjectValid && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(price) && price >= 0;

  function save() {
    if (!valid) return;
    const id = addExpiry({ houseId: house.id, kind, subject, expiresOn: date, price, provider: provider.trim() || undefined });
    toast(`Am adăugat: ${EXPIRY_LABEL[kind]}`);
    router.push(`/asigurari/${id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Adaugă document" subtitle={house.name} back="/asigurari" />

      <Card className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Ce vrei să urmărești?</p>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
                {k}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">{EXPIRY_HINT[kind]}</p>
        </div>

        {car ? (
          <>
            {vehicles.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Pentru ce mașină?</p>
                <div className="flex flex-wrap gap-2">
                  {vehicles.map((v) => (
                    <Chip key={v} active={chosenVehicle === v} onClick={() => setVehicle(v)}>
                      {v}
                    </Chip>
                  ))}
                  <Chip active={chosenVehicle === NEW_VEHICLE} onClick={() => setVehicle(NEW_VEHICLE)}>
                    Altă mașină
                  </Chip>
                </div>
              </div>
            )}
            {chosenVehicle === NEW_VEHICLE && (
              <>
                <Field label="Marcă și model">
                  <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="ex: Dacia Duster" className="field-input" />
                </Field>
                <Field label="Număr de înmatriculare">
                  <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ex: CJ-01-ABC" className="field-input uppercase" />
                </Field>
              </>
            )}
          </>
        ) : (
          <Field label="Adresa locuinței" hint="Dacă o lași goală, folosim adresa profilului.">
            <input value={home} onChange={(e) => setHome(e.target.value)} placeholder={house.address} className="field-input" />
          </Field>
        )}

        <Field label="Valabil până pe">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" />
        </Field>

        <Field label="Preț plătit (RON)" hint={`Dacă nu știi, folosim prețul orientativ de ${fmtRon(suggested)}.`}>
          <input inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value.replace(/[^\d.,]/g, ""))} placeholder={String(suggested)} className="field-input" />
        </Field>

        {(kind === "RCA" || kind === "PAD") && (
          <Field label="Asigurător (opțional)">
            <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="ex: Groupama" className="field-input" />
          </Field>
        )}

        <button onClick={save} disabled={!valid} className="btn-dark w-full disabled:opacity-50">
          Adaugă și primește remindere
        </button>
      </Card>
    </div>
  );
}
