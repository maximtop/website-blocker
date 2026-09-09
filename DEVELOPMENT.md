# Development

Website Blocker is a Manifest V3 extension for Chrome, Edge and Firefox.
TypeScript and React are bundled with Webpack and SWC. The source manifest
is shared; `scripts/build/manifest.ts` stamps the package version and adapts
the browser-specific background configuration.

## Toolchain

Use Node.js 24.x and pnpm 11.18.0, as declared in `package.json`:

```sh
npm install --global pnpm@11.18.0
pnpm install --frozen-lockfile
```

`pnpm-workspace.yaml` records the allowed dependency build scripts. Keep it
and `pnpm-lock.yaml` in source archives so reviewers use the same inputs.

## Commands

| Command | Result |
| --- | --- |
| `pnpm build` | Build all three browsers in `dist/dev/`. |
| `pnpm build firefox` | Build one browser; `chrome` and `edge` also work. |
| `pnpm start chrome` | Watch one browser. Omit the browser to watch all three. |
| `pnpm release` | Build all three release archives in `dist/release/`. |
| `pnpm release firefox` | Build only `dist/release/firefox.zip`. |
| `pnpm check` | ESLint, TypeScript and Vitest. |

The Makefile forwards browser arguments in the same way, for example
`make release firefox`. TypeScript checks use ES modules and strict null
checking; the `ts-node` override keeps the Webpack build runner in CommonJS.
Deployment helpers execute with `tsx`, matching the other extensions.

## Browser behavior

- Chrome and Edge use `background.service_worker`.
- Firefox Desktop 140 or later uses `background.scripts` and Gecko ID
  `website-blocker@maximtop.dev`. Firefox uses its default spanning private
  window mode; users must allow private-window access separately.
- The navigation handler uses `frameId === 0` to identify top-level pages
  across browsers. Chromium prerender events are still ignored.
- The blocklist uses `browser.storage.sync`. Browser account and sync
  settings determine whether it synchronizes between devices. The extension
  has no developer-operated backend, telemetry or remote code.
- Website mutations write independent `website:<hostname>` records over the
  legacy map, so edits to different sites cannot overwrite each other.
  Changes to the same site share a Web Lock within a browsing session;
  renames acquire both host locks in sorted order. Private sessions and
  other synchronized devices have separate lock managers, so same-site
  conflicts between them remain last-writer-wins.
- Options pages apply confirmed writes immediately and observe storage
  changes. Older load responses and failures cannot overwrite newer state.

Load `dist/dev/chrome` or `dist/dev/edge` as an unpacked extension. In Firefox,
use `about:debugging#/runtime/this-firefox` and load
`dist/dev/firefox/manifest.json` as a temporary add-on. The first Firefox
listing must preserve the configured Gecko ID on all later updates.

## Release and deployment contract

`pnpm release` builds one `<browser>.zip` for each target. The Release workflow
publishes `website-blocker-<version>-<browser>.zip`, a source ZIP of the tagged
commit, and `SHA256SUMS.txt`. Store workflows consume those published bytes.

The Edge and Firefox workflows, deploy helpers and their tests follow the
shared deployment contract used by the other extension repositories.
Repository-specific values belong in `scripts/deploy/constants.ts`, the
Release workflow's top-level environment, or GitHub variables and secrets.
Preserve this boundary when moving the shared code into reusable actions.

See [the release guide](docs/RELEASE.md) for store onboarding, deployment modes
and credentials. [Firefox reviewer notes](docs/AMO_REVIEW.md) travel inside
the source archive and must match the build and runtime behavior.
