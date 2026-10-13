# Photo Upload Guide

Clients can upload their own photos directly to their wedding invitation without any technical knowledge.

---

## How it works

1. The couple visits their private upload URL
2. They enter their 8-character upload code
3. They select and upload photos from their phone or computer
4. Photos go live on the invitation automatically (usually within 2–3 minutes)

---

## Upload URL format

```
https://msburberryy-web.github.io/Amore_Wedding_Tokyo_Invitedyou_v1.2/?mode=upload&event=GROOM.BRIDE
```

`GROOM` and `BRIDE` are the first words of each name, lowercase.

**Examples:**

| Couple | Upload URL |
|---|---|
| Morris San Hein Soe & Sein Chan | `?mode=upload&event=morris.sein` |
| KHIN MAUNG HTAY & SHWE YEE WIN | `?mode=upload&event=khin.shwe` |
| KHANT AUNG ZAW & AYE MYAT MON | `?mode=upload&event=khant.aye` |

---

## Upload code

Each couple has a unique 8-character code. It is generated automatically when Notion marks the invitation as Done.

**Where to find it:** Open the couple's Notion web-invitation task → check the Note field. It looks like:

```
📸 Upload: https://.../?mode=upload&event=morris.sein
🔑 Upload Code: a3f8c21d
```

Share both the URL and the code with the client.

---

## What photos to upload

| Slot | File name saved | Used as |
|---|---|---|
| **Cover Photo** *(required)* | `cover.jpg` | Hero / background image on the invitation |
| **Groom Photo** *(required)* | `groom.jpg` | Groom portrait |
| **Bride Photo** *(required)* | `bride.jpg` | Bride portrait |
| **Gallery Photos** *(optional)* | `gallery1.jpg`, `gallery2.jpg` … | Photo gallery section |

The client can upload as many gallery photos as they like by clicking **+ Add Another Photo**.

Photos are automatically compressed to max 1920px before uploading.

---

## What happens after upload

1. Photos are committed to the GitHub repository under `public/photos/{folder}/`
2. GitHub Actions deploys the updated site (takes ~2 minutes)
3. The invitation page immediately shows the new photos

---

## Setup (team only)

The upload feature requires three things configured once:

| Setting | Where | Value |
|---|---|---|
| `UPLOAD_SECRET` | GitHub → Settings → Secrets | Any random string (keeps codes secure) |
| `VITE_UPLOAD_API_URL` | GitHub → Settings → Variables | Your Vercel deployment URL (e.g. `https://amore-upload.vercel.app`) |
| Vercel deployment | Vercel dashboard | Import the `upload-service/` folder as a Vercel project; add `UPLOAD_SECRET` and `GITHUB_TOKEN` as Vercel env vars |

**Vercel env vars needed:**

| Var | Value |
|---|---|
| `UPLOAD_SECRET` | Same value as the GitHub secret |
| `GITHUB_TOKEN` | A GitHub Personal Access Token with `repo` scope |
| `GITHUB_REPO` | `msburberryy-web/Amore_Wedding_Tokyo_Invitedyou_v1.2` |
| `GITHUB_BRANCH` | `main` |
