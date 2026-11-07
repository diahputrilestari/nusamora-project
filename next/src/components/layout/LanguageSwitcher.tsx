"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/config/site";

/** Segmented switcher ID | EN. Mempertahankan halaman yang sedang dibuka; next-intl menyimpan pilihan di cookie NEXT_LOCALE. */
export function LanguageSwitcher() {
  const t = useTranslations("language");
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div role="group" aria-label={t("label")} className="inline-flex rounded-full border border-soft-lilac bg-white p-0.5 text-xs font-semibold" data-testid="lang-switcher">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === current}
          disabled={pending}
          onClick={() => start(() => router.replace(pathname, { locale: l }))}
          className={`rounded-full px-3 py-1.5 transition-colors ${l === current ? "bg-deep text-white" : "text-muted-purple hover:bg-pale"}`}
        >
          {t(l)}
        </button>
      ))}
    </div>
  );
}
