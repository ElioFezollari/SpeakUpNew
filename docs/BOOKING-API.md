# Booking API contract

The booking page (`/rezervo/`, `/en/booking/`) talks to two endpoints on the
admin site. This is the third integration point, and the only one that reads
live data at **runtime**:

| Feature | When it talks to the admin | Why |
|---|---|---|
| Blog | build time (`GET`) | posts change rarely; a rebuild is fine |
| Contact form | runtime (`POST`) | nothing to read |
| **Booking** | **runtime (`GET` *and* `POST`)** | **availability changes every time somebody books** |

Availability cannot be baked into the static build: a slot booked at 10:01
must be gone by 10:02, and the site only rebuilds on demand. So the browser
fetches it directly.

```
Visitor opens /rezervo/
        │  GET {base}/availability?from=&to=&service=&locale=
        ▼
┌────────────────────────┐
│  PUBLIC_BOOKING_API_URL│  your admin
└────────────────────────┘
        ▲  POST {base}/bookings
        │  → 201 { reference }   … or 409 if the slot just went
```

> **Both endpoints are public.** The site is static, so these are called from
> the visitor's browser and the base URL is visible in the page source — hence
> the `PUBLIC_` prefix. **There is no secret to send**, so all rate limiting
> and abuse protection has to be server-side. See
> [Spam and abuse](#spam-and-abuse).

---

## 1. `GET {base}/availability`

Called on page load and whenever the visitor changes month or service.

```
GET {base}/availability?from=2026-09-01&to=2026-09-30&service=Vler%C3%ABsim%20i%20par%C3%AB&locale=sq
Accept: application/json
```

| Parameter | Meaning |
|---|---|
| `from`, `to` | Inclusive date range, `YYYY-MM-DD`. Always a whole calendar month. |
| `service` | The selected service label, exactly as listed in `booking.services` in the copy files. |
| `locale` | `sq` or `en`. |

### Response

```json
{
  "days": [
    { "date": "2026-09-14", "slots": ["09:00", "09:45", "14:00"] },
    { "date": "2026-09-15", "slots": ["10:30"] }
  ],
  "timezone": "Europe/Tirane"
}
```

- **`date`** — `YYYY-MM-DD` in the **clinic's local calendar**, not UTC.
- **`slots`** — 24-hour `HH:MM`, local time, sorted. The page formats them per
  locale (`14:00` in Albanian, `2:00 pm` in English), so send the raw 24-hour
  value and let the page do the rest.
- Days with no availability may be **omitted entirely** or sent with an empty
  `slots` array. Both are treated as "nothing free".

**Only return dates inside the requested range.** The page filters to the
displayed month when deciding whether a month is fully booked, so out-of-range
dates are ignored — but sending them wastes bandwidth and makes debugging
harder.

**Do not return past dates or past times.** The page disables anything before
today as a safety net, but a slot at 09:00 that has already passed today should
not be offered.

Respond within ~12 seconds; the page aborts after that and shows a retry.

### Empty months

If a whole month is booked out, the page **automatically moves forward** to the
next month — up to three months — rather than showing an empty grid. After that
it says so and lets the visitor navigate. Nothing is needed on your side, but
it means a `GET` for one month may be followed immediately by two or three more.

---

## 2. `POST {base}/bookings`

```
POST {base}/bookings
Content-Type: application/json
Accept: application/json
```

```json
{
  "service": "Vlerësim i parë",
  "date": "2026-09-14",
  "time": "14:30",
  "name": "Ana Hoxha",
  "phone": "069 123 4567",
  "email": "ana@example.com",
  "childAge": "4 vjeç",
  "notes": "Djali im ka vështirësi me tingullin R…",
  "consent": "yes",
  "locale": "sq",
  "fax": "",
  "renderedAt": "1756500000000"
}
```

| Field | Always sent | Notes |
|---|---|---|
| `service`, `date`, `time` | yes | The page will not enable submit until all three are chosen. |
| `name`, `phone` | yes | Both required by the form. |
| `consent` | when ticked | `"yes"`. Required by the form — treat a missing value as invalid. |
| `locale` | yes | Reply in the language they booked in. |
| `email`, `childAge`, `notes` | yes (may be `""`) | Optional for the visitor. |
| `fax` | yes | Honeypot. **Must be empty.** |
| `renderedAt` | yes | `Date.now()` at page load, as a string. |

### Responses

| Status | Meaning | What the page does |
|---|---|---|
| **2xx** | Booked. Body may include `{"reference": "SU-2026-0912"}` | Shows the success panel, and the reference if present. Hides the form. |
| **409** | **That slot was taken between load and submit** | Shows "that time has just been taken", **refetches availability**, clears the chosen time and lets them pick again. |
| any other | Failure | Shows the error panel, keeps everything they typed, re-enables the button. |

**409 is not optional.** Two parents can load the page at the same time and
pick the same slot. Whichever `POST` lands second must get a 409 — check
availability and insert inside one transaction, or put a unique constraint on
`(date, time, therapist)` and translate the violation into a 409. Returning 200
to both is a double-booking.

### Validate server-side regardless

The page gates the submit button and validates the fields, but that is a
convenience, not a control — anything can POST here. Re-check on arrival: the
slot is genuinely free, `date`/`time` match a slot you actually offered for
that `service`, `name`/`phone` non-empty, `consent === "yes"`, and cap every
field's length.

---

## CORS

Both requests are cross-origin, and the POST sends
`Content-Type: application/json`, which makes it **preflighted**. Answer the
`OPTIONS` preflight and set the headers on the real responses:

```http
Access-Control-Allow-Origin: https://speakup.al
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 86400
```

Name the origin explicitly rather than using `*`. Remember your staging origin
while testing. If the calendar shows the retry message and nothing reaches your
logs, it is the preflight.

---

## Spam and abuse

No shared secret, so:

**Honeypot.** `fax` is an off-screen field no human sees. Non-empty → drop it,
but return a 2xx so the bot believes it worked.

**Time-to-submit.** A genuine booking takes more than a few seconds:

```js
const elapsed = Date.now() - Number(body.renderedAt || 0);
if (body.renderedAt && elapsed < 4000) return ok(); // silently discard
```

**Rate limit by IP**, on both endpoints. The availability endpoint is the one
that will get hammered — it is called on every month change.

**Cap bookings per phone number** per day, or a script can fill the calendar.

---

## Configuration

```bash
PUBLIC_BOOKING_API_URL=https://admin.speakup.al/api/booking
```

Set as a **build-time** variable on DigitalOcean, like the others. Not a
secret — it is emitted into the page HTML by design.

### Demo mode

If it is **unset**, the page runs a **demo calendar**: availability is
generated in the browser and a prominent banner says so in the visitor's
language. The build also logs a warning. Submitting in demo mode sends nothing
and tells the visitor to call instead.

This exists so the page can be designed and reviewed before the API is built.
**Set the variable before launch** — it is on the checklist in the README.

---

## Later: sharing with the admin UI

The task description mentioned integrating this into the admin. Worth knowing
when you do:

- The availability endpoint is the natural place for the admin's own calendar
  to read from too — same shape, plus whatever internal fields it needs.
- Keep `slots` as opaque `HH:MM` strings on the wire. The page never parses
  them into dates; it only formats them for display. That means you can change
  slot length or add therapist routing without touching the site.
- If you later need per-therapist booking, add `therapist` as another query
  parameter and another field in the POST body. The page's service chips are
  driven entirely by `booking.services` in the copy files, so a second chip row
  is a copy change plus a few lines in `BookingPage.astro`.

---

## Testing

```bash
PUBLIC_BOOKING_API_URL="https://admin.speakup.al/api/booking" npm run build
npm run preview
```

Then check, in order:

1. The calendar loads and only days you offered are clickable.
2. Changing month issues a new `GET` with the new range.
3. Changing service reloads availability.
4. Submitting posts every field above.
5. A forced `409` shows the "slot taken" message and refreshes the calendar.
6. A `500` keeps the typed details and re-enables the button.
7. A fully-booked month auto-advances rather than showing an empty grid.
