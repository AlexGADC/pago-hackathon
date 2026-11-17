import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { CheckoutSheet } from "@/components/payments/CheckoutSheet";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { BottomNav } from "./BottomNav";
import { Toaster } from "./Toaster";
import { TopBar } from "./TopBar";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center sm:p-6">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-app sm:h-[min(880px,calc(100dvh_-_3rem))] sm:rounded-[32px] sm:border sm:border-line sm:shadow-2xl">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-4 pb-6 pt-2">{children}</main>
        <BottomNav />
        <Onboarding />
        <AuthGate />
        <CheckoutSheet />
        <Toaster />
      </div>
    </div>
  );
}
