"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NetworkProvider } from "@/contexts/NetworkContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThirdwebProvider>
      <NetworkProvider>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </NetworkProvider>
    </ThirdwebProvider>
  );
}
