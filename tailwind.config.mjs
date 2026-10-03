// tailwind.config.mjs
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#F4F7F5',
          100: '#E4ECE8',
          200: '#D5E2DC',
          300: '#B8CEC5',
          800: '#233831',
          900: '#172520',
        },
        ivory: {
          50: '#FCFAF7',
          100: '#F7F4EE',
          200: '#EFECE4',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Jost"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};