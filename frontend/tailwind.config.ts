import type { Config } from "tailwindcss";

// Design tokens map directly to the CSS variables in app/globals.css, which
// hold the project's warm/light climate-tech palette as plain hex values
// (not HSL triplets) - intentional: this is a single fixed light theme with
// no dark mode, so we don't need the hsl(var(...)) indirection shadcn/ui
// templates normally use for theme-switching. Opacity modifiers like
// `bg-primary/50` are not supported as a result; the palette doesn't need them.
const config: Config = {
  darkMode: ["class"], // present so shadcn-generated component code compiles; unused, no .dark theme is defined
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          light: "var(--primary-light)",
        },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          light: "var(--accent-light)",
        },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      boxShadow: {
        // One deliberately subtle card shadow - the spec asks not to overuse shadows.
        card: "0 1px 2px 0 rgb(38 51 42 / 0.04), 0 1px 3px 0 rgb(38 51 42 / 0.06)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
