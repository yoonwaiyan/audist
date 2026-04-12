# Audist Landing Site

Standalone Astro site for the Audist marketing pages, hosted from the same repository as the desktop app.

## Local development

```bash
cd landing
npm install
npm run dev
```

The site builds at `/` locally. In GitHub Actions it automatically switches to the `/audist/` base path required for GitHub Pages project sites.

## Build

```bash
cd landing
ASTRO_TELEMETRY_DISABLED=1 npm run check
ASTRO_TELEMETRY_DISABLED=1 npm run build
```

## Deployment

Deployment is handled by `.github/workflows/landing-pages.yml`.

- Pushes to `main` that touch `landing/**` rebuild the site
- Published GitHub releases rebuild the site so download links and release notes stay current
- The workflow uses the GitHub Pages artifact deployment flow, which is GitHub's current recommended setup for static sites

Repository setting required:

- Settings -> Pages -> Source: `GitHub Actions`
