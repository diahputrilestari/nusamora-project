import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations("navigation");
  return (
    <header className="sticky top-0 z-40 border-b border-soft-lilac bg-lavender-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-deep">nusamora<span className="text-primary">.</span></Link>
        <nav aria-label={t("label")} className="hidden gap-6 text-sm font-medium sm:flex">
          <Link href="/" className="hover:text-deep">{t("home")}</Link>
          {/* Template, Harga, Masuk ditambahkan pada Tahap 2-3 bersama halamannya */}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
