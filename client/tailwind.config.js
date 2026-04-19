/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        felt:   '#1a4731',
        feltDk: '#122e20',
        gold:   '#f5c842',
        chip:   '#e63946',
      },
    },
  },
  plugins: [],
};
