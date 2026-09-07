# Firefox reviewer instructions

Website Blocker: MT blocks the hostnames the user adds in its options page,
opened through the toolbar popup. No account, payment, or external service is required.

## Reproduce the package

Use the source ZIP from the same GitHub Release as the Firefox ZIP. Extract it
into an empty directory and run the following commands from its root:

```sh
node --version
npm install --global pnpm@11.18.0
pnpm install --frozen-lockfile
pnpm release
```

Use Node.js 24.x (the project requires `>=24 <25`). The pnpm version is pinned
in `package.json`; dependencies are locked in `pnpm-lock.yaml`. Dependencies
come from the npm registry. No credentials or environment-specific files are
needed. `pnpm release` sets `BUILD_ENV=release` and builds both browser targets.
The Firefox output is `dist/release/firefox/` and `dist/release/firefox.zip`.
Compare the extracted file contents; ZIP timestamps may differ.

The build uses TypeScript, React, SWC, and webpack. Dependencies are bundled;
no remote scripts or executable code are loaded. Release JavaScript is not
minified, but it is generated, so the original source is attached.

## Test the behavior

1. Install the Firefox package in Firefox 140 or newer on desktop.
2. Open the toolbar popup, click "settings", and add `example.com` to the block list.
3. Open `https://example.com/` in a new tab. It should redirect to the packaged
   page saying "Oops! This website is blocked".
4. Open an unrelated website. It should remain accessible. Subframe navigation
   should not redirect its containing tab.
5. Open the extension's options page, remove `example.com`, and navigate to it
   again. The site should now load normally.
6. With a persistent/signed installation, add it again and restart the browser.
   The saved block list should still apply. A temporary `about:debugging`
   installation is removed when Firefox closes and cannot test this step.

Blocking uses hostname matching with an optional `www.` prefix removed. Other
subdomains require their own entries. Navigation is redirected after it commits;
this is a focus tool, not a network firewall or parental-control security boundary.

## Permissions and data handling

- `webNavigation`: observe top-level HTTP/HTTPS navigation and compare its
  hostname with the block list inside the browser.
- Tab updates redirect a blocked tab to the packaged `blocked.html` page.
  `tabs.update` does not require the `tabs` permission; sensitive tab fields
  are not read and that permission is not requested.
- `storage`: save the user-configured block list in `browser.storage.sync`.
  Firefox may synchronize this setting between the user's browsers when
  Firefox Sync is enabled. The developer does not receive the block list.
- `blocked.html` is web-accessible so a blocked navigation can display it.

There is no analytics, advertising, telemetry, browsing-history log, external
API call, or developer-operated backend. The Firefox manifest declares
`data_collection_permissions.required: ["none"]`. Browser-managed Sync is
disclosed here and in the listing; no browsing history is sent by the extension.

Gecko ID: `website-blocker@maximtop.dev`. Firefox uses an event-page background
script; Chrome uses a service worker. Both use `frameId === 0` for top-level
navigation, with Chrome's prerender exclusion retained.

License: MIT. Source and support:
https://github.com/maximtop/website-blocker
