"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#0B1020", color: "#F5F7FB", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div role="alert" style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
          <p style={{ color: "#9AA3BC" }}>We hit an unexpected problem. Please try again.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px", borderRadius: 6, border: "1px solid #252C47", background: "transparent", color: "inherit" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
