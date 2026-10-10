import "server-only";

export type SendResult = { sent: true; id: string } | { sent: false; reason: "not_configured" | "error"; error?: string };
export type EmailAttachment = { filename: string; content: string }; // content = base64, no data-URI prefix
export type EmailMessage = { to: string; subject: string; html: string; text: string; attachments?: EmailAttachment[] };

/** Thin Resend client over fetch (no SDK dependency). With no API key it logs in dev and reports "not_configured". */
export async function sendEmail(m: EmailMessage): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email not configured] to=${m.to} subject="${m.subject}"${m.attachments?.length ? ` (+${m.attachments.length} attachment(s))` : ""}`);
    }
    return { sent: false, reason: "not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "ServiceHub <onboarding@resend.dev>",
        to: [m.to], subject: m.subject, html: m.html, text: m.text,
        ...(m.attachments?.length ? { attachments: m.attachments } : {}),
      }),
      signal: AbortSignal.timeout(15_000), // a bit longer than plain emails to allow for the attachment
    });
    if (!res.ok) return { sent: false, reason: "error", error: `Resend responded ${res.status}` };
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: json.id ?? "" };
  } catch (e) {
    return { sent: false, reason: "error", error: e instanceof Error ? e.message : "unknown" };
  }
}