# Deploying to DigitalOcean

> **This is not how the clinic is deployed.** The site, the admin and the
> database all run on a single Droplet, and the runbook for it lives in the
> admin repository: `SpeakUpAdmin/docs/DEPLOY-DROPLET.md`. There, this repo is
> a checkout at `/srv/speakup/site`, nginx serves its `dist/`, and publishing a
> post in the admin rebuilds it in place — no App Platform app and no
> `DO_API_TOKEN`. `.github/workflows/ci.yml` deploys to that Droplet over SSH;
> the App Platform and scheduled-rebuild workflows that used to be here have
> been removed, the latter replaced by a systemd timer on the machine.
>
> What follows is the App Platform alternative, kept because it still works.

---

## 1. First deploy

Push the project to GitHub, then edit `.do/app.yaml`:

- `github.repo` — your `org/repo`
- `envs.BLOG_API_URL` — your admin's posts endpoint
- `domains` — your real domains (or delete the block and use the free
  `*.ondigitalocean.app` subdomain while testing)

Create the app:

```bash
doctl apps create --spec .do/app.yaml
```

Then set the API token as an encrypted secret (never commit it):

```bash
doctl apps update <APP_ID> --spec .do/app.yaml
# …then set BLOG_API_TOKEN in the App Platform UI:
#   Settings → web → Environment Variables → BLOG_API_TOKEN → Encrypt
```

Note the app id — you need it in step 2:

```bash
doctl apps list --format ID,Spec.Name,DefaultIngress
```

App Platform rebuilds automatically on every push to `main`.

---

## 2. Publish → rebuild

This is the piece that makes the blog work.

Publishing a post writes to the admin's database. The static site knows
nothing about it until it rebuilds. So **the admin must trigger a rebuild
after publishing**.

App Platform has no one-click "build hook" URL like Netlify. You trigger a
deployment through the API:

```http
POST https://api.digitalocean.com/v2/apps/{APP_ID}/deployments
Authorization: Bearer {DO_API_TOKEN}
Content-Type: application/json

{ "force_build": true }
```

`force_build: true` skips the build cache, which matters here — without it a
deploy with no new commits can reuse the previous build and your new post
will not appear.

From the admin, after a successful publish/unpublish/edit:

```js
// Fire-and-forget: never let a deploy hiccup fail the author's save.
async function triggerSiteRebuild() {
  try {
    const response = await fetch(
      `https://api.digitalocean.com/v2/apps/${process.env.DO_APP_ID}/deployments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.DO_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force_build: true }),
      },
    );
    if (!response.ok) {
      console.error('Site rebuild failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Site rebuild request failed:', error);
  }
}
```

Create the `DO_API_TOKEN` under **API → Tokens** with **write** scope, and
store it only in the admin's server-side environment. It can create
deployments on your account, so it must never reach the browser.

### Debouncing

An author who saves six times in a minute would trigger six builds. Either:

- debounce the trigger in the admin (wait ~60s of quiet, then fire once), or
- skip the trigger entirely and run a scheduled rebuild (below).

A build takes roughly a minute, so a post goes live one to two minutes after
publish.

### Scheduled rebuilds

Worth adding regardless, because it is what makes `publishedAt` scheduling
work. Any cron runner can call the same endpoint; a GitHub Actions example is
in `.github/workflows/scheduled-rebuild.yml`.

---

## 3. Environment variables

Set these as **build-time** variables on the App Platform component:

| Variable | Example | Encrypted |
|---|---|---|
| `BLOG_API_URL` | `https://admin.klinikelogopedie.com/api/posts` | no |
| `BLOG_API_TOKEN` | your admin's read token | **yes** |
| `PUBLIC_CONTACT_API_URL` | `https://admin.klinikelogopedie.com/api/enquiries` | no — public by design |
| `PUBLIC_BOOKING_API_URL` | `https://admin.klinikelogopedie.com/api/booking` | no — public by design |
| `SITE_URL` | `https://klinikelogopedie.com` | no |

`SITE_URL` must be the real origin before launch — canonical URLs, `hreflang`
alternates and the sitemap are all built from it.

Do **not** set `BLOG_ALLOW_FIXTURES` in production. Without it, an unreachable
admin API fails the build loudly and the previous deploy stays live, which is
what you want. With it, the site would quietly deploy with three sample posts.

---

## Alternative: Droplet + nginx

If you would rather run a Droplet you already own, build in CI and rsync the
output. `.github/workflows/deploy-droplet.yml` is a working starting point —
it is disabled by default; enable it and set the repository secrets it names.

Serve `dist/` with nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name klinikelogopedie.com www.klinikelogopedie.com;

    root /var/www/speakup;
    index index.html;

    # trailingSlash: 'always' — serve /path/ from /path/index.html
    location / {
        try_files $uri $uri/index.html $uri/ =404;
    }

    error_page 404 /404.html;

    # Fingerprinted assets are safe to cache hard.
    location /_astro/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

With this route the "publish" trigger becomes a `repository_dispatch` to
GitHub Actions rather than a call to the DigitalOcean API:

```http
POST https://api.github.com/repos/{OWNER}/{REPO}/dispatches
Authorization: Bearer {GITHUB_TOKEN}
Accept: application/vnd.github+json

{ "event_type": "publish-blog" }
```
