import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

const owner = 'yoonwaiyan'
const repo = 'audist'
const site = process.env.SITE_URL || `https://${owner}.github.io/${repo}`
const base = '/'

export default defineConfig({
  site,
  base,
  output: 'static',
  integrations: [sitemap()],
  vite: {
    server: {
      host: true
    }
  }
})
