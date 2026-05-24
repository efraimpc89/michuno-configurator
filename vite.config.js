import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// Copies dist/index.html → dist/404.html so Cloudflare Pages serves the SPA
// for any unmatched route, without needing _redirects loop-detection workarounds.
const spa404 = () => ({
  name: 'spa-404',
  closeBundle() {
    const src  = path.resolve('dist/index.html')
    const dest = path.resolve('dist/404.html')
    if (fs.existsSync(src)) fs.copyFileSync(src, dest)
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), spa404()],
})
