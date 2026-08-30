# Contact form API contract

The contact page (`/kontakt/`, `/en/contact/`) posts enquiries to an endpoint
on the admin site. This is the counterpart to
[ADMIN-API.md](./ADMIN-API.md) — that one is read at build time, this one is
called live from the visitor's browser.

```
Visitor fills the form
        │
        │  POST  (JSON, from fetch — or form-encoded with JS off)
        ▼
┌──────────────────────────┐
│  PUBLIC_CONTACT_API_URL  │  your admin
│  validate → store → email the clinic
└──────────────────────────┘
        │
        ├─ JSON request  → 2xx, form shows the success panel in place
        └─ form-encoded  → 303 redirect to `redirectTo`
```

> **The endpoint is public.** The site is static, so the form is submitted from
> the visitor's browser and the URL is visible in the page source — hence the
> `PUBLIC_` prefix on the variable. **There is no secret to send with the
> request**, so all abuse protection has to happen server-side. See
> [Spam and abuse](#spam-and-abuse).

---

## The request

```
POST {PUBLIC_CONTACT_API_URL}
Content-Type: application/json
Accept: application/json
```

```json
{
  "name": "Ana Hoxha",
  "phone": "069 123 4567",
  "email": "ana@example.com",
  "childAge": "4 vjeç",
  "topic": "Dua të rezervoj një vlerësim",
  "message": "Djali im ka vështirësi me tingullin R…",
  "consent": "yes",
  "locale": "sq",
  "redirectTo": "/kontakt/faleminderit/",
  "fax": "",
  "renderedAt": "1756500000000"
}
```

| Field | Always sent | Notes |
|---|---|---|
| `name` | yes | Required by the form. |
| `phone` | yes | Required. The primary contact route for most parents. |
| `message` | yes | Required. |
| `consent` | when ticked | `"yes"`. The form requires it, so treat a missing value as invalid. |
| `locale` | yes | `"sq"` or `"en"` — reply in the language they wrote in. |
| `email` | yes (may be `""`) | Optional for the visitor. |
| `childAge` | yes (may be `""`) | Free text: `"4 vjeç"`, `"almost 3"`, … Do not try to parse it. |
| `topic` | yes | One of the three options in the locale's `contact.form.topicOptions`. |
| `redirectTo` | yes | Where to send a **no-JavaScript** submission afterwards. |
| `fax` | yes | Honeypot. **Must be empty** — see below. |
| `renderedAt` | yes | `Date.now()` when the page loaded, as a string. Empty if JS was off. |

### Validate server-side regardless

The form validates in the browser, but that is a convenience, not a control —
anything can POST to a public endpoint. Re-check on arrival: `name`, `phone`
and `message` non-empty, `consent === "yes"`, `email` well-formed if present,
and cap the length of every field.

---

## The response

### JSON request (JavaScript on — the normal case)

Return any **2xx** status. The body is ignored; `{"ok": true}` is fine. The
page then hides the form and shows the success panel in place.

Any non-2xx makes the page show the error panel, keep the visitor's typed
answers, and re-enable the button so they can retry.

### Form-encoded request (JavaScript off)

The form has a real `action` and `method="post"`, so with JS disabled the
browser performs a normal submission with
`Content-Type: application/x-www-form-urlencoded`. Handle it and respond:

```
HTTP/1.1 303 See Other
Location: https://speakup.al/kontakt/faleminderit/
```

Build that URL from the site origin plus the submitted `redirectTo`.
**Only accept a same-site path** — treat `redirectTo` as untrusted input and
reject anything starting with `//` or a scheme, or you have built an open
redirect.

The two thank-you pages already exist: `/kontakt/faleminderit/` and
`/en/contact/thank-you/`.

---

## CORS — the thing that will bite you first

The browser sends `Content-Type: application/json`, which makes this a
**preflighted** cross-origin request. The admin must answer the `OPTIONS`
preflight *and* set the headers on the POST response:

```http
Access-Control-Allow-Origin: https://speakup.al
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 86400
```

Name the site origin explicitly rather than using `*` — this endpoint writes
data. Remember to allow your preview/staging origin too while testing.

If the form silently fails with a network error in the browser console but the
request never reaches your logs, it is the preflight.

---

## Spam and abuse

Because there is no shared secret, these are the defences worth having:

**Honeypot.** `fax` is an off-screen field no human ever sees. If it is
non-empty, drop the submission — return `200` so the bot believes it worked,
but store nothing.

**Time-to-submit.** `renderedAt` is when the page loaded. A genuine enquiry
takes at least a few seconds to type:

```js
const elapsed = Date.now() - Number(body.renderedAt || 0);
if (body.renderedAt && elapsed < 3000) return ok(); // silently discard
```

**Rate limit by IP** — a handful of submissions per hour is generous for a
clinic of this size.

**Cap field lengths** before storing, and escape on the way out. Enquiry text
ends up in an admin UI and probably an email; treat it as hostile input.

If volume ever becomes a problem, add a CAPTCHA — but try the honeypot and the
timing check first. For a clinic in Tirana they will almost certainly be
enough, and they cost the parent nothing.

---

## Configuration

```bash
PUBLIC_CONTACT_API_URL=https://admin.speakup.al/api/enquiries
```

Set it as a **build-time** variable on DigitalOcean, like the blog variables.
Unlike `BLOG_API_TOKEN` it is not a secret — it is emitted into the page HTML
by design.

If it is unset, the build still succeeds but logs a warning, and the form
renders with no `action` and refuses to submit rather than posting back to the
page it is on. **Set it before launch** — it is on the checklist in the README.

---

## Testing

```bash
PUBLIC_CONTACT_API_URL="https://admin.speakup.al/api/enquiries" npm run build
npm run preview
```

Then check, in order:

1. Submitting an empty form shows inline errors and sends nothing.
2. A valid submission reaches your endpoint with all the fields above.
3. A `500` from your endpoint shows the error panel and keeps the typed text.
4. With JS disabled, submitting lands on the thank-you page.
5. A submission with `fax` filled in is discarded but still returns 2xx.
