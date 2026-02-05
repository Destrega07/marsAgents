import type { Config } from "tailwindcss"
import typography from "@tailwindcss/typography"

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        marsBlue: "#0055A4",
        marsGray: "#F3F4F6"
      }
    }
  },
  plugins: [typography]
} satisfies Config
