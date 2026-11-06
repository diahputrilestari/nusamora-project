import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-royal">{t("notFoundTitle")}</h1>
      <p className="mt-3 text-muted-purple">{t("notFoundText")}</p>
      <Link href="/" className="mt-6 inline-flex rounded-full bg-deep px-5 py-2.5 font-semibold text-white">{t("backHome")}</Link>
    </section>
  );
}
