# Template Catalog & Self-Service Customization

Lets a couple pick a design themselves, fill in their own names/date/details, and submit it — which opens a **pull request** for your review instead of touching the live site directly.

---

## URL to share

```
https://msburberryy-web.github.io/Amore_Wedding_Tokyo_Invitedyou_v1.2/?mode=catalog
```

Anyone with this link can browse templates and submit a customized invitation. No code or login required — every submission lands as a PR for you to review before anything goes live.

---

## How it works

1. Couple opens the catalog link, picks a design (currently: **Starry Night**, based on the Khant & Aye template).
2. They fill in groom/bride name, wedding date, and a link ID like `khant.aye`, plus anything else they want from: venue/RSVP deadline/welcome message (EN/JA/MY), schedule, FAQ, dress code, photos/background/music by URL, and colors/fonts.
3. On submit, a backend function:
   - Checks the link ID isn't already taken.
   - Creates a new branch and commits `public/wedding-data_{slug}.json` (built from the template + their answers).
   - Opens a PR titled "New invitation: {Groom} & {Bride}".
4. **You get the PR like any other** — review, edit anything in the diff if needed, and merge.
5. Once merged, the existing automation takes over exactly as it does today: the deploy's `notify` job detects the new `wedding-data_*.json` file and posts an upload code to Notion, so you can send the couple their photo-upload link the same way you always do.

---

## What's customizable in this version

Everything is text/URL/color input — there's no file upload, so a couple never uploads an actual photo file here (that still goes through the usual upload-code flow after merging). What they *can* set from the form:

- Groom/bride name, date, RSVP deadline, link ID, contact email
- Venue name/address, Google Maps link
- Welcome message in English, Japanese, and Burmese
- Schedule (add/remove rows: time, event name, icon)
- FAQ (add/remove rows: question, answer, icon — e.g. parking, dress code, dietary, etc.)
- Dress-code color palette (toggle + up to 8 swatches + a note)
- Cover/groom/bride/background photo and gallery, all by **URL** (not uploaded)
- Background music, by URL
- Colors: accent, main text, page tint, block/card background, photo border
- Fonts: separate title vs. paragraph font, per language (reuses the same curated font list as AdminPanel)

Not yet editable from this form: actual file uploads (couples still need the existing upload-code link for real photo files), and anything beyond the above (e.g. the envelope animation, lightbox behavior, layout).

---

## Adding more templates later

1. Add a sanitized seed file to `public/templates/{id}.json` (same shape as `public/templates/starry_night.json` — use `./photos/[event-folder]/...` placeholders for personal photos, since those come from the couple later via the upload-code flow).
2. Add an entry to `public/templates.json` pointing at it.

No other code changes needed — the catalog and form both read from these two files.

---

## Setup (team only)

This reuses the **same Vercel project** as photo uploads (`upload-service/`), via a new endpoint `api/create-invitation.js`. No new environment variables are required — it uses the existing `GITHUB_TOKEN`. Just make sure the Vercel project redeploys after this change merges (it should auto-deploy on push, same as always).
