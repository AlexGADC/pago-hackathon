import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FamilyProvider } from "@/context/FamilyContext";
import { PhoneFrame } from "@/components/layout/PhoneFrame";

export const metadata: Metadata = {
  title: "Pago Home & Family",
  description: "Toate plățile casei într-un singur loc: facturi, abonamente, asigurări și plăți rapide.",
};

export const viewport: Viewport = {
  themeColor: "#2f7d52",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ro" className="h-full antialiased">
      <body className="min-h-full">
        <FamilyProvider>
          <PhoneFrame>{children}</PhoneFrame>
        </FamilyProvider>
      </body>
    </html>
  );
}
