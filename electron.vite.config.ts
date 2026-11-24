import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import { buildCsp } from './src/main/security-policy'

/**
 * Production pages are loaded from file://, where response headers set by
 * `webRequest.onHeadersReceived` are not guaranteed. The same CSP is therefore also
 * written in a meta tag at build time (without `frame-ancestors`, which a meta tag
 * cannot carry). In development the header set by the main process applies.
 */
function cspMetaTag(): Plugin {
  return {
    name: 'shakery-csp-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: () => [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: buildCsp('production', { forMetaTag: true }),
          },
          injectTo: 'head-prepend',
        },
      ],
    },
  }
}

export default defineConfig({
  main: {},
  preload: {
    build: {
      // A sandboxed preload can only require 'electron': bundle everything else.
      externalizeDeps: false,
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
        '@core': resolve('src/core'),
      },
    },
    plugins: [react(), tailwindcss(), cspMetaTag()],
    build: {
      sourcemap: false,
      // electron-vite does not minify by default; a smaller bundle parses faster at startup.
      minify: true,
      rollupOptions: {
        // The interface, and the start-up window shown while the notebook opens (D-056).
        input: {
          index: resolve('src/renderer/index.html'),
          splash: resolve('src/renderer/splash.html'),
        },
      },
    },
  },
})
