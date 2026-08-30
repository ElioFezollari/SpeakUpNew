# Client photography

Drop the clinic's photographs in this folder. `PhotoSlot.astro` picks them up
by **filename**, so no code change is needed — the placeholder disappears and
the image is optimised through `astro:assets` automatically.

Accepted extensions: `.jpg` `.jpeg` `.png` `.webp` `.avif`

## Expected filenames

| Filename | Used by | Shown at |
|---|---|---|
| `children-1.jpg` `children-2.jpg` `children-3.jpg` | home — services for children | square |
| `adults-1.jpg` `adults-2.jpg` `adults-3.jpg` | home — services for adults | square |
| `portfolio-1.jpg` | home — portfolio | 4:5, tall |
| `portfolio-2.jpg` `portfolio-3.jpg` `portfolio-4.jpg` | home — portfolio | square |
| `team-griselda.jpg` | home + about — staff | square |
| `team-dea.jpg` | home + about — staff | square |
| `room.jpg` | home — the clinic section | 4:3 |
| `entrance.jpg` | clinic page | 16:10, wide |
| `waiting-area.jpg` | clinic page | 16:10, wide |
| `therapy-room.jpg` | clinic page | 4:3 |
| `mirror-corner.jpg` | clinic page | 4:3 |
| `toy-shelves.jpg` | clinic page | 4:3 |
| `parent-seat.jpg` | clinic page | 4:3 |

**17 slots in total.** Any you do not supply simply keep showing a labelled
placeholder — nothing breaks, and they can arrive one at a time.

## Guidance for the shoot

- **Roughly 2000px on the long edge is plenty.** `astro:assets` resizes down,
  so anything larger only slows the build.
- Shoot with the **real lighting**, not a flash.
- **Square-ish framing** for the service, portfolio and staff slots; they are
  cropped to a square and a tight crop loses faces and detail at the edges.

## ⚠️ Consent — read before using patient photographs

The client mentioned sending "photos of patients" for the portfolio. Those are
**health-related images of identifiable people**, and for children they are
doubly sensitive.

Do not publish any photograph in which a patient is identifiable unless the
clinic holds **written, specific, informed consent for publication on the
website** from the patient or, for a child, from a parent or guardian —
recorded and retrievable, with a route to withdraw it.

Where that consent is not in place, these all work and carry no such risk:

- rooms, toys and materials with nobody in them
- hands only, or a child photographed from behind
- a therapist alone, working with materials
- deliberately out-of-focus backgrounds

The alt text for each slot lives in `src/i18n/sq.json` / `en.json`. Update it
if a photograph shows something different from what is described there.
