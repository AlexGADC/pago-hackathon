import { Suspense } from "react";
import { InsuranceDetail } from "@/components/insurance/InsuranceDetail";
import { expiries } from "@/data/mockFamilyData";

export function generateStaticParams() {
  return expiries.map((e) => ({ id: e.id }));
}

export default function Page({ params }: PageProps<"/asigurari/[id]">) {
  return <Suspense fallback={null}>{params.then(({ id }) => <InsuranceDetail itemId={id} />)}</Suspense>;
}
