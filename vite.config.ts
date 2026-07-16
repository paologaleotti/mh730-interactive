/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // include: restrict the React Compiler pass to JSX files; the default
    // also feeds plain .ts (stores, configs) through babel for nothing.
    babel({ presets: [reactCompilerPreset()], include: /\.[jt]sx(?:$|\?)/ })
  ],
  test: {
    // Pure-logic tests run in node; DOM tests opt into jsdom via a
    // per-file `// @vitest-environment jsdom` comment.
    environment: 'node',
    globals: false,
  },
})
