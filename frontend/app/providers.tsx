"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { LanguageProvider } from "@/contexts/LanguageContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThirdwebProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThirdwebProvider>
  );
}
