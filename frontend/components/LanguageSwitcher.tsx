"use client";

import { useState } from "react";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex items-center gap-2 rounded-full border border-sand/15 px-3 py-1.5 text-xs font-mono text-sand/70 hover:border-gold-500/40"
      >
        🌐 {current.label}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-lg border border-sand/10 bg-indigo-800 shadow-lg z-20 overflow-hidden">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-indigo-900 ${
                l.code === lang ? "text-gold-400" : "text-sand/80"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
