export const brand = {
  name: "ServiceHub",
  parent: "SynthaxLab Technologies",
  lockup: "ServiceHub by SynthaxLab Technologies",
  tagline: "Manage your SynthaxLab services in one place.",
  description:
    "Renew domains, hosting, databases and other managed services without the back-and-forth.",
  contact: {
    email: "synthaxlab2025@gmail.com", 
    phone: "",
    website: "",
  },
  invoicePrefix: "SLX-INV",
  paymentPrefix: "SLX-PAY",
  ticketPrefix: "SLX-TKT",
  currency: { code: "NGN", symbol: "₦", locale: "en-NG" },
  // Design tokens are consumed by tailwind.config.ts and globals.css
  colors: {
    navy: "#0B1020",
    charcoal: "#12172A",
    surface: "#171D33",
    border: "#252C47",
    accent: "#6D6AF8",
    accentSoft: "#8B8CFB",
    text: "#F5F7FB",
    muted: "#9AA3BC",
  },
} as const;

export type Brand = typeof brand;

/** Kobo → "₦9,000" (drops .00, keeps kobo when present). */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat(brand.currency.locale, {
    style: "currency",
    currency: brand.currency.code,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: Number.isInteger(naira) ? 0 : 2,
  }).format(naira);
}
