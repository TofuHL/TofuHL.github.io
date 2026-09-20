# Samma färger

A donor-facing website for **Samma färger**, a Swedish foundation funding
education, shelter, psychosocial support and nutrition programmes for
children affected by the war in Ukraine.

Built with [Astro](https://astro.build) (static output), Chart.js for
accessible data visualisation, and a JSON/Markdown "flat-file CMS" so
non-developers can update campaign figures, team bios and stories without
touching code.

- **Live site:** `https://tofuhl.github.io` (once deployed — see below)
- **Languages:** English (default), Svenska, Українська — `/en/`, `/sv/`, `/uk/`
- **Deploy:** GitHub Pages, via `.github/workflows/deploy.yml`

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # type-checks + builds to dist/
npm run preview  # serve the production build locally
```

`npm run dev` and `npm run build` both run a `pre*` script
(`scripts/generate-csv.mjs` and `scripts/generate-placeholder-pdfs.mjs`)
that regenerates the downloadable CSV/PDF files from the JSON data below, so
they never go stale.

---

## Project structure

```
src/
  components/         Reusable UI (Header, DonationPanel, charts, …)
  components/charts/  Chart.js chart components (accessible: data table + CSV per chart)
  content/            Content collections — the closest thing to a CMS here
    team/             Team member bios (JSON, one file per person)
    partners/         Partner orgs (JSON)
    press/             Press coverage (JSON)
    testimonials/      Donor/partner/family quotes (JSON)
    stories/{en,sv,uk}/  Field story posts (Markdown, per locale)
  data/               Site-wide JSON "settings" — see below
  i18n/               Translation dictionaries + helpers
  layouts/            BaseLayout.astro (head, schema.org, header/footer, cookie banner)
  templates/          One Astro component per page (e.g. HomePage.astro)
  pages/{en,sv,uk}/   Thin per-locale route files that render the templates above
scripts/              Build-time generators (CSV exports, placeholder PDFs)
public/               Static assets, favicon, robots.txt, generated /data and /reports
```

**Why templates + thin page routes?** Astro's built-in i18n routing (with
`prefixDefaultLocale: true`) expects real files under `src/pages/en/`,
`src/pages/sv/`, `src/pages/uk/`. Rather than tripling every page's markup,
each page's real content lives once in `src/templates/*.astro`, and the
three route files per page just import the template and pass a `locale`
prop.

---

## Updating campaign and financial figures

**Nothing about money is hardcoded in a component.** Every number renders
from a JSON file in `src/data/`. Edit the file, commit, and the next deploy
picks it up automatically.

| What | File |
|---|---|
| Live fundraising bar (total raised, goal, donor count, campaign dates) | `src/data/fundraising.json` |
| Homepage impact counters (children supported, meals, kits, shelters) | `src/data/impact-stats.json` |
| "How your donation helps" amount tiers | `src/data/how-it-helps.json` |
| Cumulative funds raised chart | `src/data/chart-funds-over-time.json` |
| Allocation of funds (donut chart) | `src/data/chart-allocation.json` — **must sum to 100** |
| Campaign progress bars | `src/data/chart-campaign-progress.json` |
| Children reached by programme/year | `src/data/chart-children-reached.json` |
| Org timeline | `src/data/timeline.json` |
| Legal identity, board, governance | `src/data/legal.json` |
| Cited statistics on the Mission page | `src/data/stats-sources.json` |
| "Where we work" map markers | `src/data/oblasts.json` |
| Downloadable annual reports/audits | `src/data/reports.json` + files in `public/reports/` |

Every figure that has a `date`/`asOf`/`source` field is shown on the page
with that citation — keep them current when you update a number.

**In production, replace the manual-edit workflow above with a scheduled
job** (e.g. a GitHub Action on a cron trigger, or a webhook from your
payment processor / CRM) that regenerates `fundraising.json` and
`chart-*.json` automatically, so the "live" fundraising bar is actually
live. As shipped, these files are edited by hand or by a script you point
at your donation platform's reporting API.

### Text that lives in translation files, not data files

Chart *labels* (e.g. "Programme delivery", campaign names, programme
names, board roles, oblast names) are translation **keys** referenced from
the JSON above (`labelKey`, `nameKey`, …) and resolved against
`src/i18n/locales/{en,sv,uk}.json`. This keeps one JSON file as the single
source of numbers, translated consistently across all three languages.

---

## Content collections (team, partners, press, testimonials, stories)

These live under `src/content/` and are validated by the schema in
`src/content/config.ts`.

- **team / partners / press / testimonials**: one JSON file per entry.
  Most text fields are `{ en, sv, uk }` objects — fill in all three, or at
  minimum `en` (the site falls back to English if a locale is missing).
- **stories**: Markdown, organised by locale folder
  (`src/content/stories/en/my-post.md`). Frontmatter fields: `title`,
  `summary`, `date`, `author`, `location`, `programme`
  (`education|shelter|psychosocial|nutrition`), `photoAlt`, `featured`.
  The **file name** (slug) must match across locales if you want the
  language switcher to land on the translated version of the same story
  (not currently auto-linked — see Known limitations).

To add a new story, copy an existing `.md` file, change the frontmatter,
and write the body in Markdown.

---

## Translations

- UI chrome (nav, footer, buttons, donation panel, cookie banner, chart
  axis/legend labels, form labels) is **fully translated** in all three
  languages: `src/i18n/locales/en.json`, `sv.json`, `uk.json`. All three
  files are validated to have identical key structures (see
  `npx astro check` and the CI build, which will simply render an empty
  string if a key ever goes missing — there's no build-time key-parity
  check wired up yet, so double-check by eye when adding keys).
- Long-form page prose (mission pillars, principles, policy text, timeline,
  get-involved options, etc.) also lives in those same locale files and is
  fully translated for all three languages.
- **Content collections are partially localised as shipped**: all UI
  and page copy is translated, but only one seed story
  (`school-kits-kharkiv`) has Swedish and Ukrainian translations — the
  other two seed stories exist in English only. Team bios, partner
  descriptions, press headlines and testimonials are translated. Add
  `sv`/`uk` fields (or story files) following the existing pattern as real
  content comes in.
- To add a fourth language: add its code to `locales` in `astro.config.mjs`,
  add `src/i18n/locales/<code>.json` with the same keys as `en.json`, add
  `src/pages/<code>/**` route files (copy an existing locale's routes),
  and add content collection entries for that locale.

---

## Charts and accessibility

Charts (`src/components/charts/*.astro`) are Chart.js, but **the chart
canvas is never the only way to get the data**:

- Canvas is keyboard-focusable (`tabindex="0"`) with a descriptive
  `aria-label` summarising the trend/values.
- Every chart has a `<details>`-collapsed **data table** immediately below
  it (real HTML `<table>`, screen-reader and no-JS friendly).
- Every chart has a **"Download data (CSV)"** link to a file in
  `public/data/`, generated from the same JSON that draws the chart (see
  `scripts/generate-csv.mjs`) — the chart and the download can never drift
  apart.
- The categorical colour palette (`src/components/charts/palette.ts`) was
  chosen and validated for colour-vision-deficiency safety (varies
  lightness, not just hue) — see the palette's own comments for the method.
- Chart animations and the homepage's scroll-triggered fade-ins/count-ups
  all respect `prefers-reduced-motion` and have a hard timeout fallback so
  content is never permanently stuck at "0" or invisible if a browser's
  `IntersectionObserver` behaves unexpectedly.

---

## What's stubbed and needs wiring before a real launch

This is a complete front end with realistic seeded data, but a few things
are deliberately **front-end placeholders** — there is no backend in this
repo, by design (it's a static site):

1. **Payments.** The donation panel (`src/components/DonationPanel.astro`)
   collects amount/frequency/payment-method choices and submits a `GET` to
   `/<locale>/donate/confirmation/` for demonstration. Wire its `<form>`
   submit to real Stripe Checkout / PayPal / Apple Pay / Google Pay / Swish
   integrations — never handle card data directly in this codebase.
2. **Contact form.** `src/templates/ContactPage.astro` prevents default
   submission and shows a local confirmation message. Point it at a real
   backend (Formspree, a serverless function, your CRM's inbound API, …).
3. **Newsletter signup.** Same pattern, in `src/components/Newsletter.astro`
   — wire to your ESP (Mailchimp, Brevo, etc.).
4. **Analytics.** The cookie consent banner
   (`src/components/CookieConsent.astro`) dispatches an
   `analytics-consent-granted` `window` event only after explicit opt-in,
   and no analytics script is loaded before that. Add your privacy-respecting
   analytics provider's snippet as a listener for that event.
5. **Photography.** Every image on the site is a labelled gradient
   placeholder (`src/components/PhotoPlaceholder.astro`), not a stock
   photo — per the safeguarding/no-stock-photo brief. Each placeholder's
   caption describes the real, consented photo it should be replaced with.
   Swap `PhotoPlaceholder` usages for real `<img>` (WebP/AVIF, explicit
   width/height, real alt text) as photography is cleared.
6. **Reports.** `public/reports/*.pdf` are minimal generated placeholder
   PDFs (see `scripts/generate-placeholder-pdfs.mjs`), not real audited
   documents. Replace them and update `src/data/reports.json`.
7. **Social share image.** `public/og-default.svg` is an SVG Open Graph
   image; several platforms (notably Facebook/X) render OG images more
   reliably as PNG/JPG. Export a PNG version before launch.
8. **Registration numbers.** `src/data/legal.json` has placeholder
   organisation/license numbers (`802XXX-XXXX`, `90XX-XXXX`) — replace with
   the real registry entries.
9. **Legal pages.** Draft privacy policy / safeguarding policy copy lives
   on the Transparency page (`#privacy`, `#safeguarding`); have counsel
   review before launch.

---

## Accessibility & compliance notes

- Colour contrast: body text is near-black (`#111418`) on white/off-white;
  secondary text (`#6B7280`) clears WCAG AA (4.5:1) on both background
  tones used.
- Azure/yellow (`#0057B7` / `#F2C200`) are used only as accents (buttons,
  dividers, chart fills) — never as the only carrier of meaning, and never
  as body text colour.
- Keyboard: skip-to-content link, visible focus rings (`:focus-visible`)
  site-wide, a real focus trap in the donation modal, keyboard-operable
  language switcher and mobile menu.
- `prefers-reduced-motion` disables scroll-reveal transitions, chart
  animations, and count-up number animations.
- Cookie banner blocks analytics until explicit consent; no third-party
  trackers are loaded before that point.

Run a Lighthouse pass (`npx astro build && npx astro preview`, then audit
in Chrome DevTools) before launch to confirm ≥90 across all four
categories on production hosting — CDN/caching headers on GitHub Pages
will affect the Performance score more than anything in this repo.

---

## Deployment

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every
push to `main` (or manually via "Run workflow"). One-time setup in the
repo: **Settings → Pages → Source → GitHub Actions**.

The site is configured (`astro.config.mjs`) to deploy at the apex domain
(`https://tofuhl.github.io`, no `/repo-name/` base path), matching a
`<username>.github.io` repository.
