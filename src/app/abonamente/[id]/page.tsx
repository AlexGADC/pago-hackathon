import { Suspense } from "react";
import { SubscriptionDetail } from "@/components/subscriptions/SubscriptionDetail";
import { subscriptions } from "@/data/mockFamilyData";

export function generateStaticParams() {
  return subscriptions.map((s) => ({ id: s.id }));
}

export default function Page({ params }: PageProps<"/abonamente/[id]">) {
  return <Suspense fallback={null}>{params.then(({ id }) => <SubscriptionDetail subId={id} />)}</Suspense>;
}
