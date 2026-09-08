# Website Blocker by MT

Website Blocker by MT is a simple browser extension designed to help you stay focused by blocking distracting websites. This extension allows you to specify a list of websites to block, ensuring that you can maintain productivity and avoid distractions.

## Features

- **Timed Blocking:** Choose 15, 30 or 60 minutes, custom whole minutes, or indefinite blocking. Deadlines survive browser restarts.
- **Block Websites:** Easily block access to distracting websites.
- **Customizable:** Add, edit, or remove websites from the blocked list.
- **Per-site Control:** Turn blocking off or on for individual websites without removing them from the list.
- **Persistent Storage:** Blocked websites are saved and loaded from browser storage.
- **Real-time Updates:** Automatically updates the list of blocked websites when changes are made.
- **40 languages:** The interface follows the browser's selected language, with English fallback and RTL support.

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
    - Chrome: click "Load unpacked" and select `dist/dev/chrome`.
    - Edge: click "Load unpacked" and select `dist/dev/edge`.
    - Firefox: open `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on",
      and select `dist/dev/firefox/manifest.json`.

## Usage

- Choose the blocking duration when adding a site. Timed entries disappear after their deadline.
- Disabling blocking does not pause its timer; renaming a website preserves its deadline and blocking state.

- Open the extension's options page to add, edit, or remove websites from the blocked list.
- Click **Edit** next to a website to change its address, then **Save** (or press Enter). Click **Cancel** (or press Escape) to discard the change. Invalid addresses and duplicates leave the original entry unchanged.
- Editing an address preserves its blocking switch setting.
- Use the switch next to a website to turn blocking off or on. Disabled websites stay in the list for later.
- The extension will automatically block access to websites whose switches are on. Your choices are saved across restarts.

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

ESLint checks both TypeScript and TSX files. Source classes, methods, functions,
named arrow functions, exported variables, interfaces, type aliases, and their
type properties and methods require descriptive multiline JSDoc. Describe
parameters and returned values; keep types in TypeScript. Anonymous callbacks
passed to hooks, event handlers, and array methods do not need separate blocks.

Run `pnpm check` for lint, type checking, and tests, then `pnpm release` to verify
the production build before submitting a change.

Build an individual browser with `pnpm build chrome`, `pnpm build edge`, or
`pnpm build firefox`. Run `pnpm check` for lint, TypeScript and tests. See
[DEVELOPMENT.md](DEVELOPMENT.md) for browser differences and build instructions.

## Releasing

Tagged releases publish Chrome, Edge and Firefox archives, matching source,
and SHA-256 checksums in one GitHub Release. Each store has a separate manual
deployment workflow. See [docs/RELEASE.md](docs/RELEASE.md) for first-time store
setup, deployment modes and the failure playbook.

## Translations

The 40 language catalogs use the same locale set as HN Split and No More Ago.
All UI text, validation errors, page titles, accessible labels, and manifest metadata
live in `src/_locales/<locale>/messages.json`. English is the default catalog.

Supported locales: `ar bg bn ca cs da de el en es es_419 fa fi fil fr he hi hr hu id
it ja ko ms nb nl pl pt_BR pt_PT ro ru sk sr sv th tr uk vi zh_CN zh_TW`.

The browser selects the catalog through the standard
[WebExtension i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n).
Each catalog's `catalogLocale` sets the document language and direction; Arabic,
Persian, and Hebrew use RTL. Preserve named placeholders such as `$WEBSITE$` when
editing a message. Only untranslated site values are substituted into whole sentences.

`pnpm check` validates complete catalogs, placeholders, metadata, and store limits.
`pnpm release` copies all catalogs into the extension; `pnpm locales:verify-package`
then checks the Chrome, Edge, and Firefox ZIPs against the sources. Chromium also receives a byte-identical
`no` alias for Norwegian `nb`: 40 languages, 41 packaged locale directories in Chrome/Edge
and 40 in Firefox.

Full store descriptions are maintained in
[docs/store/STORE_DESCRIPTIONS.md](docs/store/STORE_DESCRIPTIONS.md).
Run `pnpm store:descriptions` to export all 40 as plain text under
`build/store-descriptions/`. Names and short descriptions come from each catalog.
Preparing these files does not update a published store listing.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## GitHub Repository
For more information, visit our GitHub repository: [https://github.com/maximtop/website-blocker](https://github.com/maximtop/website-blocker)
