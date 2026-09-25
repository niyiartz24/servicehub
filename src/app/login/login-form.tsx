"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/auth/actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required
          aria-describedby={state.error ? "login-error" : undefined}
          className="w-full rounded-md border border-line bg-charcoal px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
          className="w-full rounded-md border border-line bg-charcoal px-3 py-2 text-sm" />
      </div>
      <a href="/forgot-password" className="block text-xs text-muted hover:text-ink">Forgot your password?</a>
      {state.error && <p id="login-error" role="alert" className="text-sm text-red-300">{state.error}</p>}
      <button disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
