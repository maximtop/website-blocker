# Firefox Add-ons reviewer notes

Website Blocker lets users maintain a list of distracting website domains.
When a top-level page navigation matches that list, the extension redirects
the tab to its bundled blocked page. Users can add and remove domains through
the popup and options page.

No extension account, payment, advertising, analytics, telemetry, remote code
or developer-operated service is used. Navigation URLs are evaluated in the
background and are not recorded as browsing history or sent to the developer.
The user-configured blocklist is stored with `browser.storage.sync`; Firefox
may synchronize it through the user's Mozilla account when browser sync is
enabled. It is therefore not guaranteed to remain on one device. The
developer does not receive that synchronized data. No reviewer credentials
are required.

## Reproduce this release

The attached source ZIP is the committed repository state from the same
GitHub Release as the Firefox ZIP. It includes all sources, build settings,
the dependency lockfile and the pnpm build-script allowlist. Use Ubuntu 24.04
or macOS with Node.js 24.x and pnpm 11.18.0:

```sh
npm install --global pnpm@11.18.0
pnpm install --frozen-lockfile
pnpm release firefox
```

Compare the extracted contents of `dist/release/firefox.zip` with the
submitted package; ZIP timestamps may differ. Webpack bundles TypeScript
using SWC. Production output is not minified, and no Git checkout or store
credentials are needed to build. General commands are in
[DEVELOPMENT.md](../DEVELOPMENT.md).

## Permissions and test steps

`storage` persists the user-configured blocklist through the browser storage
API. `webNavigation` observes completed navigation commits so the background
can evaluate the destination domain. The existing `tabs` permission is
retained across browser variants; matching tabs are redirected with
`tabs.update`. No content scripts or host permissions are requested.

1. Load the extension in Firefox Desktop 128 or later and open its options
   page. Add `example.com` to the blocklist.
2. Navigate a top-level tab to `https://example.com`. The bundled blocked
   page should replace the destination.
3. Navigate to another domain. It should remain available.
4. Remove `example.com` from the list and open it again. It should load.
5. Add it again and restart Firefox. The configured list should persist.
6. If testing private windows, first allow the extension in private windows
   through Firefox's add-on settings. Without that permission it does not
   operate in private windows.

The blocker reacts to navigation commits. Adding an already-open site's
domain does not redirect that tab until it navigates or reloads.

Source: https://github.com/maximtop/website-blocker (MIT).
Support: me@maximtop.dev
