import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.ts"],
  theme: {
    extend: {
      colors: {
        // Groupe DPSD brand colors (from the logo)
        brand: {
          orange: "#E96A25",
          "orange-dark": "#D2551A",
          "orange-light": "#FDEFE5",
          blue: "#4D8FD6",
          "blue-dark": "#2F6CB0",
          "blue-light": "#EAF3FC",
          dark: "#2E3238",
        },
      },
    },
  },
  plugins: [],
};

export default config;
