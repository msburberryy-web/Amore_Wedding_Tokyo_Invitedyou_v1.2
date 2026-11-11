# Invitation review

The invitation catalog is at `?mode=catalog`. Couples choose a template, edit the allowed fields and preview the actual invitation renderer before submitting.

The browser and the Vercel endpoint use the same schema in `lib/invitation-draft.mjs`. The endpoint accepts only listed template IDs, link IDs, and invitation fields. It rejects unknown fields, markup or script-like text, invalid dates, unsupported colors and fonts, and unsafe URLs before making any GitHub requests.

An accepted submission opens a pull request against `main` with exactly one new `public/wedding-data_<couple>.json` file. The invitation repository is public, so the form asks for consent before sending invitation text and media links. Contact information for studio correspondence and RSVP destinations are outside the editor. The studio reviews the invitation and configures the RSVP destination as needed before merging.

The Pages deployment must have `VITE_UPLOAD_API_URL` set to the existing upload service, and the upload service needs its repository-scoped `GITHUB_TOKEN` with Contents and Pull requests write access. Deploy both the upload service and the Pages app from the same version. Keep the token in the server environment.
