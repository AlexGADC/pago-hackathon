import { Suspense } from "react";
import { BillDetail } from "@/components/bills/BillDetail";
import { bills } from "@/data/mockFamilyData";

// Toate facturile sunt cunoscute din datele simulate → paginile se prerandează static.
export function generateStaticParams() {
  return bills.map((b) => ({ id: b.id }));
}

// Next 16 (Cache Components): `params` se citește în <Suspense>, ca navigarea să rămână instantă.
export default function Page({ params }: PageProps<"/facturi/[id]">) {
  return <Suspense fallback={null}>{params.then(({ id }) => <BillDetail billId={id} />)}</Suspense>;
}
