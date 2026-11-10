import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import { tokens, type TokenName } from "./src/ui/tokens";

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
const rgbChannels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");
const color = (name: TokenName) => `rgb(var(--color-${kebab(name)}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // Replaces the default palette: only Sage tokens are available.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      black: "#000000",
      brand: { DEFAULT: color("brand"), hover: color("brandHover"), soft: color("brandSoft"), ink: color("brandInk") },
      page: color("page"),
      surface: color("surface"),
      line: { DEFAULT: color("line"), strong: color("lineStrong") },
      muted: color("muted"),
      ink: color("ink"),
      warn: { DEFAULT: color("warn"), soft: color("warnSoft") },
      danger: { DEFAULT: color("danger"), soft: color("dangerSoft") },
      annot: { pathology: color("annotPathology"), tooth: color("annotTooth") },
    },
    fontFamily: {
      sans: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"],
    },
    fontSize: {
      xs: ["11px", "16px"],
      label: ["11.5px", "16px"],
      sm: ["13px", "18px"],
      base: ["14px", "20px"],
      section: ["15px", "22px"],
      title: ["20px", "28px"],
      display: ["24px", "32px"],
    },
    borderRadius: {
      none: "0",
      sm: "4px",
      DEFAULT: "6px",
      full: "999px",
    },
    extend: {
      maxWidth: { content: "1200px" },
      height: { nav: "52px" },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ":root": Object.fromEntries(
          Object.entries(tokens).map(([k, v]) => [`--color-${kebab(k)}`, rgbChannels(v)]),
        ),
      });
    }),
  ],
} satisfies Config;
