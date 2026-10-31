// @ts-check
import { defineConfig } from 'astro/config';

// Dominio custom: https://thawalife.com (public/CNAME)
export default defineConfig({
  site: 'https://thawalife.com',
  base: '/',
  trailingSlash: 'always',
});
