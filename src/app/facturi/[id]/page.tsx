import { Suspense } from "react";
import { BillDetail } from "@/components/bills/BillDetail";
import { bills } from "@/data/mockFamilyData";

export function generateStaticParams() {
  return bills.map((b) => ({ id: b.id }));
}

export default function Page({ params }: PageProps<"/facturi/[id]">) {
  return <Suspense fallback={null}>{params.then(({ id }) => <BillDetail billId={id} />)}</Suspense>;
}
