import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FamilyProvider } from "@/context/FamilyContext";
import { PhoneFrame } from "@/components/layout/PhoneFrame";

// Fără next/font/google: fontul de sistem merge și fără internet pe scenă.

export const metadata: Metadata = {
  title: "Pago Home & Family",
  description: "Centrul de comandă al casei și familiei — hackathon MVP",
};

export const viewport: Viewport = {
  themeColor: "#0066FF",
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
