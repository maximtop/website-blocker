# Website Blocker by MT

Website Blocker by MT is a simple browser extension designed to help you stay focused by blocking distracting websites. This extension allows you to specify a list of websites to block, ensuring that you can maintain productivity and avoid distractions.

## Features

- **Block Websites:** Easily block access to distracting websites.
- **Customizable:** Add or remove websites from the blocked list.
- **Persistent Storage:** Blocked websites are saved and loaded from browser storage.
- **Real-time Updates:** Automatically updates the list of blocked websites when changes are made.

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/maximtop/website-blocker.git
    ```
2. Navigate to the project directory:
    ```sh
    cd website-blocker
    ```
3. Install dependencies:
    ```sh
    pnpm install
    ```
4. Build the project:
    ```sh
    pnpm build
    ```
5. Load the extension in your browser:
    - Open your browser's extensions page.
    - Enable "Developer mode".
    - Click "Load unpacked" and select the `dist` directory.

## Usage

- Open the extension's options page to add or remove websites from the blocked list.
- The extension will automatically block access to the specified websites.

## Download

You can install the Website Blocker by MT extension directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/website-blocker-by-mt/enffllmgjpgoifnfeljkfhpedcadnpbj).

## Development

To start the development server with watch mode:
```sh
pnpm start
```

To lint the code:
```sh
pnpm lint
```

## Releasing

1. Bump `version` in `package.json` (semantic `X.Y.Z`) and merge it to `master`.
2. Tag the merged commit and push the tag:
    ```sh
    git tag vX.Y.Z && git push origin vX.Y.Z
    ```
3. `.github/workflows/release.yml` rejects a tag that does not match `package.json`, is not reachable from `master`, or already has a release, then lints, builds the Chrome archive, verifies the manifest version, and publishes a GitHub Release with:
    - `website-blocker-<version>-chrome.zip`, the store-ready archive
    - `website-blocker-<version>-source.zip`, the tagged repository state
    - `SHA256SUMS.txt`, GNU `sha256sum` lines with the bare asset names

Running `release.yml` by hand from the Actions tab is a dry run: it builds and verifies everything and uploads workflow artifacts, but publishes nothing.

### Chrome Web Store Deployment

`.github/workflows/deploy-chrome-store.yml` submits the Chrome archive of an already published GitHub Release to the Chrome Web Store. It runs automatically after a tagged release when the `CHROME_AUTO_DEPLOY_ENABLED` repository variable is `true`, and manually with a published release tag as the retry path:

```sh
gh workflow run deploy-chrome-store.yml -f tag=vX.Y.Z
```

The workflow downloads the release asset ending in `-chrome.zip` together with `SHA256SUMS.txt`, never a fresh rebuild, verifies the checksum and the manifest version inside, uploads the archive through Chrome Web Store API v2 with [go-webext](https://github.com/AdguardTeam/go-webext), and submits the draft for review with deferred (staged) publishing. Nothing goes live automatically: when the review verdict arrives, publish the approved version by hand in the Chrome Web Store Developer Dashboard. A staged submission left unpublished expires back to a draft after about 30 days; re-run the workflow with the same tag to submit it again.

### Store Configuration

Configure these in the GitHub repository under **Settings → Secrets and variables → Actions**. Workflows reference them by name only; no value is ever committed.

| Kind | Name | Description |
| --- | --- | --- |
| Variable | `CHROME_APP_ID` | Item ID from the Developer Dashboard item URL. |
| Variable | `CHROME_AUTO_DEPLOY_ENABLED` | `true` to deploy after every tagged release; unset keeps manual runs only. |
| Secret | `CHROME_CLIENT_ID` | OAuth 2.0 client ID from a Google Cloud project with the Chrome Web Store API enabled. |
| Secret | `CHROME_CLIENT_SECRET` | Secret of that OAuth client. |
| Secret | `CHROME_REFRESH_TOKEN` | Refresh token granted for the `https://www.googleapis.com/auth/chromewebstore` scope. |
| Secret | `CHROME_PUBLISHER_ID` | Publisher ID from the Developer Dashboard account page. |

The four secrets belong to the Google account and are shared by every extension it publishes; only `CHROME_APP_ID` is specific to this extension. Set them from the command line without leaving values in shell history:

```sh
gh variable set CHROME_APP_ID --body "<item-id>"
gh secret set CHROME_CLIENT_ID
```

### Local Store Commands

With Go and `go-webext` installed (`go install github.com/adguardteam/go-webext@v0.4.2`), the Makefile offers a local fallback for the deploy workflow. Credentials come either from a `.env` filled in from `.env.example`, or from 1Password: copy `1password.env.example` to `.env.1password`, set the vault name, and prefix each command with `op run --env-file=.env.1password --`. The shared item is `chrome-web-store-api`; only `CHROME_APP_ID` is specific to this extension.

| Command | Result |
| --- | --- |
| `make chrome_status` | Print the published and submitted state of the store item. |
| `make chrome_update` | Build the release archive and upload it as the store draft. |
| `make chrome_publish` | Submit the draft for review with deferred publishing. |

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## GitHub Repository
For more information, visit our GitHub repository: [https://github.com/maximtop/website-blocker](https://github.com/maximtop/website-blocker)
