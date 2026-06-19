import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        status: {
          red: '#EF4444',
          orange: '#F97316',
          yellow: '#EAB308',
          lightgreen: '#22C55E',
          green: '#16A34A',
        },
        pastel: {
          red: '#FEE2E2',
          orange: '#FFEDD5',
          yellow: '#FEF9C3',
          lightgreen: '#DCFCE7',
          green: '#BBF7D0',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
