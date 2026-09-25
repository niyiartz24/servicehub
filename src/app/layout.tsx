import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/config/brand";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: { default: brand.lockup, template: `%s · ${brand.name}` },
  description: brand.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
