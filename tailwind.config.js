/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        border: "hsl(214.3 31.8% 91.4%)",
        ring: "hsl(221.2 83.2% 53.3%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(222.2 84% 4.9%)",
        primary: { DEFAULT: "hsl(222.2 47.4% 11.2%)", foreground: "hsl(210 40% 98%)" },
        muted: { DEFAULT: "hsl(210 40% 96.1%)", foreground: "hsl(215.4 16.3% 46.9%)" },
        accent: { DEFAULT: "hsl(221.2 83.2% 53.3%)", foreground: "hsl(210 40% 98%)" },
        destructive: { DEFAULT: "hsl(0 84.2% 60.2%)", foreground: "hsl(210 40% 98%)" },
        success: { DEFAULT: "hsl(160 60% 45%)", foreground: "hsl(160 60% 15%)" },
        warning: { DEFAULT: "hsl(38 92% 50%)", foreground: "hsl(38 92% 20%)" },
        card: { DEFAULT: "hsl(0 0% 100%)", foreground: "hsl(222.2 84% 4.9%)" },
      },
      borderRadius: { lg: "0.75rem", md: "0.625rem", sm: "0.5rem" },
    },
  },
  plugins: [],
};
