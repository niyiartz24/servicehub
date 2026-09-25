"use client";

import { useEffect, useRef } from "react";

/**
 * Renders as a normal table on md+ and as stacked cards on phones (see .rt in globals.css).
 * On mount it copies each column heading onto its cells as data-label, and restores table ARIA roles
 * (CSS display:block otherwise strips table semantics for some screen readers).
 */
export function ResponsiveTable({ children, empty }: { children: React.ReactNode; empty?: string }) {
  const ref = useRef<HTMLTableElement>(null);
  useEffect(() => {
    const t = ref.current;
    if (!t) return;
    const labels = Array.from(t.querySelectorAll("thead th")).map((th) => th.textContent?.trim() ?? "");
    t.setAttribute("role", "table");
    t.querySelectorAll("thead, tbody").forEach((el) => el.setAttribute("role", "rowgroup"));
    t.querySelectorAll("tr").forEach((tr) => {
      tr.setAttribute("role", "row");
      Array.from(tr.children).forEach((cell, i) => {
        if (cell.tagName === "TH") cell.setAttribute("role", "columnheader");
        else {
          cell.setAttribute("role", "cell");
          if (labels[i]) cell.setAttribute("data-label", labels[i]);
        }
      });
    });
  }, [children]);

  return (
    <div className="rt overflow-x-auto rounded-lg border border-line bg-charcoal">
      <table ref={ref} className="w-full text-left text-sm md:min-w-[640px]">{children}</table>
      {empty && <p className="p-8 text-center text-sm text-muted">{empty}</p>}
    </div>
  );
}
