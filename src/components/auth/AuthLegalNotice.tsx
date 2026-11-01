import React from "react";
import { useTranslation } from "@/contexts/LanguageContext";

export function AuthLegalNotice() {
  const t = useTranslation();

  return (
    <footer className="px-8 pb-6 pt-2">
      <p className="mx-auto max-w-md text-center text-xs leading-relaxed text-muted-foreground">
        {t.auth.legalNotice}
      </p>
    </footer>
  );
}
