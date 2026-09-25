import { reportError } from "@/lib/monitoring";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProductionEnv } = await import("@/lib/env");
    assertProductionEnv(); // fail fast at boot, not on the first customer payment
  }
}

/** Next.js calls this for every unhandled server error. reportError is the single place to add Sentry later. */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  reportError(error, { source: "onRequestError", path: request.path, method: request.method, route: context.routePath, type: context.routeType });
}
