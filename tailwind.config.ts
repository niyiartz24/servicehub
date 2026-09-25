import type { Config } from "tailwindcss";
import { brand } from "./src/config/brand";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: brand.colors.navy,
        charcoal: brand.colors.charcoal,
        surface: brand.colors.surface,
        line: brand.colors.border,
        accent: { DEFAULT: brand.colors.accent, soft: brand.colors.accentSoft },
        ink: brand.colors.text,
        muted: brand.colors.muted,
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
