import "server-only";

/** Boundary for a future registrar API. V1 is manual: an admin checks availability and buys the domain. */
export interface DomainRegistrar {
  readonly name: string;
  checkAvailability(domain: string): Promise<{ available: boolean; priceKobo?: number }>;
  register(input: { domain: string; years: number }): Promise<{ registrarRef: string }>;
}

export const manualRegistrar: DomainRegistrar = {
  name: "manual",
  async checkAvailability() { throw new Error("No registrar API configured: check availability manually."); },
  async register() { throw new Error("No registrar API configured: purchase the domain manually."); },
};

export const getRegistrar = (): DomainRegistrar => manualRegistrar;
