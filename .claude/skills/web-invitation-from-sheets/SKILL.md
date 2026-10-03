---
name: web-invitation-from-sheets
description: Create a web invitation JSON file for Amoré Wedding Tokyo from the Google Sheets intake form or the Notion "Amoré ToDos" tracker, including photos and the RSVP Google Sheet/Apps Script. Use whenever the user says "create web invitation from sheets", "check the intake form", "who is ready for 納品", "create invitation for [name]", "upload photos for [couple]", "set up RSVP for [couple]", or wants to process a couple end-to-end. Trigger when the user mentions 納品日 or wants to process a couple from the Google Forms spreadsheet or a Notion Ready task.
---

# Web Invitation from Sheets / Notion Intake

Builds a couple's full invitation: the `public/wedding-data_{slug}.json` file, their photos, and (when asked) their RSVP Google Sheet + Apps Script. Two source systems feed this — check both before assuming which applies.

## Which repo?

This skill lives in `Amore_Wedding_Tokyo_Invitedyou_v1.2`. **The same intake spreadsheet has historically also fed `Amore_Mingalar_News_Invitedyou`** — don't assume a row belongs here just because it's in this sheet. Before creating anything:

1. `ls public/wedding-data_*.json` in **both** repos for a file that could plausibly be this couple (try both name orders and initials-style slugs — past files aren't perfectly consistent).
2. If genuinely unsure which repo a couple belongs in, ask rather than guess — a wrong-repo mistake means redoing the work and deleting the stray file (this happened once already, see `kyaw_hnin`).

## Two possible sources — check both

### Source A: Google Sheets intake form

| Thing | ID / Value |
|---|---|
| Intake spreadsheet | `13F600-zrz2phGl9bt_LIMg-9NSfcwVKSeIcKWsA6Kas` |
| Tool to read | `mcp__Google_Drive__read_file_content` with that `fileId` |

Column map (left to right):

| # | Header | Maps to |
|---|---|---|
| 1 | Timestamp | ignore |
| 2 | Groom Name (Eng) | `groomName.en` |
| 3 | 新郎名前（日本語） | `groomName.ja` |
| 4 | သတို့သားအမည် | `groomName.my` |
| 5 | သတို့သမီးအမည် | `brideName.my` |
| 6 | Bride Name（Eng) | `brideName.en` |
| 7 | 新婦名前（日本語） | `brideName.ja` |
| 8 | 結婚式日 / မင်္ဂလာပွဲရက်စွဲ | `date` — normalize to `YYYY-MM-DD` |
| 9 | 受付タイム / ဧည့်ခံလက်ခံချိန် | schedule item: `time`, icon `reception` |
| 10 | 披露宴タイム / ဧည့်ခံပွဲ အချိန် | schedule item: `time`, icon `party` |
| 11 | 挙式タイム / မင်္ဂလာအခမ်းအနား ※Chapel | schedule item: `time`, icon `ceremony` — omit if blank |
| 12 | 会場の名前 | `location.name.en/.ja/.my` (same value for all 3 unless an obvious translation exists) |
| 13 | 会場住所 | `location.address.en/.ja/.my` (same value for all 3) |
| 14 | 会場の電話番号 | not in JSON — skip |
| 15 | 最終返信日 | `rsvpDeadline` — normalize to `YYYY-MM-DD` |
| 16 | Photos Drive link | see **Photo handling** below |
| 17 | 納品日 | delivery due date — primary filter |
| 18 | 納品済 | `済` = already delivered — don't mark this yourself, it's manually managed |
| 19 | RSPV Sheet | link to an already-created RSVP sheet, if any |
| 20 | Website | the live invitation URL once published |

### Source B: Notion "Amoré ToDos" tracker

Some couples (e.g. `nyein_htaung`) are tracked here instead of, or in addition to, the sheet. Search Notion for the couple's name; a match with `Status: Ready` and a field table (`groom_en`, `bride_en`, `date`, `uketsuke_time`, `party_time`, `party_end_time`, `rsvp_deadline`, `venue_name_en/ja/my`, `venue_address_en/ja/my`, `map_url`, `google_script_url`) is this database.

