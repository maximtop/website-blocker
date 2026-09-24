# Development

## Developer commands

| Make | pnpm | Meaning |
| --- | --- | --- |
| `make install` | `pnpm install` | Install dependencies; `make setup` and `make init` are aliases. |
| `make build [browser]` | `pnpm build [browser]` | Build once in development mode; Chrome by default. |
| `make dev [browser]` | `pnpm dev [browser]` | Alias for the one-shot development build. |
| `make start [browser]` | `pnpm start [browser]` | Watch development files; Chrome by default. |
| `make release [browser]` | `pnpm release [browser]` | Build local production archives; all store targets by default. |
| `make package [browser]` | `pnpm package [browser]` | Alias for local release packaging. |
| `make check` | `pnpm check` | Static checks and automated tests, without store submission. |

`make` defaults to `make build`. Pass at most one supported browser as an
extra goal, for example `make build firefox`. Unknown targets fail before
building. `lint`, `typecheck`, and `test` also have matching Make targets;
`make validate` is a compatibility alias for `make check`.
Store upload/publish commands and CI deployment workflows are separate:
`release` and `package` never submit to a store or create a GitHub release.

Webpack supports Chrome, Edge, and Firefox and writes
`dist/dev/<browser>` or `dist/release/<browser>`, with matching ZIPs.
The package manager and Webpack pipeline are unchanged.


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
`make release firefox`. TypeScript checks use ES modules and strict mode; the
`ts-node` override keeps the Webpack build runner in CommonJS. Deployment
helpers execute with `tsx`.

Lint and compiler rules live in `eslint.config.mjs` and `tsconfig.base.json`.
Ignores, globals and extra rules that only this repository needs go to
`eslint.local.mjs`; it cannot override a rule set in `eslint.config.mjs`.
`tsconfig.json` adds only types, JSX and the `ts-node` override; strictness,
target and module options stay in `tsconfig.base.json`.

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

The store workflows, the deploy helpers in `scripts/deploy` and their tests in
`tests/deploy` form the deployment flow. Repository-specific values belong in
`scripts/deploy/constants.ts`, the Release workflow's top-level environment,
or GitHub variables and secrets.

See [the release guide](docs/RELEASE.md) for store onboarding, deployment modes
and credentials. [Firefox reviewer notes](docs/AMO_REVIEW.md) travel inside
the source archive and must match the build and runtime behavior.
