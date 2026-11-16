"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { useFamily } from "@/context/FamilyContext";
import { SubscriptionForm } from "./SubscriptionForm";

export function SubscriptionNewScreen() {
  const router = useRouter();
  const { house } = useFamily();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Abonament nou" subtitle={house.name} back="/abonamente" />
      <Card>
        <SubscriptionForm onSaved={(id) => router.push(`/abonamente/${id}`)} />
      </Card>
    </div>
  );
}