**Treat these fields as a draft, not ground truth** — they can be stale or wrong (a real example: a Notion record had the bride's name wrong and reception/party times swapped relative to what the couple actually confirmed). Cross-check names/times with the user if anything looks off before writing the JSON, and always prefer what the user tells you directly over what's in the field.

## Slug / Filename Rule

```
slug(name) = name.toLowerCase().trim().split(/\s+/)[0]   // first word
folder     = slug(groomName.en) + "_" + slug(brideName.en)
filename   = "public/wedding-data_" + folder + ".json"
```

If the bride/groom name later turns out wrong, `git mv` the file to the corrected slug (don't leave a stale name lying around) and update `images.hero/groom/bride` paths to match.

## Schedule Building

Build the `schedule` array in chronological order: ceremony (if present) → reception → banquet/party. Normalize times to 24-hour `HH:MM`, stripping `時`/`分`/`~`/ranges (take start time)/stray text.

**Sanity-check the order.** If reception is later than the banquet/party time, that's very likely a data-entry swap, not a real schedule — every other couple in this repo has reception first. Flag it explicitly to the user rather than silently trusting or silently "fixing" it; wait for confirmation before publishing.

## Map URL

Prefer a real embed URL if the source has one (Notion's `map_url` field often does, and it's more accurate than a generated one). Otherwise generate:
```
https://maps.google.com/maps?q=<url-encoded venue name + address>&z=17&output=embed
```

## Default Values (from DEFAULT_DATA in types.ts)

Use `DEFAULT_DATA` for any field not in the source:
- `showCountdown/showSchedule/showGallery: true`
- `gallery`: placeholder paths `./photos/[event-folder]/galleryN.jpg` (adjust count to what's actually available)
- `images.hero/groom/bride`: `./photos/[event-folder]/cover.jpg` / `groom.jpg` / `bride.jpg`
- `musicUrl / googleFormUrl / googleScriptUrl: ""`
- `theme`: `{ primary: "#C5A059", text: "#4A4A4A", backgroundTint: "#F5F0E6" }`
- `fonts`: `{ en: '"Cormorant Garamond"', ja: '"Shippori Mincho"', my: '"Padauk"' }`
- `visuals`: `{ enableAnimations: true, enableEnvelope: true }`
- `message`: use `DEFAULT_DATA.message`
- `faq`: copy in full from `DEFAULT_DATA.faq` (7 items including the children note)

Note: `images.hero` is rendered as the big background photo behind the hero header text — it is a real, visible slot in this repo (confirm this is still true if the component code changes), not a vestigial field.

## Optional Per-Couple Features

Neither of these appears in `DEFAULT_DATA` and neither should be added for a couple unless they specifically ask for it — both are opt-in, `show`-gated fields:

- **`familyIntro`** — `{ show: boolean; text: LocalizedString }`. A traditional family-introduction preamble (e.g. Burmese parents/siblings text) rendered as its own section right after the hero header, before the Greeting section. Example: `kyaw_hnin`.
- **`dressCode`** — `{ show: boolean; colors: string[]; note?: LocalizedString }`. A wedding color palette shown as circular swatches (with hex labels) so guests know what to wear, rendered between the Schedule and Access sections. `colors` is a plain array of hex codes (e.g. `["#C5A059", "#4A4A4A"]`); `note` is an optional localized caption shown above the swatches. Only enable when the couple explicitly provides colors — most couples don't use this.

If the user describes a new one-off "preamble" or "optional info block" idea for a couple, check here and in `types.ts` first — it's cheaper to extend one of these patterns (optional `show`-gated object) than invent a new one, and it keeps future automation from needing bespoke per-couple code.

## Photo Handling (download vs. hotlink)

Don't just note the Drive link and stop — actually place the photos, using file size to decide how:

1. List the Drive folder's contents. **`mcp__Google_Drive__search_files` with `parentId = '<folder id>'` is unreliable for a folder owned by someone else** — it appears to only surface files this account has already directly accessed (viewed/downloaded by ID), not the folder's true contents, and will silently under-report (e.g. showing 1 of 8 real files) rather than erroring. Don't trust an empty or short result from it as proof the folder is empty.
   - **The reliable method**: use Zapier's Google Drive connector (already enabled in this org) — `mcp__Zapier__execute_zapier_read_action` with `selected_api: "GoogleDriveCLIAPI"`, `action: "_zap_raw_request"`, `tool_name: "google_drive_make_api_get_request"`, and `params: {"url": "https://www.googleapis.com/drive/v3/files", "querystring": {"q": "'<folder id>' in parents and trashed = false", "fields": "files(id,name,size,mimeType,createdTime)", "pageSize": "100"}, "fail_on_errors": "true"}`. This hits the live Drive API directly and returns the folder's actual contents — use this whenever you need to enumerate a shared folder, not just the built-in connector's search.
   - If a couple says they've uploaded photos but the built-in search still shows the folder as empty, re-check with this Zapier method before telling them nothing is there.
2. For each file, check `fileSize` from that listing (or `get_file_metadata` once you have an id):
   - **A few MB or less**: try downloading with `mcp__Google_Drive__download_file_content`. Small files get saved to a `tool-results/*.txt` file when they exceed the tool's inline-context limit — decode with a small Python script (`json.load` → base64-decode `content` → write bytes to `public/photos/{slug}/filename.jpg`) rather than reading raw base64 into context.
   - **Anything bigger (observed: even a single 7.8MB file crashed the whole MCP connection, not just a token-limit error)**: don't fight it — go straight to hotlinking. Check `mcp__Google_Drive__get_file_permissions` first — it must include `{"role": "reader", "type": "anyone"}`. If so, use **`https://lh3.googleusercontent.com/d/{fileId}=s1600`** (note the `=s1600` suffix — see below for why it matters). Do **not** use the `.../view` share URL — that's an HTML page, not an image. If it's not public, ask the user to share it before you can use it.
3. **Always append a size suffix to lh3 hotlinks** (`=s1600` works well; adjust if you need something bigger). The bare `https://lh3.googleusercontent.com/d/{fileId}` path (no suffix) is a real, observed source of unreliability — in production, 3 of 5 gallery photos on one couple's page silently failed to load using the bare form, with no difference in permissions/metadata/owner between the working and broken files. Switching to the sized form fixed it. This is undocumented Google behavior, not something to re-litigate each time — just always include the suffix.
4. **Never apply a cache-busting query string to a hotlinked URL.** `App.tsx`'s `cacheBustedAsset` helper now skips absolute `http(s)` URLs for exactly this reason (appending `?v=...` to an external CDN link served no purpose and was a plausible contributor to the failure above) — if you ever see that helper change, make sure that guard stays.
5. Name local files `cover.jpg`, `groom.jpg`, `bride.jpg`, `gallery1.jpg`, `gallery2.jpg`, … If the same photo is both someone's dedicated profile shot and sitting in the general gallery folder, it's a judgment call whether to also duplicate it into the gallery array — showing the same face twice on the page is usually redundant, so default to excluding it, but say so explicitly since this is a guess about intent, not a rule.
6. **`.github/scripts/sync-gallery.js` runs on every push touching `public/photos/**/gallery*.jpg`.** As of the current version it preserves existing `http(s)` gallery entries and only manages local files — this was a real bug (it used to silently delete hotlinked entries on every photo push) fixed on `main`. If you ever see hotlinked gallery photos vanish after an unrelated photo commit, check this script hasn't regressed.
7. **There is a `sync-drive-photos.yml` GitHub Action that properly downloads real files** (via a Google service account, no size limits, updates the JSON automatically) — this is the correct long-term fix instead of hotlinking at all. **As of this writing its `GOOGLE_SA_KEY` repo secret was never configured, so every run fails immediately** (`GOOGLE_SA_KEY env var is not set`). Check whether this has since been fixed (try a `workflow_dispatch` run and look at the result) before assuming hotlinking is still necessary — if the secret is set up, prefer triggering this workflow over manual hotlinking entirely.

## RSVP Google Sheet + Apps Script

There is no API that can deploy an Apps Script Web App — that step requires a human to click through Google's Deploy flow and one-time OAuth consent in a real browser. What you *can* do:

1. Create the sheet: `mcp__Google_Drive__create_file` with `contentMimeType: "application/vnd.google-apps.spreadsheet"` and a descriptive title. It's created under the connected account, already owned/accessible to the user.
2. Hand them a ready-to-paste Apps Script, with the new sheet's ID pre-filled into a `SHEET_ID` constant (via `SpreadsheetApp.openById`, not `getActiveSpreadsheet()` — the latter silently fails if the script isn't opened from that exact sheet). Include:
   - A `doPost(e)` that reads `e.parameter` fields matching what `RsvpForm.tsx` actually sends (check that file — this repo's fields include `attendance`, `full_name`, `email`, `phone`, `guests`, `guest_info`, `allergies`, `message`; confirm before assuming, since the sibling Mingalar repo's form has a different field set)
   - A try/catch that returns a JSON error body — visible in Apps Script's Executions log even though the client can't read it
   - A `doGet(e)` returning a plain "endpoint is live" string, so a deployment can be sanity-checked by just opening the `/exec` URL in a browser
3. Tell them: after pasting, they must **Save** before deploying (Apps Script deploys whatever was last saved, not what's on screen), and after *any* future edit, they need **Deploy > Manage deployments > pencil icon > New version** — saving alone does not update the live URL.
4. Once they send back the `/exec` URL, set it as `googleScriptUrl` in the couple's JSON.

**Verifying the wiring without a live test:** this sandbox cannot reach `script.google.com` at all (outbound network policy blocks it). To still verify the integration is wired correctly, run the dev server and drive it with a headless browser (Playwright is available globally — `NODE_PATH=/opt/node22/lib/node_modules`, Chromium at `/opt/pw-browsers/chromium`), intercept the outbound request with `page.route('https://script.google.com/**', ...)`, fulfill it with a mocked 200, and confirm (a) the request actually fires to the exact URL (proves it left demo mode), and (b) the request body's field names match the `doPost` handler. This confirms the client-side wiring is correct; it does **not** confirm Google's side actually writes the row — say so plainly, and ask the user to do one real test submission and check the sheet.

One more repo-specific detail worth knowing: this repo's `RsvpForm.tsx` fetches with `mode: 'cors'` and checks `response.ok` (a failed CORS preflight/response will show as a form error even if the row was written). The sibling `Amore_Mingalar_News_Invitedyou` repo instead fires with `mode: 'no-cors'` and never reads the response. Don't assume the fix that worked in one repo applies to the other.

## Workflow

1. Determine the source (sheet row, or Notion Ready task) and which repo it belongs in (see above).
2. Parse the fields per the relevant column/field map. Cross-check anything that looks internally inconsistent (schedule order, name spelling) before proceeding.
3. Show the parsed values to the user — folder name, event date, venue, schedule, RSVP deadline — and confirm before writing files, unless they've explicitly asked you to just go ahead.
4. Check for an existing file (in both repos). If one exists, diff it rather than blindly overwriting.
5. Create `public/wedding-data_{folder}.json`.
6. If a photo Drive link is available, handle photos per the **Photo Handling** section above. Otherwise create `public/photos/{folder}/.gitkeep` as a placeholder.
7. If asked to set up RSVP, follow the **RSVP Google Sheet + Apps Script** section.
8. Validate: `node -e "JSON.parse(...)"` the file, and run `npx tsc --noEmit` (and ideally `npm run build`) before committing — this has caught real issues before.
9. Commit on a new branch, push, open a PR against `main` with a clear summary (including any flags — swapped schedule, uncertain repo, name discrepancy), and merge once confirmed or when explicitly told to proceed.

## Notes

- Do not mark 納品済 in the spreadsheet — that column is managed manually by the team.
- Time strings from sources are often inconsistent (`10:30`, `13時10分`, `17:00~19:30`, plain typos) — always normalize to `HH:MM` and sanity-check the result, don't just regex-strip and trust it.
- When a couple's venue is MBS Myanmar Buddhist Society (板橋区仲町39-1) or another repeat venue, check whether an existing couple's JSON already has a verified `mapUrl` for that exact address — reuse it instead of generating a fresh (less accurate) one.
