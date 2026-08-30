# Speak Up

Bilingual marketing site for a speech & language therapy clinic in Tirana,
built with [Astro](https://astro.build) and deployed as static HTML.

- **Albanian** is the default locale, served at `/`
- **English** is served at `/en/`
- **Blog** posts are fetched from a separate admin site at build time
- **Contact form** posts enquiries to that same admin site from the browser
- **Booking calendar** reads live availability from it and books against it

---

## Quick start

```bash
npm install
cp .env.example .env    # or copy it in Explorer / `Copy-Item` in PowerShell
npm run dev             # http://localhost:4321
```

| Command | Does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve the built output locally |
| `npm run check` | Astro + TypeScript diagnostics |

### You need a `.env` before `npm run build` works

A **production build refuses to run without `BLOG_API_URL`**, on purpose: a
build that quietly produced a site with no blog posts would be worse than a
build that fails. Until the admin API exists, tell it to use the bundled sample
posts by putting this in a `.env` file in the project root:

```
BLOG_ALLOW_FIXTURES=1
```

`.env` is gitignored, so it never reaches the repo or the deployed site —
production values are set as environment variables on DigitalOcean instead.

> Do **not** try `BLOG_ALLOW_FIXTURES=1 npm run build`. That inline syntax is
> bash-only and fails in PowerShell, which is why `.env` is the recommended
> route on Windows.

`.env.example` lists every variable the project reads, with notes on which are
required in production.

---

## ⚠️ Before launch

The clinic's real copy is now in place across the home and about pages. What
remains outstanding:

### Must be supplied by the client

| What | Where | Status |
|---|---|---|
| **Phone number** | `src/site.config.ts` → `phone` | placeholder `069 000 0000` |
| **Griselda Çela's number** | `src/site.config.ts` → `phone2` | empty — requested, never supplied; hidden until filled |
| **Email** | `src/site.config.ts` | placeholder `pershendetje@speakup.al` |
| **Address** | `src/site.config.ts` | placeholder `Rr. Myslym Shyri 24` |
| **Opening hours** | `src/i18n/*.json` → `foot_hours` | placeholder |
| **Licence number** | `src/i18n/*.json` → `facts[3]` | placeholder `Nr. 4821`, shown in the footer |
| **Testimonial wording** | `src/i18n/*.json` → `testimonials.items[].quote` | **the five names are real, the five quotes are written by me** |
| **Dea Fezollari's bio** | `src/i18n/*.json` → `about.staff[1]` | only name and role supplied |
| **Photography** | `src/assets/photos/` | **19 slots, all empty** — see that folder's README |
| **Instagram URL** | `src/site.config.ts` → `SOCIALS` | empty — icon hidden until set |
| **TikTok URL** | `src/site.config.ts` → `SOCIALS` | found by search, **unconfirmed** |
| **Contact endpoint** | `PUBLIC_CONTACT_API_URL` env var | unset — form cannot send |
| **Booking endpoint** | `PUBLIC_BOOKING_API_URL` env var | unset — calendar runs in demo mode |
| Bookable services | `src/i18n/*.json` → `booking.services` | drafted from the therapy list, confirm with the clinic |
| **Canonical domain** | `SITE_URL` env var | `https://speakup.al` |
| Practical details on the clinic page | `src/i18n/*.json` → `clinic.practical` | parking, prams, siblings — invented for layout |
| Building entrance note | `src/i18n/*.json` → `contact.mapNote` | invented for layout |

### Needs a native speaker's review

**Every English string is my translation.** The client supplied the copy in
Albanian only. The Albanian is theirs, transcribed as written (with obvious
typos corrected — `detajtuar`→`detajuar`, `pqcientëve`→`pacientëve`,
`gjithëperfshirse`→`gjithëpërfshirëse`, `brënda`→`brenda`, `qëndrës`→`qendrës`,
`Mutidisiplinar`→`Multidisiplinar`, and similar). The English in `en.json`
should be read through by someone fluent before launch — clinical terminology
especially.

### Testimonials

The five names — Denisa Canaj, Bledi Dukaj, Aurora Beqiri, Mira Musaj, Elona
Demiri — are the real ones the client gave. **The quotes attributed to them are
placeholder text I wrote.** Publishing invented words under a real person's name
is not acceptable, so these must be replaced with what those parents actually
wrote before the site goes live.

They render with initials rather than photographs, deliberately: families should
not appear on the site without consent.

### Content the design invented, now removed

The original mockup contained marketing copy that was never the clinic's. With
the real copy in place, these sections are no longer on the home page:

- **"Sound of the week"** — the interactive sound picker (`SoundOfTheWeek.astro`)
- **"What we do in the room"** — three cards (`WhatWeDo.astro`)
- **"The star chart"** — the 6-of-10 rewards panel (`StarChart.astro`)
- **"The serious part, briefly"** — the price/licence strip (`ParentFacts.astro`)

**The components are still in the repo** and their copy is still in the two JSON
files, so any of them can be put back by adding one line to `HomePage.astro`.
Nothing was deleted. The star chart and the sound picker in particular are
working, designed features — they were dropped only because their *content* was
invented, not because they stopped working.

Note the footer still shows the placeholder licence number from `facts[3]`, even
though the strip that used to display it is gone.

---

## Project structure

```
src/
  components/       one component per section, each with scoped styles
    Header · Hero · Mascot · Cta · Footer
    Services          the two tabbed service groups
    Voice · Therapies · Portfolio · Testimonials · Team
    Room              teaser linking through to the clinic page
    HomePage          composes the sections; shared by both locales
    AboutPage · ClinicPage · PhotoSlot
    BlogIndex · BlogCard · BlogPost
    ContactPage · ContactForm · ThanksPage
    Logo · SocialIcon
    SoundOfTheWeek · WhatWeDo · StarChart · ParentFacts
                      unused — see "Content the design invented" above
  assets/logo.avif  the client's logo, processed through astro:assets
  assets/photos/    client photography — drop files here, see its README
  content.config.ts blog collection schema (the admin API's contract)
  data/             blog fixtures for local development
  i18n/
    sq.json         Albanian copy — no strings are hardcoded in components
    en.json         English copy
    utils.ts        locale resolution, URL mirroring, date formatting
  layouts/Base.astro  <head>, fonts, meta, hreflang, header + footer
  lib/blog-loader.ts  fetches posts from the admin API at build time
  pages/
    index.astro          /                        (sq home)
    blog/index.astro     /blog/                   (sq blog index)
    blog/[slug].astro    /blog/…/                 (sq posts)
    rezervo/             /rezervo/                (sq booking)
    rreth-nesh/          /rreth-nesh/             (sq about)
    klinika/             /klinika/                (sq clinic tour)
    kontakt/             /kontakt/                (sq contact + thank-you)
    en/index.astro       /en/                     (en home)
    en/blog/…            /en/blog/…               (en blog)
    en/booking/          /en/booking/             (en booking)
    en/about/            /en/about/               (en about)
    en/the-clinic/       /en/the-clinic/          (en clinic tour)
    en/contact/          /en/contact/             (en contact + thank-you)
    404.astro
  styles/
    tokens.css      colour, radius, shadow, type and layout tokens
    global.css      resets, shared primitives, keyframes
  site.config.ts    phone, email, address
```

---

## What is on each page

**Home** (`/`, `/en/`)

1. Hero — "Mirësevini në Speak Up Clinic"
2. **Services** — two groups, children and adults, three tabs each
3. **Everyone deserves a voice** — the three things the clinic offers
4. **Therapies** — the six therapy types
5. **Portfolio** — four photo slots
6. **Testimonials** — five parent reviews
7. **Team** — the two specialists, linking to the about page
8. The clinic — teaser linking to the clinic tour
9. CTA — "Rezervo një konsultë"

**About** (`/rreth-nesh/`, `/en/about/`) — history from August 2019, the journey
stats (6 years / 500+ cases / …), "more about us", and full staff bios including
Griselda Çela's education, training and experience.

**Clinic** (`/klinika/`, `/en/the-clinic/`) — the photo tour of the space.

**Booking** (`/rezervo/`, `/en/booking/`) — the calendar. Every "book" call to
action on the site points here.

**Contact** (`/kontakt/`, `/en/contact/`) — details and the enquiry form.

**Blog** (`/blog/`, `/en/blog/`) — posts from the admin API.

---

## How the two languages work

Astro's i18n routing is configured with `defaultLocale: 'sq'` and
`prefixDefaultLocale: false`, so Albanian has no URL prefix.

Components never hardcode copy. Each one reads its strings through:

```astro
---
import { useCopy } from '../i18n/utils';
const { locale, t } = useCopy(Astro.currentLocale);
---
<h2>{t.what_h2}</h2>
```

`sq.json` defines the shape and `en.json` must mirror it — a missing key is a
type error at build time, not a blank space on the page.

The header language switch is **two plain `<a>` links** to the counterpart URL,
with `hreflang`, `lang` and `aria-current`. No client-side routing. A ~10-line
script re-attaches the current `#hash` when JavaScript is available; without
it the links still work, just landing at the top of the page.

### Localised URLs

Slugs differ per language where the word does — `/kontakt/` in Albanian,
`/en/contact/` in English. The mapping lives in one place, `ROUTES` in
`src/i18n/utils.ts`:

```ts
export const ROUTES = {
  home:    { sq: '/',                      en: '/' },
  blog:    { sq: '/blog/',                 en: '/blog/' },
  contact: { sq: '/kontakt/',              en: '/contact/' },
  thanks:  { sq: '/kontakt/faleminderit/', en: '/contact/thank-you/' },
};
```

`routePath(key, locale)` builds a link; `mirrorPath()` resolves a page to its
counterpart for the language switch and the `hreflang` alternates. Add a route
here and both follow automatically — nav entries reference a `route` key rather
than a hardcoded path.

**Pages with no true counterpart** pass their own `altPath` to `Base`. Blog
posts are the case that matters: posts are per-locale, so an Albanian post
usually has no English twin. Its language switch points at the English blog
index rather than a URL that would 404 — unless a translated post with the same
slug exists, in which case it links straight to it.

### The h1 highlight pill

The headline's highlighted word is three separate keys — `h1a`, `h1word`,
`h1b` — so each language can put the pill on a word that makes grammatical
sense. `h1b` is an empty string in English, which is expected.

---

## The blog

**Read [docs/ADMIN-API.md](docs/ADMIN-API.md) before building the admin site.**
It is the full contract: endpoint, response shape, every field, and the
behaviour around drafts, scheduling and locales.

The short version:

- The site is static. Posts are fetched **once, at build time**, from
  `BLOG_API_URL`, and baked into HTML.
- **Publishing a post therefore requires a rebuild.** The admin triggers one
  with a single API call — see
  [docs/DEPLOY-DIGITALOCEAN.md](docs/DEPLOY-DIGITALOCEAN.md).
- Posts are **per-locale**: each post declares `locale: "sq"` or `"en"` and
  appears only in that language's index. Translation is never required.
- Drafts and future-dated posts are filtered out.
- A post that fails validation is skipped with a warning; an **unreachable API
  fails the build**, so a broken admin can never quietly publish an empty blog.

Post bodies are Markdown by default (set `bodyFormat: "html"` to send HTML)
and are rendered through Astro's own Markdown pipeline at build time.

---

## The clinic page

`/klinika/` and `/en/the-clinic/` — a photo tour of the space, for parents to
show a child before the first visit. Intro, a six-slot gallery with captions, a
practical strip (address, parking, prams, siblings), then a booking CTA.

**Every photo is a placeholder right now** — see [Photography](#photography).
Captions, alt text and the practical details live under `clinic` in the two copy
files; the practical values are placeholders the client must confirm.

Two links were rewired to point here: the **"Dhoma" / "The room" nav item**,
which previously jumped to the home-page anchor, and a **"See the whole clinic"**
link at the end of the home page's room section. The home section itself is
otherwise unchanged.

---

## Photography

All client photographs live in **one folder**, `src/assets/photos/`, and are
resolved by **filename** — there is no list to maintain in code.
`PhotoSlot.astro` globs the folder at build time and matches each slot's `name`:

```astro
<PhotoSlot name="therapy-room" alt="…" ratio="4 / 3" />
```

Drop `therapy-room.jpg` (or `.png`, `.webp`, `.avif`) into the folder and the
placeholder is replaced by a responsive `<img>` with a 480/720/1080/1440
`srcset`, optimised through `astro:assets`. Nothing else changes, and a missing
file can never break the build.

Until a file lands, the slot renders a labelled placeholder naming the exact
path it is waiting for, tinted with one of the three brand colours — chosen
deterministically from the name, so a gallery of placeholders reads as distinct
frames rather than a wall of grey boxes.

`src/assets/photos/README.md` lists every expected filename and carries the
shoot guidance — including that **no identifiable child should appear without
written parental consent for web use**.

Blog cover images are the exception: they are remote URLs from the admin's media
store and render as plain `<img>`, because the build cannot import a remote file
as a local asset.

---

## The booking calendar

**Read [docs/BOOKING-API.md](docs/BOOKING-API.md) before building the endpoints.**

`/rezervo/` and `/en/booking/`. Four steps on one page — service, day, time,
details — with a running summary that gates the submit button until all three
choices are made.

This is the **only** part of the site that reads live data at runtime:

| Feature | Talks to the admin | Why |
|---|---|---|
| Blog | build time (`GET`) | posts change rarely; a rebuild is fine |
| Contact form | runtime (`POST`) | nothing to read |
| **Booking** | **runtime `GET` and `POST`** | **availability changes on every booking** |

A slot booked at 10:01 must be gone at 10:02, and a static site only rebuilds
on demand — so the browser fetches availability directly.

Things worth knowing about the implementation:

- **Dates are built from the local calendar, never `toISOString()`.** In
  Albania (UTC+1/+2) `new Date(y, m, d).toISOString().slice(0,10)` returns the
  *previous* day. That one line would have shifted every booking by 24 hours.
- **409 is handled as a first-class case.** Two parents can pick the same slot
  seconds apart. On a 409 the page says the time has just gone, refetches
  availability and lets them choose again, keeping everything they typed.
- **A fully-booked month auto-advances**, up to three months, rather than
  presenting an empty grid with no explanation. Manual navigation switches that
  off so the visitor's own choice of month is never overridden.
- **Keyboard accessible**: arrow keys move through the grid, Home/End jump to
  the ends, and focus is restored after each selection — the grid is rebuilt on
  every choice, which would otherwise dump focus onto `<body>`.
- **Times are opaque `HH:MM` strings on the wire**, formatted per locale for
  display (`14:00` vs `2:00 pm`). Slot length can change server-side without
  touching the site.
- **Month and weekday names come from the copy files, not `Intl`.** A browser
  without Albanian locale data silently falls back to English month names, which
  is what happened in testing. `booking.months` and `booking.weekdaysFull` in
  the two JSON files are the source of truth, so the calendar reads correctly
  everywhere and the clinic can adjust the wording. Times are formatted by hand
  for the same reason.
- **Styles for the cells are `:global()` under `.grid`, on purpose.** Astro
  scopes CSS with a `data-astro-cid-*` attribute stamped on template elements
  at build time. The calendar cells, time slots and retry button are built with
  `createElement`, so they never get that attribute and a plain scoped `.day {}`
  compiles to `.day[data-astro-cid-x]`, which matches nothing — the cells render
  completely unstyled. Anchoring on a parent that *is* in the template
  (`.grid :global(.day)`) keeps them scoped in practice while actually matching.
  **Any new element the script creates needs the same treatment.**

### Demo mode

With `PUBLIC_BOOKING_API_URL` unset the calendar generates its own availability
so the page can be designed and reviewed before the API exists. A prominent
banner says so in the visitor's language, the build logs a warning, and
submitting sends nothing and points at the phone number instead.

---

## The contact form

**Read [docs/CONTACT-API.md](docs/CONTACT-API.md) before building the endpoint.**

The contact page lives at `/kontakt/` and `/en/contact/`: clinic details on a
dark panel (sticky on desktop) beside the form, with a maps link and the phone
number always one tap away.

Because the site is static, the form is submitted **from the visitor's browser**
to `PUBLIC_CONTACT_API_URL` on the admin — there is no server here to post to.
Consequences worth knowing:

- **The endpoint URL is public**, by necessity: it is in the page source. There
  is no token to send, so **all abuse protection must be server-side**. The form
  ships a honeypot field and a "time to submit" stamp for the endpoint to check.
- **CORS matters.** The request is JSON, so it is preflighted; the admin must
  answer `OPTIONS`. This is the single most likely thing to go wrong first.
- **It works without JavaScript.** The form has a real `action` and `method`, so
  a no-JS submission is a normal browser POST; the endpoint redirects to
  `/kontakt/faleminderit/` (or `/en/contact/thank-you/`), which exist as real
  pages. With JS, submission is intercepted and the success panel replaces the
  form in place.
- **If `PUBLIC_CONTACT_API_URL` is unset** the build still succeeds but logs a
  warning, and the form renders with no `action` and refuses to submit — rather
  than silently POSTing back to the page it is on.

Validation is native constraint validation surfaced inline (not as browser
tooltips), errors clear as the visitor fixes them, and a failed send keeps
everything they typed.

---

## The logo

The client's mark lives at `src/assets/logo.avif` and renders through
`Logo.astro` in the header.

It is in `src/assets/`, **not** `public/`, so that `astro:assets` processes it.
That matters here: the supplied master is **4158×2944** — roughly 12 megapixels
for a mark that renders at 38px. Served straight from `public/` every visitor
would decode the full thing. Through `astro:assets` it comes out as a 1.0 KB
WebP with a 1.8 KB 2x variant, with `width`/`height` set so there is no layout
shift. WebP rather than AVIF is Astro's default output and has slightly wider
browser support than the AVIF source.

The file was also **trimmed of its transparent padding**, which was asymmetric
(507px left, 374px right) and would have pushed the mark visibly off-centre in
its box. Spacing is now controlled in CSS.

The logo is decorative in the header (`alt=""`): the "Speak Up" wordmark beside
it already names the link, so giving both the same text would make a screen
reader announce the brand twice.

### Favicons

`public/favicon-32.png`, `favicon-192.png`, `favicon-512.png` and
`apple-touch-icon.png` are generated from the same mark. The apple-touch icon is
flattened onto `--paper` because iOS composites transparency onto black.

To regenerate them after a logo change, they are plain resizes of
`src/assets/logo.avif` padded to a square, at 88% of the box so the mark has
breathing room.

### Where the logo is *not* used

The **footer** and the **contact page's details panel** are `--deep` brown. The
logo's dark bubble (`#4C3F2C`) and its near-black outline (`#231F20`) both
disappear against that background, so in the footer the mark sits on a
paper-coloured tile instead.

The **mascot** is not the logo — it is built from the same two-bubble idea in
CSS so that it can blink, float, follow the pointer and hop. Swapping it for the
image would make all of that impossible. Note that the real mark has a heavy
dark outline the mascot does not; adding a matching outline to the mascot is a
small change if you want the two to read as more obviously related.

---

## The footer

Four columns: brand and social links, site navigation, contact details, then
opening hours and the licence. It collapses to two columns at 900px and one at
520px. The nav column is generated from the **same `nav.items`** the header
uses, so a route added to `ROUTES` appears in both.

The year in the copyright is generated at build time rather than hardcoded.

**Social links are data, not markup.** `SOCIALS` in `src/site.config.ts` lists
Facebook, Instagram and TikTok; **an entry with an empty URL is not rendered at
all**, so an unknown profile leaves no dead link or broken icon behind. Only
Facebook is confirmed — see the before-launch list above for the other two.

Brand glyphs come from [Simple Icons](https://simpleicons.org), which are CC0
(public domain), so they are inlined in `SocialIcon.astro` with no attribution
requirement and inherit `currentColor`. Each link carries an `aria-label` like
"Speak Up on Facebook" — the SVG itself is `aria-hidden`.

The logo sits on a **paper-coloured tile** here, for the contrast reason above.

---

## Design fidelity

Colours, type scale, radii, shadows and animation timings come from the design
handoff and are final. They live as custom properties in
`src/styles/tokens.css` — change them there, not in components.

The prototype used inline styles because of its authoring constraints; this
build uses scoped `<style>` blocks per component instead.

### Container width

`--container` is `clamp(1140px, 88vw, 1500px)` rather than a fixed 1140px, so
large screens get more of the page. Below ~1300px the layout is pixel-identical
to the handoff; above it the content area grows by up to ~360px. The gutter is
deliberately left at the handoff's `clamp(20px, 4vw, 44px)` — widening it too
would have eaten back the width the larger container exists to provide.

The mascot and the grid gaps have matching raised upper bounds so the hero
scales into the extra space instead of stranding the mascot in it.

### Motion

The design is deliberately playful, so there is a fair amount of movement.
All of it is optional — see
[Things this build adds over the prototype](#things-this-build-adds-over-the-prototype).

| Where | What |
|---|---|
| Mascot | Floats and blinks; **eyes follow the pointer** (max 4px); **click or tap it** and it hops with a wider grin |
| Hero | Headline highlight pill rocks slowly; trust chips stagger in and tilt on hover |
| Background | Five coloured bubbles drift slowly behind the mascot |
| Stickers | Bob and tilt on two out-of-step clocks, so no two ever sync |
| Sound picker | Active letter shakes; the word bubble pops with an overshoot; the spelled-out syllables land one at a time, as if being sounded out |
| Cards | Blobs continuously morph shape; number badge scales and tilts on hover; cards lift onto a deeper shadow |
| Star chart | Stars pop in **as the panel scrolls into view** (0.09s apart), then twinkle slowly; hovering a star tilts it |
| Room | Bullet dots pulse on offset timers; the photo zooms gently on hover |
| CTA | The mini mascot bobs and blinks, and leans in when the box is hovered |
| Every section | Rises gently into place on scroll |

**Scroll reveal** is animation-based rather than transition-based, because
several revealed elements also carry their own hover `transform`/`transition`
(the cards, the room photo) and a transition-based reveal on the same element
collides with them. `animation-fill-mode: backwards` hands each element back to
its normal styles once it has played.

Reveal targets are hidden only under a `.js` class set by an inline script in
`Base.astro`, so **with JavaScript off nothing is ever left invisible.**

### Things this build adds over the prototype

- **Reduced motion.** Every animation — the original `float`, `blink` and
  `pop` plus all of the above — is wrapped in
  `@media (prefers-reduced-motion: no-preference)`. The pointer-tracking and
  hop are additionally gated behind a `matchMedia` check in JS, so they never
  run for someone who has asked for less motion.
- **Responsive layout below 900px.** The prototype was desktop-only. Hero
  collapses to one column with the mascot above the text, the sound picker's
  letter rail becomes a horizontal row, cards go to one column, the parents
  strip to 2×2 then 1.
- **A real mobile menu.** Below 860px the nav becomes a `<details>` disclosure
  that works without JavaScript, replacing the prototype's horizontally
  scrolling nav. The language switch and booking CTA stay visible at every
  width.
- **44px minimum tap targets** on the sound buttons, language switch, phone
  number and menu.
- **Accessibility.** The mascot is `aria-hidden`; the star chart has a
  screen-reader text equivalent; the sound picker uses real `<button>`s with
  `aria-pressed`; there is a skip link and a visible focus ring throughout.

### A note on the gold

`#F0B01F` fails contrast as text on cream. In this design it is only ever a
**background** behind `--ink`. Keep it that way. The darker `#A9700B`
(`--eyebrow`) is the gold that is safe for small text on `--paper`.

---

## Deployment

DigitalOcean App Platform, as a static site. `.do/app.yaml` is the app spec;
[docs/DEPLOY-DIGITALOCEAN.md](docs/DEPLOY-DIGITALOCEAN.md) covers first deploy,
the publish→rebuild trigger, environment variables, and a Droplet + nginx
alternative.

Environment variables needed at build time:

| Variable | Required | Purpose |
|---|---|---|
| `BLOG_API_URL` | yes in production | The admin's posts endpoint |
| `BLOG_API_TOKEN` | if the API is authenticated | Sent as `Authorization: Bearer …` |
| `PUBLIC_CONTACT_API_URL` | yes in production | Contact form endpoint. Public by design — appears in page source |
| `PUBLIC_BOOKING_API_URL` | yes in production | Booking API base. Public by design; unset means demo mode |
| `SITE_URL` | yes | Canonical URLs, hreflang, sitemap |
| `BLOG_ALLOW_FIXTURES` | dev/CI only | Build from fixtures if the API is down |

---

## Reference

The original design handoff and prototype are in `_mockups/` (gitignored). The
prototype's `image-slot.js` was reference only and is deliberately not ported.
