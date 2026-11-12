import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { GuestPanel } from "@/components/invitation/GuestPanel";
import { getPublicInvitation, httpsUrl, obj, text } from "@/lib/invitation";

type Props = { params: Promise<{ locale: string; slug: string }> };

// Undangan bersifat pribadi: jangan diindeks mesin pencari dan jangan membocorkan referrer tautan tamu.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const inv = await getPublicInvitation(slug);
  return { title: inv ? text(inv.title, 120) || "Undangan" : "Undangan", robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function InvitationPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const inv = await getPublicInvitation(slug);
  if (!inv) notFound();
  const t = await getTranslations("invitation");

  const c = obj(inv.content), names = obj(c.names), ev = obj(c.event), photos = obj(c.photos), feat = obj(c.features);
  const a = text(names.a, 80), b = text(names.b, 80), heading = [a, b].filter(Boolean).join(" & ") || text(inv.title, 120);
  const cover = httpsUrl(photos.cover), maps = httpsUrl(ev.maps);
  const welcome = text(c.welcome, 600), venue = text(ev.venue, 160), address = text(ev.address, 300);
  const when = [text(ev.start, 40), text(ev.end, 40)].filter(Boolean).join(" - ") + (text(ev.start, 40) ? ` ${text(ev.tz, 8)}` : "");
  let dateLabel = "";
  if (inv.event_date && /^\d{4}-\d{2}-\d{2}$/.test(inv.event_date)) {
    const d = new Date(`${inv.event_date}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(d);
  }

  return (
    <article className="mx-auto max-w-2xl px-4 py-10 text-center" data-testid="undangan">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="mx-auto mb-8 max-h-96 w-full rounded-3xl object-cover shadow-lg" loading="eager" referrerPolicy="no-referrer" />
      ) : null}
      <p className="text-sm font-semibold uppercase tracking-widest text-deep">{t("label")}</p>
      <h1 className="mt-3 text-balance text-4xl font-bold text-royal sm:text-5xl" data-testid="undangan-judul">{heading}</h1>
      {dateLabel ? <p className="mt-4 text-lg text-midnight">{dateLabel}</p> : null}
      {when ? <p className="mt-1 text-muted-purple">{when}</p> : null}
      {welcome ? <p className="mx-auto mt-6 max-w-xl whitespace-pre-line text-balance text-muted-purple">{welcome}</p> : null}
      {venue || address ? (
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-soft-lilac bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-deep">{t("place")}</h2>
          {venue ? <p className="mt-2 font-semibold text-royal">{venue}</p> : null}
          {address ? <p className="text-muted-purple">{address}</p> : null}
          {maps ? <a href={maps} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-full bg-pale px-4 py-2 text-sm font-semibold text-deep">{t("openMap")}</a> : null}
        </div>
      ) : null}
      <Suspense fallback={null}>
        <GuestPanel rsvp={feat.rsvp !== false} guestbook={feat.guestbook !== false} />
      </Suspense>
    </article>
  );
}
