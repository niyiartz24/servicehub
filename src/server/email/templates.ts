import { brand } from "@/config/brand";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** All dynamic text is HTML-escaped. Only paths starting with "/" are turned into links. */
export function notificationEmail(n: { title: string; body: string; link?: string | null }) {
  const app = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = n.link && n.link.startsWith("/") ? `${app}${n.link}` : null;
  const subject = `${n.title} · ${brand.name}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0B1020">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:8px;border:1px solid #e3e6ee">
<tr><td style="padding:24px 28px;border-bottom:1px solid #e3e6ee"><strong style="font-size:16px">${esc(brand.name)}</strong> <span style="color:#6b7385;font-size:13px">by ${esc(brand.parent)}</span></td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 12px;font-size:18px">${esc(n.title)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#2a3147">${esc(n.body)}</p>
${url ? `<a href="${esc(url)}" style="display:inline-block;background:#6D6AF8;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px">Open in ${esc(brand.name)}</a>` : ""}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e3e6ee;font-size:12px;color:#6b7385">${esc(brand.lockup)}. You can turn off these emails in your account settings.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${n.title}\n\n${n.body}\n\n${url ?? ""}\n\n${brand.lockup}`;
  return { subject, html, text };
}
