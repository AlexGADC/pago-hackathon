import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

/** Pe desktop: „telefon” centrat de 430px. Pe mobil: ecran complet. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center sm:p-6">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-app sm:h-[880px] sm:rounded-[32px] sm:border sm:border-card-border sm:shadow-2xl">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-4 pb-6 pt-2">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
