"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

/** Error boundary tingkat halaman: pesan generik, tanpa detail internal. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  return (
    <section role="alert" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-royal">{t("errorTitle")}</h1>
      <p className="mt-3 text-muted-purple">{t("errorText")}</p>
      <Button className="mt-6" onClick={reset}>{t("retry")}</Button>
    </section>
  );
}
