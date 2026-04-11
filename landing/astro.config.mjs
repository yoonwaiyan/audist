import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

const owner = 'yoonwaiyan'
const repo = 'audist'
const site = `https://${owner}.github.io`
const base = process.env.GITHUB_ACTIONS ? `/${repo}` : '/'

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
