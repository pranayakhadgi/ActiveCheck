import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ActiveCheck — what you pay for active management",
  // The product statement from docs/brand-and-hero.md, verbatim: the page, the
  // meta description and the "What ActiveCheck measures" section all say the
  // same sentence rather than three near-variants of it.
  description:
    "ActiveCheck shows how much of a fund's fee pays for active stock selection rather than market exposure. Built on public SEC N-PORT filings.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </TooltipProvider>
      </body>
    </html>
  );
}
