# Firefox reviewer instructions

Website Blocker: MT blocks the hostnames the user adds in its options page,
opened through the toolbar popup. Users can add, edit, remove and enable or
disable individual entries. Blocking can last indefinitely, for 15, 30 or 60
minutes, or for a custom positive whole number of minutes. No account,
payment, or external service is required.

## Reproduce the package

Use the source ZIP from the same GitHub Release as the Firefox ZIP. It includes
all sources, build settings, the dependency lockfile and the pnpm build-script
allowlist. Extract it into an empty directory and run the following commands
from its root on Ubuntu 24.04 or macOS:

```sh
node --version
npm install --global pnpm@11.18.0
pnpm install --frozen-lockfile
pnpm release firefox
```

Use Node.js 24.x (the project requires `>=24 <25`). The pnpm version is pinned
in `package.json`; dependencies are locked in `pnpm-lock.yaml`. Dependencies
come from the npm registry. No credentials or environment-specific files are
needed, and the extracted source builds without a Git checkout.
`pnpm release firefox` sets `BUILD_ENV=release` and builds the Firefox target.
The output is `dist/release/firefox/` and `dist/release/firefox.zip`.
Compare the extracted file contents; ZIP timestamps may differ. `pnpm release`
without a browser builds Chrome, Edge and Firefox. General commands are in
[DEVELOPMENT.md](../DEVELOPMENT.md).

The build uses TypeScript, React, SWC, and webpack. Dependencies are bundled;
no remote scripts or executable code are loaded. Release JavaScript is not
minified, but it is generated, so the original source is attached.

The source includes all 40 locale catalogs in `src/_locales/`; the Firefox
package includes all 40. English is the default, and Arabic, Persian and Hebrew
use right-to-left layouts. The popup, blocked page and existing website controls
follow the browser's language. The newer duration controls, duration errors and
loading message currently remain in English. The complete locale list and
package checks are documented in [README.md](../README.md#translations).

## Test the behavior

The button names below use the English interface; localized labels have the
same behavior. These are reviewer test instructions, not a record of a completed
manual Firefox test.

1. Install the Firefox package in Firefox 140 or newer on desktop.
2. Open the toolbar popup, click **Open settings**, leave **Block for** set to
   **Indefinitely**, and add `example.com` to the block list.
3. Open `https://example.com/` in a new tab. It should redirect to the packaged
   page saying "Oops! This website is blocked".
4. Open an unrelated website. It should remain accessible. Subframe navigation
   should not redirect its containing tab.
5. Switch `example.com` off and reload the site. It should load normally while
   its entry remains saved. Switch it back on and reload to confirm blocking.
6. Click **Edit** for `example.com`. Its address should be selected. Change it
   to `example.org` and click **Save**. The old site should load and the new one
   should be blocked. Reopen settings to confirm the edit persisted. Editing
   without changing the address and pressing Enter should close the form.
7. Edit the entry and change the draft, then click **Cancel**. The saved address
   must remain unchanged. Repeat with Escape while focus is on the input,
   **Save**, and **Cancel**. Each should discard the draft.
8. Add `example.com` as a second entry. Try editing `example.org` to an empty
   value, `not a domain`, and `example.com`. Each should show an inline error
   and preserve the saved entries. Cancel the edit. Switch `example.org` off,
   rename it to `example.net`, and confirm its switch remains off after reopening
   settings. Switch it on and confirm `example.net` is blocked.
9. Delete these test entries. Add `example.com` with **Custom duration** set
   to **1** minute. Confirm the displayed deadline and blocking before it.
   After the deadline, the entry should disappear from the visible list and
   a new navigation or reload of `example.com` should load normally.
10. Repeat with a two-minute entry. Switch it off and back on, then rename it.
    Its original deadline must remain unchanged. A disabled timed entry should
    still expire at that deadline. The duration selector affects newly added
    sites; it does not change an existing entry's deadline.
11. Select **Custom duration** and try zero, a negative value and a fractional
    minute. The form must reject them without adding an entry. Check that the
    15-, 30- and 60-minute presets show the corresponding deadlines.
12. With a persistent/signed installation, add an indefinite entry and a timed
    entry, note their switches and deadline, then restart Firefox. The entries
    and switches should persist; the timed entry keeps its original deadline
    and is absent if it expired while Firefox was closed. A temporary
    `about:debugging` installation is removed when Firefox closes and cannot
    test this step.
13. Remove an indefinite entry and confirm the site loads again.
14. Check the popup, options page and blocked page in a non-English browser
    language, including a right-to-left language. Translated controls should
    use the selected catalog without raw message keys. Duration controls,
    duration errors and the loading message are currently English.
15. If testing private windows, first allow the extension in private windows
    through Firefox's add-on settings. Without that permission it does not
    operate in private windows.

Adding an already-open site's hostname does not redirect that tab until it
navigates or reloads. Expiration stops future redirects; it does not automatically
restore a tab already showing the blocked page. Deadlines use the browser's
wall clock, continue while the browser is closed and are not paused by turning
a site's blocking switch off. Renaming preserves the deadline, switch and list
position. Expired entries are excluded from the visible list; expiration does
not immediately erase their underlying sync-storage records.

Blocking uses hostname matching with an optional `www.` prefix removed. Other
subdomains require their own entries. Navigation is redirected after it commits;
this is a focus tool, not a network firewall or parental-control security boundary.

## Permissions and data handling

- `webNavigation`: observe top-level HTTP/HTTPS navigation and compare its
  hostname with the block list inside the browser.
- Tab updates redirect a blocked tab to the packaged `blocked.html` page.
  `tabs.update` does not require the `tabs` permission; sensitive tab fields
  are not read and that permission is not requested. No content scripts or
  host permissions are requested.
- `storage`: save hostnames, enabled/disabled settings, optional expiration
  timestamps and list-order metadata in `browser.storage.sync`. Firefox may
  synchronize these settings between the user's browsers when Firefox Sync is
  enabled. The developer does not receive the block list or its preferences.
- `blocked.html` is web-accessible so a blocked navigation can display it.

There is no analytics, advertising, telemetry, browsing-history log, external
API call, or developer-operated backend. The Firefox manifest declares
`data_collection_permissions.required: ["none"]`. Browser-managed Sync is
disclosed here and in the listing; no browsing history is sent by the extension.

Gecko ID: `website-blocker@maximtop.dev`. Firefox uses an event-page background
script; Chrome and Edge use service workers. All three use `frameId === 0`
for top-level navigation, with Chromium's prerender exclusion retained.

License: MIT. Source: https://github.com/maximtop/website-blocker
Support: https://github.com/maximtop/website-blocker/issues or me@maximtop.dev

## Automated validator warnings

The stock React DOM 18.3.1 renderer contains `innerHTML` assignments. The
application code does not use `innerHTML`, `dangerouslySetInnerHTML`, `eval`
or `Function`; user-entered hostnames and errors are rendered as React text.
The renderer is unmodified npm code.

The generated options bundle also includes webpack's global-object detection
fallback using `Function` (the earlier `globalThis` branch is taken in supported
Firefox) and MobX 6.13.7's debugger trace helper. The production bundle has no
callers of that helper and the extension does not use MobX tracing. No CSP
exception for dynamic evaluation is added.

AMO also warns that the data consent declaration needs Firefox for Android 142,
while the desktop minimum is 140. This submission selects desktop Firefox only;
Firefox for Android is not selected.
