// @ts-check
import { defineConfig } from 'astro/config';

// Pages: https://thawalife.github.io/walife-portfolio/ (nessun dominio custom per ora)
export default defineConfig({
  site: 'https://thawalife.github.io',
  base: '/walife-portfolio',
  trailingSlash: 'always',
});
