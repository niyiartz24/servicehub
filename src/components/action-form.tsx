"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import type { ActionState } from "@/server/errors";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  submitLabel: string;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
};

/** Keeps user input on error (React 19 would otherwise reset the form), clears it on success. */
export function ActionForm({ action, submitLabel, children, className, confirm }: Props) {
  const [state, dispatch, pending] = useActionState(action, {} as ActionState);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);

  return (
    <form
      ref={ref}
      className={className ?? "space-y-4"}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      {children}
      {state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-300">{state.ok}</p>}
      <button disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
