/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig pulls in Astro's Vite plugins so `astro:content` resolves in tests.
export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.{test,spec}.ts'],
  },
});
