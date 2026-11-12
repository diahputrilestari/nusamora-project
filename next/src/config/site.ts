export const locales = ["id", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "id";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Token desain NusaMora (sumber kebenaran ada di globals.css; salinan ini untuk kode TS, mis. metadata). */
export const brand = {
  primary: "#9673D0",
  deep: "#7552A8",
  royal: "#4A356B",
  softLilac: "#D9C9F5",
  pale: "#EEE9FA",
  white: "#FAF8FF",
  midnight: "#302442",
  muted: "#746782",
} as const;
