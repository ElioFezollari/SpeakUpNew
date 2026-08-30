# Blog API contract

The Astro site is **static**. It has no database and no server at runtime.
Blog posts are fetched from the admin site **once, during `astro build`**, and
baked into HTML.

That means: **publishing a post in the admin does not change the live site
until the site is rebuilt.** Wiring that up is one HTTP call — see
[DEPLOY-DIGITALOCEAN.md](./DEPLOY-DIGITALOCEAN.md).

```
┌───────────────┐  1. author writes & publishes
│  Admin site   │
│  (your app)   │  2. POST deploy trigger ──────────┐
└───────┬───────┘                                   │
        │ 3. GET /api/posts (build time)            ▼
        │                              ┌────────────────────────┐
        └─────────────────────────────►│  DigitalOcean rebuild  │
                                       │  astro build → dist/   │
                                       └────────────────────────┘
```

---

## The endpoint

One endpoint is all the site needs.

```
GET  {BLOG_API_URL}?status=published&page=1&perPage=100
Authorization: Bearer {BLOG_API_TOKEN}
Accept: application/json
```

`BLOG_API_URL` and `BLOG_API_TOKEN` are set as build-time environment
variables. The token is optional — omit it and no `Authorization` header is
sent — but a public posts endpoint is the simpler and safer choice only if it
exposes nothing but published content.

### Query parameters the loader sends

| Parameter | Value | Meaning |
|---|---|---|
| `status` | `published` | Only published posts. The loader also filters defensively on its own side. |
| `page` | `1`, `2`, … | 1-indexed page number. |
| `perPage` | `100` | Page size the loader asks for. |

If your API ignores pagination and returns everything at once, that works too
— just return fewer than `perPage` items and the loader stops after one
request.

---

## Response shape

The envelope form (recommended):

```json
{
  "posts": [ { "…post…" } ],
  "pagination": { "page": 1, "perPage": 100, "total": 12, "totalPages": 1 }
}
```

A bare array is also accepted:

```json
[ { "…post…" } ]
```

The loader looks for the post array under `posts`, `data`, `items` or
`results`, and for pagination under `pagination` or `meta`. It keeps
requesting pages while `pagination.totalPages` (or `hasMore`) says there are
more, and stops when a page returns fewer items than `perPage`.

---

## The post object

### Required

| Field | Type | Notes |
|---|---|---|
| `title` | string | Non-empty. A post without one is skipped with a warning. |

Everything else has a sensible fallback, but you will want most of it.

### Recommended

| Field | Type | Notes |
|---|---|---|
| `id` | string \| number | Your record id. Kept on the entry as `sourceId` for traceability. |
| `slug` | string | URL segment. Falls back to a slug derived from the title. Albanian `ë`/`ç` fold to `e`/`c`. |
| `locale` | `"sq"` \| `"en"` | **Defaults to `"sq"` if omitted.** Decides which blog index the post appears in. |
| `excerpt` | string | Card text and meta-description fallback. |
| `body` | string | The article, in Markdown. |
| `bodyFormat` | `"markdown"` \| `"html"` | Defaults to Markdown. |
| `publishedAt` | ISO 8601 | Sort order and the displayed date. Defaults to now. |
| `status` | string | `published` / `public` / `live` are shown; anything else is skipped. |

### Optional

| Field | Type | Notes |
|---|---|---|
| `updatedAt` | ISO 8601 | Rendered as "Updated …" at the foot of the post. |
| `author` | `{ name, role? }` or string | Shown on cards and the post header. |
| `tags` | string[] or comma-separated string | First three appear on cards. |
| `coverImage` | `{ url, alt }` or string | **Must be an absolute URL** — see [Images](#images). |
| `draft` | boolean | `true` excludes the post. |
| `seo` | `{ title?, description? }` | Overrides the `<title>` and meta description. |

### Field aliases

To ease integration, several common namings are accepted:

- locale — `locale`, `lang`, `language`
- body — `body`, `content`, `markdown`, `html`
- excerpt — `excerpt`, `description`, `summary`
- published date — `publishedAt`, `published_at`, `date`
- updated date — `updatedAt`, `updated_at`
- cover — `coverImage`, `cover`

### A complete example

```json
{
  "id": "01J8XN2K",
  "slug": "dhjete-minuta-ne-dite",
  "locale": "sq",
  "title": "Dhjetë minuta në ditë",
  "excerpt": "Terapia funksionon kur vazhdon edhe jashtë dhomës.",
  "bodyFormat": "markdown",
  "body": "Prindërit na pyesin gjithmonë…\n\n## Pse funksionon\n\nTruri i fëmijës…",
  "author": { "name": "Elira Hoxha", "role": "Logopede" },
  "tags": ["në shtëpi", "prindërit"],
  "coverImage": {
    "url": "https://cdn.speakup.al/blog/dhjete-minuta.jpg",
    "alt": "Nënë dhe fëmijë duke luajtur me karta"
  },
  "status": "published",
  "publishedAt": "2026-08-12T08:00:00Z",
  "updatedAt": "2026-08-14T10:30:00Z",
  "seo": {
    "title": "Si të ushtroni logopedinë në shtëpi",
    "description": "Dhjetë minuta në ditë: udhëzues i shkurtër për prindërit."
  }
}
```

`src/data/blog-fixtures.json` is a working payload in exactly this shape — use
it as a reference response while building the admin.

---

## Behaviour worth knowing

**Per-post locale.** Each post belongs to one language. An Albanian post
appears at `/blog/<slug>/` and in the Albanian index only; an English post at
`/en/blog/<slug>/`. There is no requirement to translate anything. If you do
want a translated pair, publish two posts — they may safely share a slug,
because entries are keyed `locale/slug`.

**Scheduling works for free.** A `publishedAt` in the future is excluded from
the build. The post appears on the first rebuild after that time passes — so
if you want true scheduled publishing, run a nightly (or hourly) rebuild.

**Drafts never reach the site.** `draft: true`, or any `status` other than
published/public/live, is filtered out.

**One bad post will not break the build.** A post that fails schema validation
is skipped with a warning and the rest of the site builds. A failure to reach
the API *does* fail the build — deliberately, so a broken admin never quietly
publishes a site with an empty blog.

**Slugs must be stable.** Changing a slug in the admin changes the post's URL
and orphans the old one. If you let authors edit slugs, consider emitting
redirects.

---

## Images

Cover images and any images inside the Markdown body are referenced by
absolute URL and served from wherever the admin stores them. They are **not**
processed by `astro:assets`, because the build cannot import a remote file as
a local asset.

Practical consequences:

- Upload at sensible dimensions (roughly 1600px wide is plenty) — nothing
  will resize them for you.
- Serve them from a stable, cacheable origin, ideally DigitalOcean Spaces + CDN.
- Always store `alt` text with the image; the site renders whatever you send,
  and empty alt on a meaningful image is an accessibility defect.

---

## Testing your implementation

Point the site at your admin and build:

```bash
BLOG_API_URL="https://admin.speakup.al/api/posts" \
BLOG_API_TOKEN="…" \
npm run build
```

The loader logs what it found:

```
[speakup-blog-api] Fetching blog posts from https://admin.speakup.al...
[speakup-blog-api] Loaded 12 blog posts (3 draft/scheduled/invalid skipped).
```

If something is wrong it says so specifically — a 401 names the two
environment variables to check, and a schema failure names the post.
