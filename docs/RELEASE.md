# Releasing

This document has the same structure in every extension repository; only the
store list, the identifiers, and the repository-specific notes differ.

- [Cut a release](#cut-a-release)
- [Store deployment](#store-deployment)
  - [Chrome Web Store](#chrome-web-store)
  - [Firefox Add-ons](#firefox-add-ons)
- [Store configuration](#store-configuration)
- [Local store commands](#local-store-commands)
- [Failure playbook](#failure-playbook)

## Cut a release

1. Bump `version` in `package.json` (semantic `X.Y.Z`) in a normal pull
   request and merge it to `master`.
2. Tag the merged commit and push the tag:

   ```sh
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```

3. `.github/workflows/release.yml` rejects a tag that does not match
   `package.json`, is not reachable from `master`, or already has a release,
   then runs `pnpm check`, builds the extension, verifies the manifest
   versions, and publishes a GitHub Release with:
   - `website-blocker-<version>-chrome.zip` and
     `website-blocker-<version>-firefox.zip`, the store-ready archives
   - `website-blocker-<version>-source.zip`, the tagged repository state
   - `SHA256SUMS.txt`, GNU `sha256sum` lines with the bare asset names

Release notes are a fixed sentence followed by the notes GitHub generates from
the pull requests merged since the previous tag. Edit them afterwards with
`gh release edit vX.Y.Z --notes` when needed.

Running `release.yml` by hand from the Actions tab (or
`gh workflow run release.yml`) is a dry run: it builds and verifies everything
and uploads workflow artifacts, but publishes nothing.

`gh release create` uploads the assets to a draft and publishes it last; a
failed upload deletes the draft again, so a failed run normally leaves no
release behind and can simply be re-run. If a draft survives a cancelled run,
delete it with `gh release delete vX.Y.Z --yes` before re-running.

## Store deployment

Nothing is sent to a store automatically. Each store has its own manual
workflow that takes an already published GitHub Release:

```sh
gh workflow run deploy-chrome-store.yml -f tag=vX.Y.Z
gh workflow run deploy-firefox-amo.yml -f tag=vX.Y.Z
```

The `tag` input is optional; blank deploys the latest published release. The
`mode` input defaults to `submit`; `validate` resolves and verifies the
release without touching the store, which is the way to test the workflow.

Every deploy workflow runs `scripts/deploy/cli.ts` first, which refuses tags
that do not match `vX.Y.Z`, draft and pre-release releases, release commits
that are not reachable from `master`, and a tagged `package.json` version that
differs from the tag. It then downloads the release assets, never a fresh
rebuild, verifies their SHA-256 checksums against `SHA256SUMS.txt`, and checks
the manifest inside the archive: exactly one root `manifest.json`, manifest
version 3, the release version, and the background format of the target
browser. Only then does the store-specific part start. The validation code and
its tests (`tests/deploy`) are identical across the repositories; the
repository specifics live in `scripts/deploy/constants.ts`.

### Chrome Web Store

`deploy-chrome-store.yml` uploads the archive through Chrome Web Store API v2
with the `go-webext` version pinned by `GO_WEBEXT_VERSION` in the workflow,
refuses to continue unless the store confirms the upload of that exact version
(`Upload State: SUCCEEDED`), submits the draft for review with deferred
(staged) publishing, and writes the store status to the job summary. The status
covers the published and submitted state only; draft processing is visible in
the Developer Dashboard.

When the review verdict arrives by e-mail, publish the approved version by hand
in the Chrome Web Store Developer Dashboard. A staged submission left
unpublished expires back to a draft after about 30 days; re-run the workflow
with the same tag to submit it again. A green run proves a successful
submission, not approval.

### Firefox Add-ons

`deploy-firefox-amo.yml` uses the same manual deployment flow as
`hide-gmail-upgrade-button`. Modes:

- `validate`: resolve a stable GitHub Release, download its Firefox and source
  ZIPs, and verify their checksums, version, Gecko ID and source completeness.
  Nothing is uploaded. Configuration names must still be present.
- `submit` (default): check the authenticated AMO API for that exact version,
  then upload only if absent. Existing versions are never uploaded again.
  The source archive must contain [AMO_REVIEW.md](AMO_REVIEW.md).
- `status`: read review/publication status without uploading. When a signed XPI
  is available, download it and check the AMO hash, version, Gecko ID and Mozilla
  signature envelope, then retain it as an Actions artifact for 30 days. This
  is not independent cryptographic verification of the signing certificate chain.

Firefox publishes automatically after Mozilla approval. A successful upload
does not prove approval or publication. Run `status` again later to check it;
do not upload again because signing or a status endpoint is temporarily unavailable.
The workflow uses `go-webext v0.4.2` for listed uploads and a TypeScript helper
for AMO status because go-webext cannot parse some AMO category responses.

The first listing must be completed in Developer Hub using a Firefox ZIP and
the matching source ZIP. [FIREFOX_LISTING.md](FIREFOX_LISTING.md) contains the
copy and reviewer details. Releases through 1.2.7 only contain Chrome; the first
release with Firefox support is 1.2.8. Set `FIREFOX_AMO_ID` to the actual saved
listing slug or numeric ID, not the Gecko ID (`website-blocker@maximtop.dev`).

## Store configuration

The store item must exist before any deployment: the API cannot create the
listing. One-time setup:

1. Create the item in the Chrome Web Store Developer Dashboard by uploading any
   release archive by hand, complete the listing, privacy, and distribution
   tabs there, and leave the item as an unsubmitted draft.
2. Copy the item ID from the Developer Dashboard item URL into the
   `CHROME_APP_ID` repository variable.
3. Add the variables and secrets below.
4. Run `deploy-chrome-store.yml` once with `mode: validate`, then with
   `mode: submit`.

Configure these in the GitHub repository under **Settings → Secrets and
variables → Actions**. Workflows reference them by name only; no value is ever
committed.

| Kind | Name | Description |
| --- | --- | --- |
| Variable | `CHROME_APP_ID` | Item ID from the Developer Dashboard item URL. Specific to this extension. |
| Variable | `CHROME_PUBLISHER_ID` | Publisher ID from the Developer Dashboard account page. |
| Secret | `CHROME_CLIENT_ID` | OAuth 2.0 client ID of the Google Cloud project with the Chrome Web Store API enabled. |
| Secret | `CHROME_CLIENT_SECRET` | Secret of that OAuth client. |
| Secret | `CHROME_REFRESH_TOKEN` | Refresh token granted for the `https://www.googleapis.com/auth/chromewebstore` scope. |
| Variable | `FIREFOX_AMO_ID` | Actual AMO listing slug or numeric ID from Developer Hub. |
| Secret | `FIREFOX_CLIENT_ID` | JWT issuer from the AMO API credentials page. |
| Secret | `FIREFOX_CLIENT_SECRET` | Full original JWT secret; the masked value AMO displays later cannot authenticate. |

The publisher ID and the three secrets belong to the Google account and are
shared by every extension it publishes. Their source of truth is the 1Password
item `chrome-web-store-api`, whose notes list every repository that uses them
and the rotation steps. Push a value to a repository without printing it:

```sh
op read op://Private/chrome-web-store-api/CHROME_REFRESH_TOKEN | gh secret set CHROME_REFRESH_TOKEN
```

Always capture a value before piping it into `gh secret set`: a failed `op`
command otherwise stores an empty secret without any error.

Firefox account credentials are shared with the other extensions and live in
the 1Password item `firefox-amo-api`. Copy the existing values into the two
Firefox secrets for this repository; do not regenerate the AMO key, which would
invalidate it for every consumer. `1password.env.example` contains the references.

## Local store commands

The deploy workflows are the normal path. For a local fallback, install Go and
`go-webext` (`go install github.com/adguardteam/go-webext@v0.4.2`), copy
`1password.env.example` to `.env.1password` (gitignored) with the vault name
filled in, and resolve the credentials for one command with `op run`:

| Command | Result |
| --- | --- |
| `op run --env-file=.env.1password -- make chrome_status` | Print the published and submitted state of the store item. |
| `op run --env-file=.env.1password -- make chrome_update` | Build the release archive and upload it as the store draft. |
| `op run --env-file=.env.1password -- make chrome_publish` | Submit the draft for review with deferred publishing. |

Without 1Password, a `.env` filled in from `.env.example` works the same way;
`go-webext` reads it itself. Never commit either file.

## Failure playbook

- **`invalid_client`:** `CHROME_CLIENT_ID` or `CHROME_CLIENT_SECRET` is wrong;
  the refresh token is fine. Google no longer shows an existing client secret:
  add a new secret to the same OAuth client in the Google Cloud Console,
  store it in `chrome-web-store-api`, push it to every repository, and re-run.
- **`invalid_grant`:** the refresh token is dead and nothing was uploaded.
  Mint a new one for the existing OAuth client in the
  [OAuth Playground](https://developers.google.com/oauthplayground) with
  "Use your own OAuth credentials" and the
  `https://www.googleapis.com/auth/chromewebstore` scope, store it in
  `chrome-web-store-api`, push it to every repository, and re-run. The OAuth
  consent screen must be **In production**; refresh tokens issued while it is
  in **Testing** expire after seven days.
- **`deleted_client`:** the OAuth client itself is gone. Create a new Web
  application client in the Google Cloud project with
  `https://developers.google.com/oauthplayground` as an authorized redirect
  URI, then store the new client ID and secret and mint a new refresh token.
- **A 5xx from the token endpoint:** transient on Google's side; re-run.
- **Upload did not reach `SUCCEEDED`:** the store is still processing the
  draft. Wait, then re-run with the same tag; re-uploading the same version
  replaces the draft.
- **Submission failed after a successful upload:** the draft is still in
  place. Re-run with the same tag; the re-upload replaces it and the
  submission is repeated.
- **Upload rejected because the version is already published:** ship a new
  version.
- **Upload rejected because a submission is pending review:** the store
  refuses every package upload in that state regardless of version. Wait for
  the verdict or cancel the review in the Developer Dashboard, then re-run.
- **Upload rejected because an approved submission is staged:** publish the
  staged version in the Developer Dashboard, or let the 30-day expiry return
  it to a draft, then re-run.
- **Review rejected:** no workflow signal exists; the verdict arrives by
  e-mail. Address the feedback and ship a new version.

Firefox Add-ons:

- **Missing Firefox asset:** releases through 1.2.7 are Chrome-only. Select a
  release with both Firefox and matching source ZIPs; never rebuild during deploy.
- **`HTTP 401 (signature)`:** use the full JWT secret from `firefox-amo-api`,
  not the masked value shown on AMO.
- **Version already exists on AMO:** use `status`; do not upload it again.
- **Existing version has no source attached:** attach the matching release's
  source ZIP in Developer Hub before continuing.
- **Status unavailable after a confirmed upload:** the submission stands;
  run `status` later. Status-only mode fails when the API cannot be read.
