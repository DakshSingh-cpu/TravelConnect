import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'teal-brand': '#0F6E56',
        'teal-light': '#E1F5EE',
        'cream': '#F9F6F1',
        'ink': '#1C1917',
        'muted': '#78716C',
        'gold': '#BA7517',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '4px',
      },
    },
  },
  plugins: [],
}
export default config
