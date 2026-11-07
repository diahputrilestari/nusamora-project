import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" };

export function Button({ variant = "primary", className = "", ...rest }: Props) {
  const base = "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60";
  const style = variant === "primary" ? "bg-deep text-white hover:bg-royal" : "border border-deep text-deep hover:bg-pale";
  return <button className={`${base} ${style} ${className}`} {...rest} />;
}
