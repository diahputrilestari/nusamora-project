import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

/** Halaman fondasi. Landing page penuh dimigrasikan pada Tahap 2. */
export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("hero");
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 text-center">
      <h1 className="text-balance text-4xl font-bold text-royal sm:text-6xl">{t("title")}</h1>
      <p className="mx-auto mt-5 max-w-xl text-lg text-muted-purple">{t("description")}</p>
      <p className="mt-8 inline-flex rounded-full bg-pale px-6 py-3 font-semibold text-deep">{t("cta")}</p>
    </section>
  );
}
