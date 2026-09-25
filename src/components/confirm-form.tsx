"use client";

/** One-click destructive/state-changing action with a confirmation step.
 *  Uses the native confirm dialog for now; swap for shadcn AlertDialog later. */
export function ConfirmForm({
  action, message, label, hidden, danger,
}: {
  action: (fd: FormData) => Promise<void>;
  message: string;
  label: string;
  hidden: Record<string, string>;
  danger?: boolean;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button className={`rounded-md border px-3 py-1.5 text-sm hover:bg-surface ${danger ? "border-red-500/40 text-red-300" : "border-line"}`}>
        {label}
      </button>
    </form>
  );
}
