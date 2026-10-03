import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Rosca_Credit – Rotating savings, on-chain",
  description: "A rotating savings and credit association (ROSCA) on Arc.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      style={{
        ["--font-fraunces" as any]: "Georgia, 'Times New Roman', serif",
        ["--font-worksans" as any]:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        ["--font-plexmono" as any]:
          "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
      }}
    >
      <body className="font-body adire-bg min-h-screen overflow-x-hidden">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 min-w-0">
              <TopBar />
              <main className="pb-20 md:pb-8">{children}</main>
            </div>
          </div>
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
