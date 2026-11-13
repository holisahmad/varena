import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        varena: {
          espresso: {
            DEFAULT: "#30241D",
            dark: "#201712",
            light: "#423229",
          },
          gold: {
            DEFAULT: "#B18A55",
            light: "#D6B16C",
            hover: "#9C7642",
          },
          ivory: {
            DEFAULT: "#F5F1E9",
            light: "#FAF7F2",
            surface: "#EFEAE0",
          },
          taupe: {
            DEFAULT: "#75685B",
            light: "#8F8173",
            dark: "#5A4F44",
          },
          dark: "#1A1410",
        },
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "Manrope", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

