# Firefox Add-ons reviewer notes

Website Blocker lets users maintain a list of distracting website domains.
When a top-level page navigation matches an enabled entry, the extension
redirects the tab to its bundled blocked page. Users can add and remove
domains through the popup and options page, edit domains in the options
page, and switch blocking off for an individual domain without deleting it.
Editing a domain preserves its blocking switch state.

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

## Automated validation notes

`web-ext` 10.6.0 reports no errors for this build. Its code warnings refer to
bundled React DOM's HTML helper, Webpack's legacy global-object fallback and
MobX's development breakpoint helper. The application uses JSX text for
user-entered domains and errors and has no `dangerouslySetInnerHTML`, `eval`
or `Function` calls. Supported Firefox versions use Webpack's `globalThis`
branch, and MobX's development-only callers are absent from production.

The validator also warns that Firefox 128 predates the built-in data consent
manifest key (desktop 140 / Android 142). The manifest declares no developer
data collection; browser-managed blocklist synchronization is described above.

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
4. Turn off the switch for `example.com` and open it again. It should load
   while its entry stays in the list. Turn it back on and reload: blocking
   should resume.
5. In the options page, click **Edit** for `example.com`. The current domain
   should be selected in the input. Change it to `example.org` and click
   **Save**. The list should show the new domain; `example.com` should now
   load and `example.org` should be blocked. Reopen the options page to
   confirm the edit persisted. Edit `example.org` again and press Enter
   without changing it; the form should close.
6. Edit the entry again and change the draft. Click **Cancel** and confirm
   the original domain remains. Repeat with Escape while focus is on the
   input, **Save**, and **Cancel**; each should discard the draft.
7. Add `example.com` as a second entry. Edit `example.org` and try to save an
   empty value, `not a domain`, and then `example.com`. Each should show an
   inline error, retain the draft for correction, and leave the saved list
   unchanged. Cancel the edit.
8. Turn off blocking for `example.org`, edit it to `example.net`, and save.
   The renamed entry should remain switched off, and `example.net` should
   load. Reload the options page and confirm the saved domain and disabled
   switch state remain. Turn it on and confirm `example.net` is blocked.
9. Remove `example.com` from the list and open it again. It should load.
10. Add it again and restart Firefox. The configured list and each switch
    should persist.
11. If testing private windows, first allow the extension in private windows
    through Firefox's add-on settings. Without that permission it does not
    operate in private windows.

The blocker reacts to navigation commits. Adding an already-open site's
domain does not redirect that tab until it navigates or reloads.

Source: https://github.com/maximtop/website-blocker (MIT).
Support: me@maximtop.dev
